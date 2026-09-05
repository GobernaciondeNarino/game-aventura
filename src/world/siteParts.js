// Piezas arquitectónicas y naturales reutilizables para las maquetas de los
// sitios turísticos: muros con arcos (de medio punto o apuntados), techos a dos
// y cuatro aguas, cúpulas, agujas, columnas, escaleras, balaustradas, ventanas,
// texturas procedurales de piedra/teja/madera, "pieles" que siguen el terreno
// (nieve, azufre), espejos de agua animados, vapor, frailejones, barcas y
// carteles. Todo trabaja en el marco local de la maqueta (metros).
import {
  Mesh, Group, Shape, Path, ExtrudeGeometry, BoxGeometry, CylinderGeometry, ConeGeometry,
  SphereGeometry, PlaneGeometry, CircleGeometry, BufferGeometry, Float32BufferAttribute,
  MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, RepeatWrapping, Vector2, Sprite,
  SpriteMaterial, AdditiveBlending, DoubleSide, MathUtils,
} from 'three';
import { stdMat, PALETTE } from './primitives.js';
import { fbm2 } from '../environment/terrainMath.js';
import { makeSoftParticleTexture } from '../environment/proceduralTextures.js';
import { makeSimpleWaterMaterial, getWaterNormalTexture, registerWaterMaterial } from '../environment/WaterBodies.js';

// ---- texturas procedurales -------------------------------------------------

const textureCache = new Map();

function canvas2d(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return [canvas, canvas.getContext('2d')];
}

function finishTexture(canvas, repeat = 1) {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
}

/** Sillería: bloques de piedra con juntas. `tone` = color base CSS. */
export function stoneTexture(tone = '#b8b4aa', joint = '#6f6a62') {
  const key = `stone|${tone}|${joint}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [canvas, ctx] = canvas2d(256);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, 256, 256);
  const rows = 8;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? 32 : 0;
    for (let c = -1; c < 5; c++) {
      const x = c * 64 + offset;
      const shade = 0.85 + Math.random() * 0.3;
      ctx.fillStyle = shadeColor(tone, shade);
      ctx.fillRect(x + 2, r * rowH + 2, 60, rowH - 4);
    }
  }
  ctx.strokeStyle = joint;
  ctx.lineWidth = 3;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * rowH);
    ctx.lineTo(256, r * rowH);
    ctx.stroke();
  }
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? 32 : 0;
    for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.moveTo(c * 64 + offset, r * rowH);
      ctx.lineTo(c * 64 + offset, (r + 1) * rowH);
      ctx.stroke();
    }
  }
  const texture = finishTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/** Teja de barro: hileras de tejas curvas. */
export function tileTexture(tone = '#b5533a') {
  const key = `tile|${tone}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [canvas, ctx] = canvas2d(256);
  ctx.fillStyle = shadeColor(tone, 0.7);
  ctx.fillRect(0, 0, 256, 256);
  const rows = 8;
  const cols = 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * 32 + (r % 2 ? 16 : 0);
      const y = r * 32;
      ctx.fillStyle = shadeColor(tone, 0.85 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y + 32);
      ctx.quadraticCurveTo(x + 16, y - 10, x + 32, y + 32);
      ctx.closePath();
      ctx.fill();
    }
  }
  const texture = finishTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/** Revoque/encalado con grano suave. */
export function plasterTexture(tone = '#f4efe6') {
  const key = `plaster|${tone}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [canvas, ctx] = canvas2d(128);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const texture = finishTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/** Tablas de madera (vetas verticales). */
export function woodTexture(tone = '#8a5a34') {
  const key = `wood|${tone}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [canvas, ctx] = canvas2d(128);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = shadeColor(tone, 0.8 + Math.random() * 0.35);
    ctx.fillRect(i * 22, 0, 20, 128);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const x = Math.random() * 128;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 3, 40, x - 3, 90, x, 128);
    ctx.stroke();
  }
  const texture = finishTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

