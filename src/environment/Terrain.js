// Terreno realista: malla de gran extensión con resolución variable, texturas
// de altura y superficie para la GPU, y material PBR con mezcla procedural de
// césped / tierra / arena / roca / nieve según pendiente, altura y uso del suelo.
//
// El cálculo pesado (cientos de miles de evaluaciones de heightAt) se reparte
// entre Web Workers; si no hay workers disponibles se hace en el hilo principal.

import {
  BufferAttribute, BufferGeometry, ClampToEdgeWrapping, DataTexture, DataUtils, HalfFloatType,
  LinearFilter, Mesh, MeshStandardMaterial, RGBAFormat, RedFormat, UnsignedByteType, Vector2,
} from 'three';
import { MAP_HALF, TERRAIN_EXTENT } from './terrainMath.js';
import { bakeGridRows, bakeMapRows, warp } from './terrainBake.js';
import { getNoiseNormalTexture, getNoiseTexture } from './proceduralTextures.js';

export { heightAt, normalAt, slopeAt, isWaterAt, waterLevelAt, surfaceAt, grassDensityAt } from './terrainMath.js';

// ---- pool de workers -------------------------------------------------------

class BakePool {
  constructor(count) {
    this.workers = [];
    this.pending = new Map();
    this.nextId = 1;
    if (typeof Worker === 'undefined') return;
    for (let i = 0; i < count; i++) {
      try {
        const w = new Worker(new URL('./terrainWorker.js', import.meta.url), { type: 'module' });
        w.onmessage = (e) => {
          const cb = this.pending.get(e.data.id);
          if (cb) {
            this.pending.delete(e.data.id);
            cb.resolve(e.data);
          }
        };
        w.onerror = (err) => {
          // Cualquier fallo del worker: rechazamos todo y el llamador hace
          // fallback al hilo principal.
          for (const cb of this.pending.values()) cb.reject(err);
          this.pending.clear();
          this.broken = true;
        };
        this.workers.push(w);
      } catch {
        break;
      }
    }
  }

  get available() {
    return this.workers.length > 0 && !this.broken;
  }

  run(worker, message) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, ...message });
    });
  }

  /** Reparte `rows` filas entre los workers y concatena los resultados. */
  async mapRows(rows, message) {
    const n = this.workers.length;
    const chunk = Math.ceil(rows / n);
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const rowStart = i * chunk;
      const rowEnd = Math.min(rows, rowStart + chunk);
      if (rowStart >= rowEnd) break;
      jobs.push(this.run(this.workers[i], { ...message, rowStart, rowEnd }));
    }
    return Promise.all(jobs);
  }

  dispose() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
  }
}

// ---- geometría -------------------------------------------------------------

function buildGeometry(segments, extent, heights) {
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const UV_SCALE = 1 / 6; // el mapa de normales se repite cada 6 m
  let p = 0;
  let t = 0;
  for (let j = 0; j < n; j++) {
    const z = extent * warp((j / segments) * 2 - 1);
    for (let i = 0; i < n; i++) {
      const x = extent * warp((i / segments) * 2 - 1);
      positions[p++] = x;
      positions[p++] = heights[j * n + i];
      positions[p++] = z;
      uvs[t++] = x * UV_SCALE;
      uvs[t++] = z * UV_SCALE;
    }
  }
  const indices = new Uint32Array(segments * segments * 6);
  let k = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices[k++] = a; indices[k++] = c; indices[k++] = b;
      indices[k++] = b; indices[k++] = c; indices[k++] = d;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// ---- material --------------------------------------------------------------

const TERRAIN_FRAGMENT_HEADER = /* glsl */ `
uniform sampler2D uNoise;
uniform sampler2D uSurface;
uniform float uMapHalf;
uniform float uSnowLine;
varying vec3 vTerrainPos;
varying float vTerrainNy;
float tRough;
`;

const TERRAIN_ALBEDO = /* glsl */ `
{
  vec2 wp = vTerrainPos.xz;
  vec4 s = texture2D( uSurface, wp / ( 2.0 * uMapHalf ) + 0.5 );
  vec4 n1 = texture2D( uNoise, wp * 0.015 );
  vec4 n2 = texture2D( uNoise, wp * 0.11 );
  vec4 n3 = texture2D( uNoise, wp * 0.6 );

  // césped: variación macro (parches secos/húmedos) + detalle fino
  vec3 grassA = vec3( 0.14, 0.30, 0.08 );
  vec3 grassB = vec3( 0.36, 0.46, 0.15 );
  float macro = clamp( n1.r * 0.9 + n2.g * 0.45 - 0.2, 0.0, 1.0 );
  vec3 grass = mix( grassA, grassB, macro ) * ( 0.82 + 0.36 * n3.b );

  vec3 dirtC = vec3( 0.34, 0.25, 0.16 ) * ( 0.8 + 0.4 * n2.r );
  vec3 sandC = vec3( 0.52, 0.46, 0.33 ) * ( 0.9 + 0.2 * n3.r );
  vec3 rockC = mix( vec3( 0.13, 0.12, 0.11 ), vec3( 0.29, 0.26, 0.23 ), n2.b ) * ( 0.78 + 0.44 * n3.g );
  vec3 snowC = vec3( 0.93, 0.95, 0.99 );

  float slope = 1.0 - clamp( vTerrainNy, 0.0, 1.0 );
  float rockW = smoothstep( 0.28, 0.52, slope + ( n2.r - 0.5 ) * 0.16 );
  float h = vTerrainPos.y;
  float snowW = smoothstep( uSnowLine - 12.0, uSnowLine + 10.0, h + ( n1.g - 0.5 ) * 18.0 ) * ( 1.0 - smoothstep( 0.5, 0.75, slope ) );

  vec3 col = grass;
  col = mix( col, dirtC, s.a * ( 0.55 + 0.45 * n2.g ) );
  col = mix( col, col * vec3( 1.12, 1.02, 0.66 ), smoothstep( 18.0, 70.0, h ) * ( 1.0 - s.g ) ); // pajonal de páramo
  col = mix( col, sandC, s.g );
  col = mix( col, rockC, rockW );
  col = mix( col, snowC, snowW );
  col *= mix( 1.0, 0.5, s.b ); // fondo mojado bajo el agua

  diffuseColor.rgb *= col;
  tRough = mix( 0.96, 0.78, rockW );
  tRough = mix( tRough, 0.55, snowW );
  tRough = mix( tRough, 0.35, s.b );
}
`;

function buildMaterial(surfaceTexture) {
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    normalMap: getNoiseNormalTexture(),
    normalScale: new Vector2(0.5, 0.5),
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNoise = { value: getNoiseTexture() };
    shader.uniforms.uSurface = { value: surfaceTexture };
    shader.uniforms.uMapHalf = { value: MAP_HALF };
    shader.uniforms.uSnowLine = { value: 118 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTerrainPos;\nvarying float vTerrainNy;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrainPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;\nvTerrainNy = normal.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TERRAIN_FRAGMENT_HEADER)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + TERRAIN_ALBEDO)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRough;');
  };
  material.customProgramCacheKey = () => 'narino-terrain';
  return material;
}

