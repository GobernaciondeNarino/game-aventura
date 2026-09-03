// Cuerpos de agua del entorno realista.
//
// - Mar Pacífico: `Water` de Three.js (reflejo en tiempo real + normal map
//   animado + brillo solar). En calidad baja se sustituye por el agua simple.
// - Lagos, poza y río: material PBR ligero con dos capas de normales
//   desplazándose (el río fluye a lo largo de su cinta) y reflejo del cielo vía
//   el mapa de entorno de la escena.
// - Cascada: láminas de agua que siguen la ladera del terreno, con espuma y
//   niebla en la poza.

import {
  AdditiveBlending, CircleGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry,
  RepeatWrapping, Sprite, SpriteMaterial, Vector2, Vector3, Float32BufferAttribute,
} from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { ribbonGeometry } from '../world/ribbon.js';
import { LAKES, RIVER, WATERFALL, SEA_LEVEL, BEACH } from '../world/worldLayout.js';
import { heightAt } from './terrainMath.js';
import { makeWaterNormalTexture, makeWaterfallTexture, makeSoftParticleTexture } from './proceduralTextures.js';

// Sustituye la lectura del normal map por la mezcla animada de dos capas.
const NORMAL_SAMPLE_ORIGINAL = 'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;';
const NORMAL_SAMPLE_ANIMATED = /* glsl */ `
vec2 uvA = vNormalMapUv * 0.9 + uFlow * uTime;
vec2 uvB = vNormalMapUv * 0.55 + vec2( 3.1, 7.3 ) - uFlow * uTime * 0.45 + vec2( uTime * 0.012, 0.0 );
vec3 nA = texture2D( normalMap, uvA ).xyz * 2.0 - 1.0;
vec3 nB = texture2D( normalMap, uvB ).xyz * 2.0 - 1.0;
vec3 mapN = normalize( vec3( nA.xy + nB.xy, nA.z * nB.z ) );
`;

/** Material de agua ligero (lagos, río, poza, mar en calidad baja). */
export function makeSimpleWaterMaterial(normalTexture, { color = 0x2a6f8f, opacity = 0.86, flow = new Vector2(0.02, 0.015), normalScale = 0.35 } = {}) {
  const material = new MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.18,
    metalness: 0.02,
    normalMap: normalTexture,
    normalScale: new Vector2(normalScale, normalScale),
    envMapIntensity: 1.3,
    depthWrite: false,
  });
  const uniforms = { uTime: { value: 0 }, uFlow: { value: flow } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec2 uFlow;')
      .replace(NORMAL_SAMPLE_ORIGINAL, NORMAL_SAMPLE_ANIMATED);
  };
  material.customProgramCacheKey = () => 'narino-simple-water';
  return material;
}

// UVs métricas (1 unidad = 3 m) en el plano XZ para que el patrón no se estire.
function setWorldUvs(geometry, offsetX, offsetZ, scale = 1 / 14) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    // la geometría está rotada -90° en X: (x, y) del plano → (x, -z) del mundo
    uv[i * 2] = (pos.getX(i) + offsetX) * scale;
    uv[i * 2 + 1] = (-pos.getY(i) + offsetZ) * scale;
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
}

export class WaterBodies {
  /**
   * @param {import('three').Scene} scene
   * @param {{sunDirection: Vector3, quality: object, reflectionHide?: import('three').Object3D[]}} opts
   */
  constructor(scene, { sunDirection, quality, reflectionHide = [] }) {
    this.scene = scene;
    this.group = new Group();
    this.group.name = 'water';
    scene.add(this.group);
    this.normalTexture = makeWaterNormalTexture(512);
    this.simpleMaterials = [];
    this.time = 0;
    this.reflectionHide = reflectionHide;

    this._buildSea(sunDirection, quality);
    this._buildLakes();
    this._buildRiver();
    this._buildWaterfall();
  }

  _buildSea(sunDirection, quality) {
    // El plano empieza en x = 200 para no asomar en las cuencas de los lagos.
    const width = 2200;
    const depth = 2400;
    const geometry = new PlaneGeometry(width, depth);
    const centerX = 200 + width / 2;
    if (quality.seaReflection > 0) {
      const water = new Water(geometry, {
        textureWidth: quality.seaReflection,
        textureHeight: quality.seaReflection,
        waterNormals: this.normalTexture,
        sunDirection: sunDirection.clone(),
        sunColor: 0xfff4e0,
        waterColor: 0x0b3a52,
        distortionScale: 3.4,
        fog: true,
        alpha: 0.97,
      });
      water.material.uniforms.size.value = 4.5;
      // Durante el render del reflejo ocultamos las capas caras (césped, hojas).
      const original = water.onBeforeRender;
      const hide = this.reflectionHide;
      water.onBeforeRender = (renderer, scene, camera) => {
        for (const o of hide) o.visible = false;
        original.call(water, renderer, scene, camera);
        for (const o of hide) o.visible = true;
      };
      this.sea = water;
      this.seaIsReflective = true;
    } else {
      setWorldUvs(geometry, centerX, 0);
      const material = makeSimpleWaterMaterial(this.normalTexture, {
        color: 0x0f4a68, opacity: 0.93, flow: new Vector2(-0.035, 0.01), normalScale: 0.5,
      });
      this.simpleMaterials.push(material);
      this.sea = new Mesh(geometry, material);
      this.seaIsReflective = false;
    }
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(centerX, SEA_LEVEL, 0);
    this.sea.name = 'sea';
    this.sea.renderOrder = 2;
    this.group.add(this.sea);
  }