function shadeColor(css, factor) {
  const n = parseInt(css.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

// Materiales con textura, cacheados por textura + repetición.
const texturedCache = new Map();
export function texMat(texture, { repeat = 0.5, roughness = 0.85, color = 0xffffff, metalness = 0 } = {}) {
  const key = `${texture.uuid}|${repeat}|${roughness}|${color}`;
  let material = texturedCache.get(key);
  if (!material) {
    const map = texture.clone();
    map.needsUpdate = true;
    map.repeat.set(repeat, repeat);
    material = new MeshStandardMaterial({ map, color, roughness, metalness });
    texturedCache.set(key, material);
  }
  return material;
}

/** Materiales habituales. */
export const MATS = {
  get stone() { return texMat(stoneTexture('#b9b5ab', '#6f6a62'), { repeat: 0.35 }); },
  get stoneDark() { return texMat(stoneTexture('#8f8a80', '#4d4944'), { repeat: 0.35 }); },
  get stoneWarm() { return texMat(stoneTexture('#cfc3ad', '#8a7d67'), { repeat: 0.35 }); },
  get tile() { return texMat(tileTexture('#b5533a'), { repeat: 0.6 }); },
  get plaster() { return texMat(plasterTexture('#f4efe6'), { repeat: 0.3 }); },
  get plasterCream() { return texMat(plasterTexture('#efe2c4'), { repeat: 0.3 }); },
  get wood() { return texMat(woodTexture('#8a5a34'), { repeat: 0.5, roughness: 0.8 }); },
  get woodDark() { return texMat(woodTexture('#5a3a22'), { repeat: 0.5, roughness: 0.85 }); },
  get glass() { return stdMat(0x274b6d, { roughness: 0.15, metalness: 0.4 }); },
  get gold() { return stdMat(0xd9a23a, { roughness: 0.35, metalness: 0.7 }); },
  get snow() { return stdMat(0xf4f8fc, { roughness: 0.55 }); },
  get rock() { return stdMat(0x8d867c, { roughness: 0.92 }); },
  get rockDark() { return stdMat(0x6a635b, { roughness: 0.95 }); },
  get lava() { return stdMat(0x4a3830, { roughness: 1 }); },
  get metal() { return stdMat(0x39424a, { roughness: 0.5, metalness: 0.6 }); },
};

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// ---- volúmenes básicos -----------------------------------------------------

export function slab(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = shadowed(new Mesh(new BoxGeometry(w, h, d), material));
  mesh.position.set(x, y, z);
  return mesh;
}

export function drum(radius, height, material, seg = 20, x = 0, y = 0, z = 0) {
  const mesh = shadowed(new Mesh(new CylinderGeometry(radius, radius, height, seg), material));
  mesh.position.set(x, y, z);
  return mesh;
}

/** Aguja/pináculo: cono de `sides` lados. */
export function spire(radius, height, material, sides = 8, x = 0, y = 0, z = 0) {
  const mesh = shadowed(new Mesh(new ConeGeometry(radius, height, sides), material));
  mesh.position.set(x, y + height / 2, z);
  return mesh;
}

/** Cúpula (media esfera) opcionalmente achatada, con linterna. */
export function dome(radius, material, { squash = 1, lantern = false, x = 0, y = 0, z = 0 } = {}) {
  const group = new Group();
  const geometry = new SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const mesh = shadowed(new Mesh(geometry, material));
  mesh.scale.y = squash;
  group.add(mesh);
  if (lantern) {
    group.add(drum(radius * 0.22, radius * 0.5, MATS.plaster, 10, 0, radius * squash + radius * 0.25, 0));
    const cap = new Mesh(new SphereGeometry(radius * 0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
    cap.position.y = radius * squash + radius * 0.5;
    group.add(shadowed(cap));
    const cross = slab(0.08, radius * 0.5, 0.08, MATS.gold, 0, radius * squash + radius * 0.95, 0);
    group.add(cross, slab(radius * 0.25, 0.08, 0.08, MATS.gold, 0, radius * squash + radius * 1.05, 0));
  }
  group.position.set(x, y, z);
  return group;
}

/**
 * Techo a dos aguas (prisma triangular) para una planta de `width` (X) por
 * `depth` (Z). `ridge` indica el eje de la cumbrera: 'x' (por defecto) o 'z'.
 */
export function gableRoof(width, depth, height, material, { overhang = 0.3, ridge = 'x', x = 0, y = 0, z = 0 } = {}) {
  const across = (ridge === 'x' ? depth : width) + overhang * 2; // luz del triángulo
  const along = (ridge === 'x' ? width : depth) + overhang * 2;  // largo de la cumbrera
  const shape = new Shape();
  shape.moveTo(-across / 2, 0);
  shape.lineTo(across / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: along, bevelEnabled: false });
  geometry.translate(0, 0, -along / 2);
  if (ridge === 'x') geometry.rotateY(Math.PI / 2);
  const mesh = shadowed(new Mesh(geometry, material));
  mesh.position.set(x, y, z);
  return mesh;
}

/** Techo a cuatro aguas (pirámide rectangular). */
export function hipRoof(width, depth, height, material, { overhang = 0.3, x = 0, y = 0, z = 0 } = {}) {
  const mesh = shadowed(new Mesh(new ConeGeometry(1, height, 4), material));
  mesh.rotation.y = Math.PI / 4;
  mesh.scale.set((width + overhang * 2) / Math.SQRT2, 1, (depth + overhang * 2) / Math.SQRT2);
  mesh.position.set(x, y + height / 2, z);
  return mesh;
}

/**
 * Muro (ancho X, alto Y, grosor Z) con huecos en arco. Cada arco:
 * { x, w, h, kind: 'round' | 'pointed' | 'rect' } (h = altura total del hueco).
 */
export function archedWall(width, height, thickness, arches, material, { x = 0, y = 0, z = 0 } = {}) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  for (const arch of arches) shape.holes.push(archPath(arch.x, arch.w, arch.h, arch.kind || 'round', arch.y || 0));
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 10 });
  geometry.translate(0, 0, -thickness / 2);
  const mesh = shadowed(new Mesh(geometry, material));
  mesh.position.set(x, y, z);
  return mesh;
}