// ---- construcción ----------------------------------------------------------

/**
 * Construye el terreno de forma asíncrona.
 * @param {{segments?:number, mapSize?:number, workers?:number, onProgress?:(t:number)=>void}} opts
 * @returns {Promise<{mesh: Mesh, heightTexture: DataTexture, surfaceTexture: DataTexture, dispose: () => void}>}
 */
export async function buildTerrain({ segments = 640, mapSize = 1024, workers = 4, onProgress } = {}) {
  const pool = new BakePool(workers);
  const gridRows = segments + 1;

  let gridHeights;
  let mapHeights;
  let mapSurface;

  const assembleGrid = (parts) => {
    const out = new Float32Array(gridRows * gridRows);
    let offset = 0;
    for (const part of parts) {
      out.set(part.heights, offset);
      offset += part.heights.length;
    }
    return out;
  };
  const assembleMap = (parts) => {
    const heights = new Float32Array(mapSize * mapSize);
    const surface = new Uint8Array(mapSize * mapSize * 4);
    let offset = 0;
    for (const part of parts) {
      heights.set(part.heights, offset);
      surface.set(part.surface, offset * 4);
      offset += part.heights.length;
    }
    return { heights, surface };
  };

  try {
    if (!pool.available) throw new Error('sin workers');
    const [gridParts, mapParts] = await Promise.all([
      pool.mapRows(gridRows, { kind: 'grid', segments, extent: TERRAIN_EXTENT }),
      pool.mapRows(mapSize, { kind: 'map', size: mapSize, half: MAP_HALF }),
    ]);
    gridHeights = assembleGrid(gridParts);
    ({ heights: mapHeights, surface: mapSurface } = assembleMap(mapParts));
  } catch (err) {
    console.warn('[Terrain] horneando en el hilo principal:', err?.message || err);
    gridHeights = bakeGridRows(segments, TERRAIN_EXTENT, 0, gridRows);
    ({ heights: mapHeights, surface: mapSurface } = bakeMapRows(mapSize, MAP_HALF, 0, mapSize));
  } finally {
    pool.dispose();
  }
  onProgress?.(0.8);

  const geometry = buildGeometry(segments, TERRAIN_EXTENT, gridHeights);

  // Textura de altura (R16F, filtrado lineal) para el césped y las hojas.
  const half = new Uint16Array(mapHeights.length);
  for (let i = 0; i < mapHeights.length; i++) half[i] = DataUtils.toHalfFloat(mapHeights[i]);
  const heightTexture = new DataTexture(half, mapSize, mapSize, RedFormat, HalfFloatType);
  heightTexture.magFilter = heightTexture.minFilter = LinearFilter;
  heightTexture.wrapS = heightTexture.wrapT = ClampToEdgeWrapping;
  heightTexture.generateMipmaps = false;
  heightTexture.needsUpdate = true;

  const surfaceTexture = new DataTexture(mapSurface, mapSize, mapSize, RGBAFormat, UnsignedByteType);
  surfaceTexture.magFilter = surfaceTexture.minFilter = LinearFilter;
  surfaceTexture.wrapS = surfaceTexture.wrapT = ClampToEdgeWrapping;
  surfaceTexture.generateMipmaps = false;
  surfaceTexture.needsUpdate = true;

  const mesh = new Mesh(geometry, buildMaterial(surfaceTexture));
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  onProgress?.(1);

  return {
    mesh,
    heightTexture,
    surfaceTexture,
    mapHeights,
    dispose() {
      geometry.dispose();
      mesh.material.dispose();
      heightTexture.dispose();
      surfaceTexture.dispose();
    },
  };
}
