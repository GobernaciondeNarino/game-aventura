// Árboles y arbustos procedurales (ez-tree) sobre el terreno.
//
// - Se generan pocas variantes (roble, fresno, álamo, pino, arbustos) y se
//   instancian: los árboles cercanos al jugador se dibujan con geometría real
//   (InstancedMesh de ramas + hojas con sombras y vaivén), y los lejanos como
//   impostores (billboards) renderizados a un atlas al arrancar.
// - La distribución evita pavimento, agua, arena, pendientes fuertes y las
//   zonas jugables planas; concentra bosque alrededor de la cascada, de la
//   Reserva La Planada, de los lagos y en el piedemonte.

import {
  BufferAttribute, DoubleSide, HalfFloatType, InstancedBufferAttribute, InstancedBufferGeometry,
  InstancedMesh, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshStandardMaterial, Object3D,
  OrthographicCamera, RGBADepthPacking, Scene, Vector2, Vector3, WebGLRenderTarget, HemisphereLight,
  DirectionalLight, Box3, Group, LinearFilter,
} from 'three';
import { Tree } from '../vendor/ez-tree/tree.js';
import { loadPreset } from '../vendor/ez-tree/presets/index.js';
import { getBarkTexture, getLeafTexture, whenTexturesReady } from '../vendor/ez-tree/textures.js';
import { heightAt, surfaceAt, slopeAt, flatMask, fbm2, WATER_THRESHOLD } from './terrainMath.js';
import { FOREST, LAKES } from '../world/worldLayout.js';
import { SITES } from '../world/sitesData.js';

const VARIANTS = [
  { id: 'roble', preset: 'Oak Medium', seed: 11, height: 9.5, kind: 'broadleaf', trunkR: 0.5 },
  { id: 'roble-joven', preset: 'Oak Small', seed: 23, height: 6.5, kind: 'broadleaf', trunkR: 0.35 },
  { id: 'fresno', preset: 'Ash Medium', seed: 37, height: 9, kind: 'broadleaf', trunkR: 0.45 },
  { id: 'alamo', preset: 'Aspen Medium', seed: 41, height: 8.5, kind: 'broadleaf', trunkR: 0.4 },
  { id: 'pino', preset: 'Pine Medium', seed: 53, height: 11, kind: 'conifer', trunkR: 0.45 },
  { id: 'pino-joven', preset: 'Pine Small', seed: 67, height: 7, kind: 'conifer', trunkR: 0.3 },
  { id: 'arbusto', preset: 'Bush 1', seed: 71, height: 1.6, kind: 'bush', trunkR: 0 },
  { id: 'arbusto-b', preset: 'Bush 2', seed: 79, height: 1.4, kind: 'bush', trunkR: 0 },
];

const ATLAS_TILE_W = 256;
const ATLAS_TILE_H = 512;

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

// Vaivén de las hojas en función de la posición de la instancia.
const LEAF_SWAY = /* glsl */ `
#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 iPos = vec3( instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2] );
  float swayAmt = clamp( position.y / 6.0, 0.0, 1.0 );
  float ph = uTime * 1.2 + iPos.x * 0.35 + iPos.z * 0.27;
  transformed.x += ( sin( ph ) * 0.12 + sin( ph * 2.3 + position.y ) * 0.05 ) * swayAmt;
  transformed.z += cos( ph * 0.8 ) * 0.1 * swayAmt;
}
#endif
`;

const IMPOSTOR_VERTEX_HEADER = /* glsl */ `
attribute vec3 aPos;
attribute vec2 aSize;
attribute float aVariant;
attribute float aFlip;
uniform float uVariants;
uniform vec2 uNearCenter;
uniform float uNearRadius;
uniform float uTime;
varying vec2 vAtlasUv;
`;

