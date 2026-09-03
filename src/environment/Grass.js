// Césped instanciado en GPU (inspirado en la técnica de "Ghost of Tsushima").
//
// Una sola malla instanciada contiene todas las briznas de una rejilla de tiles
// centrada en el jugador. Cada brizna conoce su tile (ranura relativa) y su
// desplazamiento dentro de él; el vertex shader calcula el origen del tile a
// partir de la posición del jugador, lee la altura del terreno del heightmap,
// descarta briznas sobre pavimento/agua/arena/roca usando el mapa de superficie
// y aplica viento multicapa, LOD por distancia y aplastamiento bajo los pies.
// El material deriva de MeshStandardMaterial, así que recibe sombras, niebla y
// la iluminación de la escena sin código adicional.

import {
  BufferAttribute, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  MeshStandardMaterial, Vector2, Vector3,
} from 'three';
import { getNoiseTexture } from './proceduralTextures.js';

const TILE_SIZE = 16;
const BLADE_SEGMENTS = 4;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Geometría base de una brizna: tira afilada de `BLADE_SEGMENTS` segmentos,
// altura 1 (se escala por instancia), anchura decreciente hacia la punta.
function buildBladeGeometry(tileRadius, bladesPerTile) {
  const geometry = new InstancedBufferGeometry();
  const levels = BLADE_SEGMENTS + 1;
  const positions = [];
  for (let i = 0; i < levels; i++) {
    const t = i / BLADE_SEGMENTS;
    if (i === BLADE_SEGMENTS) {
      positions.push(0, 1, 0);
    } else {
      const w = 0.045 * (1 - t * t * 0.85);
      positions.push(-w, t, 0, w, t, 0);
    }
  }
  const indices = [];
  for (let i = 0; i < BLADE_SEGMENTS; i++) {
    const a = i * 2;
    const b = a + 1;
    if (i === BLADE_SEGMENTS - 1) {
      indices.push(a, b, a + 2);
    } else {
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);

  // Instancias: ranura de tile (i,j) relativa al jugador + offset + semillas.
  const side = tileRadius * 2 + 1;
  const count = side * side * bladesPerTile;
  const tile = new Float32Array(count * 2);
  const offset = new Float32Array(count * 2);
  const seed = new Float32Array(count * 4);
  const rand = mulberry32(9137);
  let k = 0;
  for (let tz = -tileRadius; tz <= tileRadius; tz++) {
    for (let tx = -tileRadius; tx <= tileRadius; tx++) {
      for (let b = 0; b < bladesPerTile; b++) {
        tile[k * 2] = tx;
        tile[k * 2 + 1] = tz;
        offset[k * 2] = rand() * TILE_SIZE;
        offset[k * 2 + 1] = rand() * TILE_SIZE;
        seed[k * 4] = rand();
        seed[k * 4 + 1] = rand();
        seed[k * 4 + 2] = rand();
        seed[k * 4 + 3] = rand();
        k++;
      }
    }
  }
  geometry.setAttribute('aTile', new InstancedBufferAttribute(tile, 2));
  geometry.setAttribute('aOffset', new InstancedBufferAttribute(offset, 2));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
  geometry.instanceCount = count;
  return geometry;
}

const VERTEX_HEADER = /* glsl */ `
attribute vec2 aTile;
attribute vec2 aOffset;
attribute vec4 aSeed;
uniform sampler2D uHeightMap;
uniform sampler2D uSurfaceMap;
uniform sampler2D uNoiseMap;
uniform float uMapHalf;
uniform float uMapSize;
uniform float uTime;
uniform vec3 uPlayerPos;
uniform vec2 uWindDir;
uniform float uDensity;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uTileSize;
varying float vBladeT;
varying float vShade;
varying float vTramp;
vec3 gGrassPos;
vec3 gGrassNormal;

float hash21( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}
`;

// Se ejecuta en lugar de <beginnormal_vertex> (antes de <begin_vertex>).
const VERTEX_BODY = /* glsl */ `
vec2 tileIndex = floor( uPlayerPos.xz / uTileSize ) + aTile;
vec2 tileOrigin = tileIndex * uTileSize;
vec2 jitter = vec2( hash21( tileIndex + aSeed.xy * 7.0 ), hash21( tileIndex.yx - aSeed.zw * 5.0 ) ) - 0.5;
vec2 worldXZ = tileOrigin + aOffset + jitter * 1.4;

vec2 mapUV = worldXZ / ( 2.0 * uMapHalf ) + 0.5;
float ground = texture2D( uHeightMap, mapUV ).r;
vec4 surf = texture2D( uSurfaceMap, mapUV );
float texel = 1.0 / uMapSize;
float texelWorld = 2.0 * uMapHalf / uMapSize;
float hx = texture2D( uHeightMap, mapUV + vec2( texel, 0.0 ) ).r - texture2D( uHeightMap, mapUV - vec2( texel, 0.0 ) ).r;
float hz = texture2D( uHeightMap, mapUV + vec2( 0.0, texel ) ).r - texture2D( uHeightMap, mapUV - vec2( 0.0, texel ) ).r;
float slope = length( vec2( hx, hz ) ) / ( 2.0 * texelWorld );

float density = ( 1.0 - surf.r ) * ( 1.0 - surf.b ) * ( 1.0 - surf.g ) * ( 1.0 - surf.a * 0.55 );
density *= 1.0 - smoothstep( 0.35, 0.7, slope );
density *= 1.0 - smoothstep( 46.0, 66.0, ground );
float patchNoise = texture2D( uNoiseMap, worldXZ * 0.028 ).r;
density *= smoothstep( 0.22, 0.62, patchNoise * 0.75 + 0.3 );

vec2 camXZ = cameraPosition.xz;
float dist = distance( worldXZ, camXZ );
float lod = mix( 1.0, 0.22, smoothstep( 18.0, 58.0, dist ) );
float keep = step( aSeed.z, density * uDensity * lod );
float fade = 1.0 - smoothstep( uFadeStart, uFadeEnd, dist );
float heightScale = ( 0.5 + 0.8 * aSeed.y ) * keep * fade;

float ang = aSeed.x * 6.2831853;
float ca = cos( ang );
float sa = sin( ang );
vec2 fwd = vec2( -sa, ca );
float t = position.y;
vBladeT = t;
vShade = aSeed.w;

// viento: dos ondas viajeras + ruido de baja frecuencia desplazado por el tiempo
float wt = uTime * 1.35;
float gust = texture2D( uNoiseMap, worldXZ * 0.012 + uWindDir * uTime * 0.035 ).g - 0.5;
float wind = sin( wt + worldXZ.x * 0.11 + worldXZ.y * 0.07 ) * 0.45
           + sin( wt * 1.9 + worldXZ.x * 0.29 - worldXZ.y * 0.21 ) * 0.2
           + gust * 1.8;
vec2 windOff = uWindDir * wind * 0.42;

// pisadas del jugador
vec2 toPlayer = worldXZ - uPlayerPos.xz;
float pd = length( toPlayer );
float tramp = 1.0 - smoothstep( 0.15, 1.15, pd );
tramp *= step( abs( uPlayerPos.y - ground ), 1.6 );
vec2 pushDir = pd > 1e-3 ? toPlayer / pd : vec2( 1.0, 0.0 );
vTramp = tramp;

float width = 0.8 + 0.5 * aSeed.w;
vec2 rotated = vec2( position.x * width * ca, position.x * width * sa );
float bend = ( 0.22 + 0.32 * aSeed.w ) * t * t;
vec3 wp = vec3( worldXZ.x + rotated.x, ground + t * heightScale, worldXZ.y + rotated.y );
wp.xz += fwd * bend * heightScale;
wp.xz += windOff * t * t * heightScale;
wp.xz += pushDir * tramp * 0.9 * t * heightScale;
wp.y -= tramp * 0.6 * t * heightScale;
gGrassPos = wp;

// normal redondeada: se inclina hacia cada lado de la brizna
float sideSign = sign( position.x + 1e-4 );
vec3 sideDir = vec3( ca, 0.0, sa ) * sideSign;
gGrassNormal = normalize( vec3( fwd.x, 0.55 + 0.35 * t, fwd.y ) * 0.8 + sideDir * 0.45 );
vec3 objectNormal = gGrassNormal;
`;

const FRAGMENT_HEADER = /* glsl */ `
varying float vBladeT;
varying float vShade;
varying float vTramp;
`;

const FRAGMENT_COLOR = /* glsl */ `
{
  vec3 base = vec3( 0.09, 0.22, 0.045 );
  vec3 tip = vec3( 0.46, 0.63, 0.19 );
  float k = vBladeT * vBladeT * 0.85 + vBladeT * 0.15;
  vec3 col = mix( base, tip, k );
  col = mix( col, col * vec3( 1.18, 1.04, 0.62 ), smoothstep( 0.55, 1.0, vShade ) * 0.7 );
  col *= 0.55 + 0.45 * vBladeT;
  col = mix( col, col * vec3( 0.85, 0.8, 0.6 ), vTramp * 0.5 );
  diffuseColor.rgb *= col;
}
`;

export class Grass {
  /**
   * @param {import('three').Scene} scene
   * @param {{heightTexture, surfaceTexture, mapHalf:number, mapSize:number, quality:object}} opts
   */
  constructor(scene, { heightTexture, surfaceTexture, mapHalf, mapSize, quality }) {
    const tileRadius = quality.grassTileRadius;
    const bladesPerTile = Math.round(1500 * quality.grassDensity);
    this.geometry = buildBladeGeometry(tileRadius, bladesPerTile);

    const span = tileRadius * TILE_SIZE;
    this.uniforms = {
      uHeightMap: { value: heightTexture },
      uSurfaceMap: { value: surfaceTexture },
      uNoiseMap: { value: getNoiseTexture() },
      uMapHalf: { value: mapHalf },
      uMapSize: { value: mapSize },
      uTime: { value: 0 },
      uPlayerPos: { value: new Vector3() },
      uWindDir: { value: new Vector2(0.8, 0.6).normalize() },
      uDensity: { value: 1 },
      uFadeStart: { value: span - 22 },
      uFadeEnd: { value: span - 4 },
      uTileSize: { value: TILE_SIZE },
    };

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
      side: DoubleSide,
    });
    const uniforms = this.uniforms;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + VERTEX_HEADER)
        .replace('#include <beginnormal_vertex>', VERTEX_BODY)
        .replace('#include <begin_vertex>', 'vec3 transformed = gGrassPos;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FRAGMENT_HEADER)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAGMENT_COLOR);
    };
    material.customProgramCacheKey = () => 'narino-grass';

    this.mesh = new Mesh(this.geometry, material);
    this.mesh.name = 'grass';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.matrixAutoUpdate = false;
    // Se dibuja después del terreno para aprovechar el early-z.
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  /** @param {number} dt @param {{x:number,y:number,z:number}} player */
  update(dt, player) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uPlayerPos.value.set(player.x, player.y, player.z);
  }

  setVisible(v) {
    this.mesh.visible = v;
  }

  dispose() {
    this.geometry.dispose();
    this.mesh.material.dispose();
  }
}