function archPath(cx, w, h, kind, baseY = 0) {
  const path = new Path();
  const r = w / 2;
  if (kind === 'rect') {
    path.moveTo(cx - r, baseY);
    path.lineTo(cx + r, baseY);
    path.lineTo(cx + r, baseY + h);
    path.lineTo(cx - r, baseY + h);
    path.closePath();
    return path;
  }
  if (kind === 'pointed') {
    const shoulder = baseY + h - r * 1.3;
    path.moveTo(cx - r, baseY);
    path.lineTo(cx + r, baseY);
    path.lineTo(cx + r, shoulder);
    path.quadraticCurveTo(cx + r * 0.9, baseY + h - r * 0.2, cx, baseY + h);
    path.quadraticCurveTo(cx - r * 0.9, baseY + h - r * 0.2, cx - r, shoulder);
    path.closePath();
    return path;
  }
  const shoulder = baseY + h - r;
  path.moveTo(cx - r, baseY);
  path.lineTo(cx + r, baseY);
  path.lineTo(cx + r, shoulder);
  path.absarc(cx, shoulder, r, 0, Math.PI, false);
  path.lineTo(cx - r, baseY);
  path.closePath();
  return path;
}

/** Columna con basa y capitel. */
export function column(radius, height, material, { x = 0, y = 0, z = 0 } = {}) {
  const group = new Group();
  group.add(drum(radius, height, material, 14, 0, height / 2, 0));
  group.add(slab(radius * 2.6, radius * 0.6, radius * 2.6, material, 0, radius * 0.3, 0));
  group.add(slab(radius * 2.8, radius * 0.7, radius * 2.8, material, 0, height - radius * 0.35, 0));
  group.position.set(x, y, z);
  return group;
}

/** Escalinata de `steps` peldaños subiendo hacia -Z (frente). */
export function stairs(width, steps, stepHeight, stepDepth, material, { x = 0, y = 0, z = 0 } = {}) {
  const group = new Group();
  for (let i = 0; i < steps; i++) {
    const depth = (steps - i) * stepDepth;
    group.add(slab(width, stepHeight, depth, material, 0, stepHeight * (i + 0.5), -depth / 2));
  }
  group.position.set(x, y, z);
  return group;
}