  _buildLakes() {
    const bodies = [...LAKES, { ...WATERFALL.pool, id: 'poza' }];
    for (const lake of bodies) {
      const geometry = new CircleGeometry(lake.R * 0.99, 56);
      setWorldUvs(geometry, lake.x, lake.z);
      const material = makeSimpleWaterMaterial(this.normalTexture, {
        color: lake.id === 'poza' ? 0x2f7a97 : 0x1f5f7c,
        opacity: 0.86,
        flow: new Vector2(0.012, 0.008),
        normalScale: 0.22,
      });
      this.simpleMaterials.push(material);
      const mesh = new Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(lake.x, lake.level, lake.z);
      mesh.name = `lake-${lake.id}`;
      mesh.renderOrder = 2;
      this.group.add(mesh);
    }
  }

  _buildRiver() {
    // Cinta que sigue la polilínea del río, a nivel del agua.
    const points = RIVER.points.map((p) => ({ x: p.x, y: RIVER.level, z: p.z }));
    const width = RIVER.halfWidth * 2 * 0.62;
    const geometry = ribbonGeometry(points, width, 96);
    // ribbonGeometry da u ∈ {0,1} y v en unidades de 3 m: escalar u para que sea métrico.
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) { uv.setX(i, uv.getX(i) * (width / 14)); uv.setY(i, uv.getY(i) * (3 / 14)); }
    uv.needsUpdate = true;
    const material = makeSimpleWaterMaterial(this.normalTexture, {
      color: 0x2b6d8a,
      opacity: 0.82,
      flow: new Vector2(0.0, -0.12), // corriente hacia la laguna baja
      normalScale: 0.3,
    });
    material.side = DoubleSide;
    this.simpleMaterials.push(material);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'river';
    mesh.renderOrder = 2;
    this.group.add(mesh);
  }

  _buildWaterfall() {
    const { top, pool } = WATERFALL;
    const steps = 18;
    const endX = pool.x - 3;
    const endZ = pool.z + 0.5;
    const layers = [
      { width: 3.4, lift: 0.35, opacity: 0.78, speed: 0.9, repeat: 4 },
      { width: 2.2, lift: 0.7, opacity: 0.55, speed: 1.35, repeat: 3 },
    ];
    this.waterfallTextures = [];
    for (const layer of layers) {
      const points = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = top.x + (endX - top.x) * t;
        const z = top.z + (endZ - top.z) * t;
        let y = heightAt(x, z) + layer.lift;
        // la lámina no baja de la superficie de la poza
        y = Math.max(y, pool.level + 0.05);
        // arranque suave desde el borde superior
        if (i === 0) y += 0.4;
        points.push({ x, y, z });
      }
      const geometry = ribbonGeometry(points, layer.width, steps);
      const texture = makeWaterfallTexture();
      texture.repeat.set(1, layer.repeat);
      const material = new MeshStandardMaterial({
        map: texture,
        color: 0xdff2ff,
        transparent: true,
        opacity: layer.opacity,
        roughness: 0.25,
        metalness: 0,
        side: DoubleSide,
        depthWrite: false,
        emissive: 0x3a5f75,
        emissiveIntensity: 0.35,
      });
      const mesh = new Mesh(geometry, material);
      mesh.name = 'waterfall';
      mesh.renderOrder = 3;
      this.group.add(mesh);
      this.waterfallTextures.push({ texture, speed: layer.speed });
    }

    // Niebla y espuma en el punto de impacto.
    const soft = makeSoftParticleTexture(64);
    this.mist = [];
    const impactX = endX + 1.5;
    const impactZ = endZ;
    for (let i = 0; i < 10; i++) {
      const material = new SpriteMaterial({
        map: soft, color: 0xeaf6ff, transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending,
      });
      const sprite = new Sprite(material);
      const size = 4 + Math.random() * 5;
      sprite.scale.set(size, size * 0.8, 1);
      sprite.userData = {
        baseX: impactX + (Math.random() - 0.5) * 6,
        baseZ: impactZ + (Math.random() - 0.5) * 6,
        phase: Math.random() * 10,
        rise: 1.5 + Math.random() * 2.5,
      };
      sprite.position.set(sprite.userData.baseX, pool.level + 1, sprite.userData.baseZ);
      this.group.add(sprite);
      this.mist.push(sprite);
    }
  }

  /** Objetos que deben ocultarse durante el render del reflejo del mar. */
  setReflectionHide(list) {
    this.reflectionHide.length = 0;
    this.reflectionHide.push(...list);
  }

  update(dt) {
    this.time += dt;
    if (this.seaIsReflective) this.sea.material.uniforms.time.value += dt * 0.6;
    for (const m of this.simpleMaterials) m.userData.uniforms.uTime.value = this.time;
    for (const w of this.waterfallTextures) w.texture.offset.y -= dt * w.speed;
    for (const s of this.mist) {
      const u = s.userData;
      const t = (this.time * 0.35 + u.phase) % 1;
      s.position.set(u.baseX + Math.sin(this.time * 0.7 + u.phase) * 0.6, WATERFALL.pool.level + 0.6 + t * u.rise, u.baseZ);
      s.material.opacity = 0.26 * (1 - t) * Math.min(1, t * 6);
    }
  }
}