const IMPOSTOR_VERTEX_BODY = /* glsl */ `
vec3 toCam = cameraPosition - aPos;
float ang = atan( toCam.x, toCam.z );
vec3 right = vec3( cos( ang ), 0.0, -sin( ang ) );
float show = step( uNearRadius, distance( aPos.xz, uNearCenter ) );
vec3 transformed = aPos + ( right * position.x * aSize.x + vec3( 0.0, position.y * aSize.y, 0.0 ) ) * show;
transformed.x += sin( uTime * 0.9 + aPos.x * 0.2 ) * 0.12 * position.y * show;
float u = mix( uv.x, 1.0 - uv.x, aFlip );
vAtlasUv = vec2( ( u + aVariant ) / uVariants, uv.y );
`;

export class Trees {
  /**
   * @param {import('three').Scene} scene
   * @param {{quality: object}} opts
   */
  constructor(scene, { quality }) {
    this.scene = scene;
    this.quality = quality;
    this.group = new Group();
    this.group.name = 'trees';
    scene.add(this.group);
    this.colliders = [];
    this.instances = [];
    this.variants = [];
    this.time = 0;
    this.nearCapacity = quality.id === 'alta' ? 240 : quality.id === 'media' ? 150 : 80;
    this.nearRadius = quality.treeNearRadius;
    this.countScale = quality.id === 'alta' ? 1 : quality.id === 'media' ? 0.7 : 0.45;
    this._lastCenter = new Vector2(1e9, 1e9);
    this._dummy = new Object3D();
    this.leafUniforms = { uTime: { value: 0 } };
  }

  /**
   * Genera variantes, distribuye instancias y hornea el atlas de impostores.
   * @param {import('three').WebGLRenderer} renderer
   * @param {import('three').Texture|null} environment mapa de entorno de la escena
   * @param {Vector3} sunDirection
   */
  async build(renderer, environment, sunDirection) {
    this._generateVariants();
    this._distribute();
    this._buildNearMeshes();
    // El atlas de impostores necesita las texturas de hojas/corteza ya cargadas.
    await whenTexturesReady();
    this._buildImpostors(renderer, environment, sunDirection);
  }

  // ---- variantes ------------------------------------------------------------

  _generateVariants() {
    for (const def of VARIANTS) {
      const tree = new Tree();
      tree.options.copy(loadPreset(def.preset));
      tree.options.seed = def.seed;
      // Menos detalle que el preset original: se instancian muchos ejemplares.
      if (def.kind !== 'bush') {
        tree.options.branch.segments = { 0: 7, 1: 5, 2: 4, 3: 3 };
        tree.options.branch.sections = { 0: 8, 1: 5, 2: 3, 3: 2 };
        // Menos hojas pero más grandes: misma cobertura visual con ~40 % de vértices.
        tree.options.leaves.count = Math.max(1, Math.round(tree.options.leaves.count * 0.4));
        tree.options.leaves.size *= 1.5;
      } else {
        tree.options.leaves.count = Math.max(1, Math.round(tree.options.leaves.count * 0.5));
        tree.options.leaves.size *= 1.3;
      }
      tree.generate();

      const branches = tree.branchesMesh.geometry;
      const leaves = tree.leavesMesh.geometry;
      const box = new Box3().setFromBufferAttribute(branches.attributes.position);
      if (leaves.attributes.position && leaves.attributes.position.count) {
        box.union(new Box3().setFromBufferAttribute(leaves.attributes.position));
      }
      const scale = def.height / Math.max(0.1, box.max.y);
      branches.scale(scale, scale, scale);
      leaves.scale(scale, scale, scale);
      branches.computeBoundingBox();
      leaves.computeBoundingBox();
      branches.computeBoundingSphere();
      leaves.computeBoundingSphere();
      const size = new Vector3();
      new Box3().copy(branches.boundingBox).union(leaves.boundingBox).getSize(size);

      const barkType = tree.options.bark.type;
      const barkMaterial = new MeshStandardMaterial({
        map: getBarkTexture(barkType, 'color', tree.options.bark.textureScale),
        normalMap: getBarkTexture(barkType, 'normal', tree.options.bark.textureScale),
        roughness: 0.92,
        metalness: 0,
      });
      const leafTexture = getLeafTexture(tree.options.leaves.type);
      const leafMaterial = new MeshStandardMaterial({
        map: leafTexture,
        color: tree.options.leaves.tint,
        alphaTest: tree.options.leaves.alphaTest ?? 0.5,
        side: DoubleSide,
        roughness: 0.78,
        metalness: 0,
      });
      const leafUniforms = this.leafUniforms;
      leafMaterial.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, leafUniforms);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', LEAF_SWAY);
      };
      leafMaterial.customProgramCacheKey = () => 'narino-leaf-' + def.id;
      const leafDepth = new MeshDepthMaterial({
        depthPacking: RGBADepthPacking,
        map: leafTexture,
        alphaTest: tree.options.leaves.alphaTest ?? 0.5,
        side: DoubleSide,
      });