/** Balaustrada a lo largo de X: postes + pasamanos. */
export function balustrade(length, material, { height = 1, spacing = 1.2, x = 0, y = 0, z = 0, thick = 0.12 } = {}) {
  const group = new Group();
  const count = Math.max(2, Math.round(length / spacing));
  const postGeometry = new CylinderGeometry(thick * 0.6, thick * 0.8, height, 8);
  for (let i = 0; i <= count; i++) {
    const post = shadowed(new Mesh(postGeometry, material));
    post.position.set(-length / 2 + (length * i) / count, height / 2, 0);
    group.add(post);
  }
  group.add(slab(length, thick, thick * 1.6, material, 0, height, 0));
  group.position.set(x, y, z);
  return group;
}

/** Ventana (vidrio oscuro) pegada a un muro; `kind` pointed/round/rect. */
export function windowPane(w, h, { kind = 'rect', x = 0, y = 0, z = 0, rotY = 0, frame = null } = {}) {
  const group = new Group();
  const shape = new Shape();
  if (kind === 'rect') {
    shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.closePath();
  } else {
    const p = archPath(0, w, h, kind, 0);
    shape.curves = p.curves;
  }
  const glass = shadowed(new Mesh(new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 8 }), MATS.glass), false, false);
  group.add(glass);
  if (frame) {
    const f = shadowed(new Mesh(new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 8 }), frame), false, false);
    f.scale.set(1.18, 1.1, 1);
    f.position.z = -0.05;
    group.add(f);
  }
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

/** Rosetón: disco con vitral procedural. */
export function roseWindow(radius, { x = 0, y = 0, z = 0, rotY = 0 } = {}) {
  const key = 'rose';
  let texture = textureCache.get(key);
  if (!texture) {
    const [canvas, ctx] = canvas2d(256);
    ctx.fillStyle = '#2b3a5a';
    ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.fill();
    const colors = ['#d94a3a', '#e8a020', '#3a8fd9', '#4fb067', '#c04fd9', '#f2e36b'];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.arc(128, 128, 118, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 6;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.moveTo(128, 128);
      ctx.lineTo(128 + Math.cos((i / 12) * Math.PI * 2) * 126, 128 + Math.sin((i / 12) * Math.PI * 2) * 126);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(128, 128, 40, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI * 2); ctx.stroke();
    texture = new CanvasTexture(canvas);
    textureCache.set(key, texture);
  }
  const mesh = new Mesh(new CircleGeometry(radius, 24), new MeshStandardMaterial({ map: texture, roughness: 0.4, emissive: 0x223355, emissiveIntensity: 0.25 }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  return mesh;
}

/** Cartel de madera con texto sobre dos postes. */
export function signBoard(text, { width = 3.2, height = 0.9, x = 0, y = 0, z = 0, rotY = 0, bg = '#3f2a18', fg = '#f6e7c8' } = {}) {
  const group = new Group();
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 144);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 74, 470);
  const texture = new CanvasTexture(canvas);
  const board = new Mesh(new PlaneGeometry(width, height), new MeshStandardMaterial({ map: texture, roughness: 0.8, side: DoubleSide }));
  board.position.y = 1.6 + height / 2;
  group.add(board);
  for (const px of [-width / 2 + 0.2, width / 2 - 0.2]) {
    group.add(drum(0.07, 1.6 + height, MATS.woodDark, 8, px, (1.6 + height) / 2, -0.05));
  }
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

/** Cerca de madera a lo largo de X. */
export function fence(length, { height = 1.1, x = 0, y = 0, z = 0, rotY = 0 } = {}) {
  const group = new Group();
  const count = Math.max(2, Math.round(length / 1.8));
  for (let i = 0; i <= count; i++) {
    group.add(slab(0.12, height, 0.12, MATS.woodDark, -length / 2 + (length * i) / count, height / 2, 0));
  }
  group.add(slab(length, 0.08, 0.06, MATS.wood, 0, height * 0.55, 0));
  group.add(slab(length, 0.08, 0.06, MATS.wood, 0, height * 0.92, 0));
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

// ---- naturaleza ------------------------------------------------------------

/**
 * "Piel" que sigue el terreno local (nieve, azufre, ceniza): disco de radio
 * irregular cuyos vértices se apoyan en ctx.groundAt + lift.
 */
export function terrainSkin(ctx, radius, material, { lift = 0.18, rings = 10, spokes = 40, wobble = 0.35, cx = 0, cz = 0, seed = 1 } = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  positions.push(cx, ctx.groundAt(cx, cz) + lift, cz);
  uvs.push(0.5, 0.5);
  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    for (let s = 0; s < spokes; s++) {
      const a = (s / spokes) * Math.PI * 2;
      const noise = 1 + wobble * fbm2(Math.cos(a) * 1.7 + seed * 13, Math.sin(a) * 1.7 - seed * 7, 2) * t;
      const d = radius * t * noise;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      positions.push(x, ctx.groundAt(x, z) + lift * (1 - t * 0.6), z);
      uvs.push(0.5 + Math.cos(a) * t * 0.5, 0.5 + Math.sin(a) * t * 0.5);
    }
  }
  const idx = (r, s) => (r === 0 ? 0 : 1 + (r - 1) * spokes + (s % spokes));
  for (let s = 0; s < spokes; s++) indices.push(0, idx(1, s), idx(1, s + 1));
  for (let r = 1; r < rings; r++) {
    for (let s = 0; s < spokes; s++) {
      const a = idx(r, s), b = idx(r, s + 1), c = idx(r + 1, s), d = idx(r + 1, s + 1);
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Borde de cráter: anillo de rocas irregulares apoyado en el terreno. */
export function craterRim(ctx, radius, { count = 22, size = 1.4, material = MATS.rockDark, cx = 0, cz = 0 } = {}) {
  const group = new Group();
  const geometry = new SphereGeometry(1, 8, 6);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.sin(i * 3.3) * 0.1;
    const d = radius * (0.92 + 0.16 * Math.sin(i * 2.7));
    const x = cx + Math.cos(a) * d;
    const z = cz + Math.sin(a) * d;
    const s = size * (0.7 + 0.6 * Math.abs(Math.sin(i * 1.9)));
    const rock = shadowed(new Mesh(geometry, material));
    rock.scale.set(s * 1.3, s * 0.8, s);
    rock.rotation.y = a;
    rock.position.set(x, ctx.groundAt(x, z) + s * 0.25, z);
    group.add(rock);
  }
  return group;
}

/** Espejo de agua circular animado (laguna cratérica, termal, etc.). */
export function waterDisc(radius, { color = 0x2a8f8f, opacity = 0.88, x = 0, y = 0, z = 0, normalScale = 0.18, flow = new Vector2(0.006, 0.004) } = {}) {
  const material = makeSimpleWaterMaterial(getWaterNormalTexture(), { color, opacity, flow, normalScale });
  registerWaterMaterial(material);
  const geometry = new CircleGeometry(radius, 40);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * radius / 7, uv.getY(i) * radius / 7);
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  return mesh;
}

/** Vapor/humo: sprites que ascienden y se desvanecen. Devuelve { group, tick }. */
export function steam(count, { radius = 1.5, rise = 6, size = 2.5, color = 0xffffff, opacity = 0.35, speed = 0.35, drift = 0.4, x = 0, y = 0, z = 0, additive = false } = {}) {
  const group = new Group();
  const texture = makeSoftParticleTexture(64);
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const material = new SpriteMaterial({ map: texture, color, transparent: true, opacity, depthWrite: false });
    if (additive) material.blending = AdditiveBlending;
    const sprite = new Sprite(material);
    sprite.userData = {
      ox: (Math.random() - 0.5) * radius * 2,
      oz: (Math.random() - 0.5) * radius * 2,
      phase: Math.random(),
      size: size * (0.7 + Math.random() * 0.6),
    };
    group.add(sprite);
    sprites.push(sprite);
  }
  group.position.set(x, y, z);
  let time = Math.random() * 10;
  const tick = (dt) => {
    time += dt;
    for (const s of sprites) {
      const u = s.userData;
      const t = (time * speed + u.phase) % 1;
      const grow = 1 + t * 1.6;
      s.position.set(u.ox + Math.sin(time * 0.6 + u.phase * 9) * drift * t, t * rise, u.oz + Math.cos(time * 0.5 + u.phase * 7) * drift * t);
      s.scale.set(u.size * grow, u.size * grow, 1);
      s.material.opacity = opacity * Math.min(1, t * 5) * (1 - t);
    }
  };
  return { group, tick };
}

/** Frailejón de páramo: tallo con hojas secas y roseta plateada. */
export function frailejon(height = 1.6, { x = 0, y = 0, z = 0 } = {}) {
  const group = new Group();
  group.add(drum(0.09, height, stdMat(0x6b5236, { roughness: 1 }), 7, 0, height / 2, 0));
  // hojas secas colgando
  const dead = new Mesh(new ConeGeometry(0.28, height * 0.55, 8, 1, true), stdMat(0x8d7a55, { roughness: 1, side: DoubleSide }));
  dead.position.y = height * 0.62;
  group.add(dead);
  // roseta
  const rosette = shadowed(new Mesh(new SphereGeometry(0.34, 10, 7), stdMat(0xa7b98c, { roughness: 0.95 })));
  rosette.scale.set(1, 0.55, 1);
  rosette.position.y = height + 0.1;
  group.add(rosette);
  for (let i = 0; i < 7; i++) {
    const leaf = shadowed(new Mesh(new ConeGeometry(0.07, 0.5, 5), stdMat(0xb9c9a2, { roughness: 0.95 })), false, false);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.22, height + 0.32, Math.sin(a) * 0.22);
    leaf.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    group.add(leaf);
  }
  const flower = new Mesh(new SphereGeometry(0.09, 6, 5), new MeshBasicMaterial({ color: 0xf2c94c }));
  flower.position.y = height + 0.55;
  group.add(flower);
  group.position.set(x, y, z);
  group.rotation.y = Math.random() * Math.PI * 2;
  return group;
}

/** Barca de madera (lancha de La Cocha) con toldo opcional. */
export function boat(length = 3.2, { color = 0x2f6fb3, roof = true, x = 0, y = 0, z = 0, rotY = 0 } = {}) {
  const group = new Group();
  const shape = new Shape();
  const hw = length * 0.18;
  shape.moveTo(-length / 2, 0);
  shape.quadraticCurveTo(-length * 0.2, hw * 1.15, length * 0.2, hw);
  shape.quadraticCurveTo(length * 0.42, hw * 0.6, length / 2, 0);
  shape.quadraticCurveTo(length * 0.42, -hw * 0.6, length * 0.2, -hw);
  shape.quadraticCurveTo(-length * 0.2, -hw * 1.15, -length / 2, 0);
  const hull = shadowed(new Mesh(new ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false, curveSegments: 8 }), stdMat(color, { roughness: 0.7 })));
  hull.rotation.x = -Math.PI / 2;
  hull.position.y = 0.05;
  group.add(hull);
  const inner = shadowed(new Mesh(new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 8 }), MATS.wood), false, false);
  inner.scale.set(0.82, 0.7, 1);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.5;
  group.add(inner);
  if (roof) {
    for (const px of [-length * 0.22, length * 0.22]) {
      group.add(drum(0.04, 1.2, MATS.woodDark, 6, px, 1.1, hw * 0.55), drum(0.04, 1.2, MATS.woodDark, 6, px, 1.1, -hw * 0.55));
    }
    const canopy = slab(length * 0.6, 0.06, hw * 1.5, stdMat(0xf1e6c9, { roughness: 0.9 }), 0, 1.72, 0);
    group.add(canopy);
  }
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