      // Liberar los materiales Phong internos de ez-tree.
      tree.branchesMesh.material.dispose();
      tree.leavesMesh.material.dispose();

      this.variants.push({
        def, branches, leaves, barkMaterial, leafMaterial, leafDepth,
        width: Math.max(size.x, size.z), height: size.y,
      });
    }
  }

  // ---- distribución ---------------------------------------------------------

  _distribute() {
    const rand = mulberry32(60217);
    const cell = 5;
    const occupied = new Map();
    const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    const tooClose = (x, z, minDist) => {
      const cx = Math.floor(x / cell);
      const cz = Math.floor(z / cell);
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const bucket = occupied.get(`${cx + i},${cz + j}`);
          if (!bucket) continue;
          for (const p of bucket) if (Math.hypot(p.x - x, p.z - z) < minDist) return true;
        }
      }
      return false;
    };
    const variantOf = (kind) => {
      const pool = this.variants.map((v, i) => ({ v, i })).filter(({ v }) => v.def.kind === kind);
      return pool[Math.floor(rand() * pool.length)].i;
    };
    const maxTrees = Math.round(1700 * this.countScale);

    const tryPlace = (x, z, { forceKind = null, minDist = 4.5, allowFlat = 0.35 } = {}) => {
      if (this.instances.length >= maxTrees) return false;
      if (Math.hypot(x, z) > 330) return false;
      const h = heightAt(x, z);
      if (h < WATER_THRESHOLD + 0.35 || h > 62) return false;
      if (flatMask(x, z) > allowFlat) return false;
      const s = surfaceAt(x, z);
      if (s.hard > 0.05 || s.sand > 0.35 || s.water) return false;
      if (slopeAt(x, z) > 0.55) return false;
      if (tooClose(x, z, minDist)) return false;
      let kind = forceKind;
      if (!kind) {
        const r = rand();
        if (h > 22) kind = r < 0.8 ? 'conifer' : 'bush';
        else kind = r < 0.62 ? 'broadleaf' : r < 0.8 ? 'conifer' : 'bush';
      }
      const variant = variantOf(kind);
      const def = this.variants[variant].def;
      const scale = 0.8 + rand() * 0.45;
      const inst = { x, z, y: h, variant, rotation: rand() * Math.PI * 2, scale, flip: rand() < 0.5 ? 1 : 0 };
      this.instances.push(inst);
      const k = key(x, z);
      if (!occupied.has(k)) occupied.set(k, []);
      occupied.get(k).push(inst);
      if (def.trunkR > 0) this.colliders.push({ x, z, r: def.trunkR * scale });
      return true;
    };

    // Bosque de niebla de la cascada (denso).
    for (let i = 0; i < 320 * this.countScale; i++) {
      const a = rand() * Math.PI * 2;
      const d = 14 + Math.sqrt(rand()) * (FOREST.radius - 10);
      tryPlace(FOREST.x + Math.cos(a) * d, FOREST.z + Math.sin(a) * d, { minDist: 3.6 });
    }
    // Reserva La Planada: anillo de bosque alrededor del sitio.
    const planada = SITES.find((s) => s.id === 'planada');
    if (planada) {
      for (let i = 0; i < 110 * this.countScale; i++) {
        const a = rand() * Math.PI * 2;
        const d = planada.solidRadius + 6 + rand() * 26;
        tryPlace(planada.position.x + Math.sin(a) * d, planada.position.z + Math.cos(a) * d, { allowFlat: 0.9, minDist: 3.8 });
      }
    }
    // Orillas de los lagos.
    for (const lake of LAKES) {
      for (let i = 0; i < 70 * this.countScale; i++) {
        const a = rand() * Math.PI * 2;
        const d = lake.R * 1.35 + rand() * lake.R * 1.1;
        tryPlace(lake.x + Math.cos(a) * d, lake.z + Math.sin(a) * d, { allowFlat: 0.95 });
      }
    }
    // Arboledas dispersas por las colinas según un ruido de "bosque".
    for (let i = 0; i < 9000 * this.countScale; i++) {
      const a = rand() * Math.PI * 2;
      const d = 40 + Math.sqrt(rand()) * 250;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const forest = 0.5 + 0.5 * fbm2(x * 0.011 + 17, z * 0.011 - 9, 3);
      const p = Math.max(0, (forest - 0.42) * 1.9);
      if (rand() > p) continue;
      tryPlace(x, z);
    }
    // Pinos del piedemonte y laderas bajas de la cordillera.
    for (let i = 0; i < 2600 * this.countScale; i++) {
      const a = rand() * Math.PI * 2;
      const d = 225 + rand() * 105;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (rand() < 0.35) continue;
      tryPlace(x, z, { forceKind: 'conifer', minDist: 5.5 });
    }
  }

  // ---- mallas cercanas ------------------------------------------------------

  _buildNearMeshes() {
    for (const v of this.variants) {
      const branches = new InstancedMesh(v.branches, v.barkMaterial, this.nearCapacity);
      branches.castShadow = true;
      branches.receiveShadow = true;
      branches.frustumCulled = false;
      branches.count = 0;
      const leaves = new InstancedMesh(v.leaves, v.leafMaterial, this.nearCapacity);
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      leaves.customDepthMaterial = v.leafDepth;
      leaves.frustumCulled = false;
      leaves.count = 0;
      v.nearBranches = branches;
      v.nearLeaves = leaves;
      this.group.add(branches, leaves);
    }
  }

  _rebuildNear(px, pz) {
    const R = this.nearRadius;
    const near = [];
    for (const inst of this.instances) {
      const d = Math.hypot(inst.x - px, inst.z - pz);
      if (d < R) {
        inst._d = d;
        near.push(inst);
      }
    }
    near.sort((a, b) => a._d - b._d);
    let effectiveR = R;
    if (near.length > this.nearCapacity) {
      effectiveR = near[this.nearCapacity - 1]._d + 0.01;
      near.length = this.nearCapacity;
    }
    for (const v of this.variants) v._n = 0;
    const dummy = this._dummy;
    for (const inst of near) {
      const v = this.variants[inst.variant];
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.rotation.set(0, inst.rotation, 0);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      v.nearBranches.setMatrixAt(v._n, dummy.matrix);
      v.nearLeaves.setMatrixAt(v._n, dummy.matrix);
      v._n++;
    }
    for (const v of this.variants) {
      v.nearBranches.count = v._n;
      v.nearLeaves.count = v._n;
      v.nearBranches.instanceMatrix.needsUpdate = true;
      v.nearLeaves.instanceMatrix.needsUpdate = true;
    }
    this.impostorUniforms.uNearCenter.value.set(px, pz);
    this.impostorUniforms.uNearRadius.value = effectiveR;
    this._lastCenter.set(px, pz);
  }

  // ---- impostores -----------------------------------------------------------

  _buildImpostors(renderer, environment, sunDirection) {
    const n = this.variants.length;
    const target = new WebGLRenderTarget(ATLAS_TILE_W * n, ATLAS_TILE_H, {
      type: HalfFloatType, depthBuffer: true, minFilter: LinearFilter, magFilter: LinearFilter,
    });
    const scene = new Scene();
    scene.environment = environment;
    scene.add(new HemisphereLight(0xbcd3f0, 0x5c6a3a, 0.5));
    const sun = new DirectionalLight(0xfff1dc, 2.3);
    sun.position.copy(sunDirection).multiplyScalar(50);
    scene.add(sun);
    // La vista frontal mira hacia -z; la luz se orienta relativa a esa vista.
    sun.position.set(-sunDirection.x * 50, sunDirection.y * 50, Math.abs(sunDirection.z) * 50);

    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearAlpha();
    const prevScissor = renderer.getScissorTest();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.setScissorTest(true);

    for (let i = 0; i < n; i++) {
      const v = this.variants[i];
      const branches = new Mesh(v.branches, v.barkMaterial);
      const leaves = new Mesh(v.leaves, v.leafMaterial);
      scene.add(branches, leaves);
      const w = v.width * 1.05;
      const h = v.height * 1.02;
      const cam = new OrthographicCamera(-w / 2, w / 2, h, 0, 0.1, 200);
      cam.position.set(0, 0, 80);
      cam.lookAt(0, 0, 0);
      renderer.setViewport(i * ATLAS_TILE_W, 0, ATLAS_TILE_W, ATLAS_TILE_H);
      renderer.setScissor(i * ATLAS_TILE_W, 0, ATLAS_TILE_W, ATLAS_TILE_H);
      renderer.render(scene, cam);
      scene.remove(branches, leaves);
      v.impostorWidth = w;
      v.impostorHeight = h;
    }
    renderer.setScissorTest(prevScissor);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(0x000000, prevClear);

    // Geometría instanciada de billboards.
    const count = this.instances.length;
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([
      -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,
    ]), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count * 2);
    const variant = new Float32Array(count);
    const flip = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const inst = this.instances[i];
      const v = this.variants[inst.variant];
      pos[i * 3] = inst.x;
      pos[i * 3 + 1] = inst.y - 0.05;
      pos[i * 3 + 2] = inst.z;
      size[i * 2] = v.impostorWidth * inst.scale;
      size[i * 2 + 1] = v.impostorHeight * inst.scale;
      variant[i] = inst.variant;
      flip[i] = inst.flip;
    }
    geometry.setAttribute('aPos', new InstancedBufferAttribute(pos, 3));
    geometry.setAttribute('aSize', new InstancedBufferAttribute(size, 2));
    geometry.setAttribute('aVariant', new InstancedBufferAttribute(variant, 1));
    geometry.setAttribute('aFlip', new InstancedBufferAttribute(flip, 1));
    geometry.instanceCount = count;

    this.impostorUniforms = {
      uVariants: { value: n },
      uNearCenter: { value: new Vector2(1e9, 1e9) },
      uNearRadius: { value: 0 },
      uTime: { value: 0 },
    };
    const uniforms = this.impostorUniforms;
    const material = new MeshBasicMaterial({ map: target.texture, alphaTest: 0.45, side: DoubleSide, fog: true });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + IMPOSTOR_VERTEX_HEADER)
        .replace('#include <begin_vertex>', IMPOSTOR_VERTEX_BODY);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vAtlasUv;')
        .replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = texture2D( map, vAtlasUv );\ndiffuseColor *= sampledDiffuseColor;');
    };
    material.customProgramCacheKey = () => 'narino-impostor';
    this.impostors = new Mesh(geometry, material);
    this.impostors.name = 'tree-impostors';
    this.impostors.frustumCulled = false;
    this.impostors.matrixAutoUpdate = false;
    this.group.add(this.impostors);
  }

  // ---- por frame ------------------------------------------------------------

  update(dt, player) {
    this.time += dt;
    this.leafUniforms.uTime.value = this.time;
    if (this.impostorUniforms) {
      this.impostorUniforms.uTime.value = this.time;
      if (Math.hypot(player.x - this._lastCenter.x, player.z - this._lastCenter.y) > 8) {
        this._rebuildNear(player.x, player.z);
      }
    }
  }
}