/** Muelle de madera a lo largo de -Z (entra al agua), con pilotes. */
export function pier(length, width, { deckY = 0.5, pileDepth = 4, x = 0, y = 0, z = 0, rotY = 0 } = {}) {
  const group = new Group();
  group.add(slab(width, 0.14, length, MATS.wood, 0, deckY, -length / 2));
  const count = Math.max(2, Math.round(length / 2.4));
  for (let i = 0; i <= count; i++) {
    const pz = -(length * i) / count;
    for (const px of [-width / 2 + 0.15, width / 2 - 0.15]) {
      group.add(drum(0.09, pileDepth, MATS.woodDark, 7, px, deckY - pileDepth / 2 + 0.3, pz));
    }
  }
  const rail = balustrade(length, MATS.woodDark, { height: 0.9, spacing: 1.2, thick: 0.08 });
  rail.rotation.y = Math.PI / 2;
  rail.position.set(width / 2 - 0.1, deckY, -length / 2);
  group.add(rail);
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

/** Árbol de copa esférica múltiple (para bosques dentro de la maqueta). */
export function leafyTree(height = 5, { trunk = 0x5c3f2a, leaves = 0x2f6b34, x = 0, y = 0, z = 0 } = {}) {
  const group = new Group();
  group.add(drum(0.16 * height / 5, height * 0.45, stdMat(trunk, { roughness: 1 }), 7, 0, height * 0.225, 0));
  const blobs = [[0, height * 0.62, 0, 0.36], [0.35, height * 0.72, 0.2, 0.28], [-0.32, height * 0.7, -0.15, 0.26], [0.05, height * 0.86, -0.25, 0.24]];
  for (const [bx, by, bz, r] of blobs) {
    const blob = shadowed(new Mesh(new SphereGeometry(r * height, 9, 7), stdMat(leaves, { roughness: 0.95 })));
    blob.position.set(bx * height / 5, by, bz * height / 5);
    group.add(blob);
  }
  group.position.set(x, y, z);
  group.rotation.y = Math.random() * Math.PI * 2;
  return group;
}

/** Palmera. */
export function palm(height = 5, { x = 0, y = 0, z = 0, lean = 0.12 } = {}) {
  const group = new Group();
  const trunk = drum(0.16, height, stdMat(0x7a5a3a, { roughness: 1 }), 7, 0, height / 2, 0);
  trunk.rotation.z = lean;
  group.add(trunk);
  const topX = Math.sin(lean) * height;
  for (let i = 0; i < 7; i++) {
    const frond = shadowed(new Mesh(new ConeGeometry(0.3, 2.2, 5), stdMat(0x3f8a3a, { roughness: 0.9 })));
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(topX + Math.cos(a) * 0.6, height + 0.2, Math.sin(a) * 0.6);
    frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    group.add(frond);
  }
  for (let i = 0; i < 3; i++) {
    const coco = new Mesh(new SphereGeometry(0.16, 6, 5), stdMat(0x4b3520, { roughness: 1 }));
    coco.position.set(topX + Math.cos(i * 2.1) * 0.25, height - 0.15, Math.sin(i * 2.1) * 0.25);
    group.add(coco);
  }
  group.position.set(x, y, z);
  group.rotation.y = Math.random() * Math.PI * 2;
  return group;
}

/** Roca irregular (esfera deformada). */
export function boulder(size, material = MATS.rock, { x = 0, y = 0, z = 0, sy = 0.7 } = {}) {
  const mesh = shadowed(new Mesh(new SphereGeometry(size, 9, 7), material));
  mesh.scale.set(1 + Math.random() * 0.4, sy, 1 + Math.random() * 0.3);
  mesh.rotation.y = Math.random() * Math.PI;
  mesh.position.set(x, y + size * sy * 0.5, z);
  return mesh;
}

/** Farola colonial. */
export function lamppost({ x = 0, y = 0, z = 0, height = 3 } = {}) {
  const group = new Group();
  group.add(drum(0.07, height, MATS.metal, 8, 0, height / 2, 0));
  group.add(slab(0.32, 0.4, 0.32, MATS.metal, 0, height + 0.15, 0));
  const bulb = new Mesh(new BoxGeometry(0.22, 0.28, 0.22), new MeshBasicMaterial({ color: 0xfff1c0 }));
  bulb.position.y = height + 0.15;
  group.add(bulb);
  group.add(spire(0.24, 0.3, MATS.metal, 4, 0, height + 0.35, 0));
  group.position.set(x, y, z);
  return group;
}

/** Banco de plaza. */
export function bench({ x = 0, y = 0, z = 0, rotY = 0 } = {}) {
  const group = new Group();
  group.add(slab(1.6, 0.08, 0.45, MATS.wood, 0, 0.48, 0));
  group.add(slab(1.6, 0.4, 0.06, MATS.wood, 0, 0.78, -0.22));
  for (const px of [-0.65, 0.65]) group.add(slab(0.08, 0.48, 0.45, MATS.metal, px, 0.24, 0));
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

export const deg = MathUtils.degToRad;
export { PALETTE };
