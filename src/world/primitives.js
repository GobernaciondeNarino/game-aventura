// Primitivas geométricas compartidas por todo el mundo (cajas, cilindros, conos,
// esferas, toros, discos) con cachés de materiales a nivel de módulo para no crear
// un material por malla. Estilo "bloques de juguete": `block` añade tetones (studs)
// sobre cada caja. Todos los módulos del mundo dependen de estos helpers.
import {
  Mesh,
  Group,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  SphereGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
} from 'three';

// Cachés de materiales: clave → material compartido.
const standardMaterialCache = new Map();
const basicMaterialCache = new Map();

// Material plano (sin iluminación) cacheado por color.
export function basicMat(color) {
  let material = basicMaterialCache.get(color);
  if (!material) {
    material = new MeshBasicMaterial({ color });
    basicMaterialCache.set(color, material);
  }
  return material;
}

// Caja con material plano y sin sombras.
export function basicBox(width, height, depth, color) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), basicMat(color));
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// Geometría compartida de los tetones y su distribución.
const STUD_GEOMETRY = new CylinderGeometry(.16, .16, .13, 8);
const STUD_SPACING = .9;
const MAX_STUDS = 6;

// Material estándar cacheado por color + opciones (roughness, metalness, opacity, side).
export function stdMat(color, opts = {}) {
  const key = `${color}|${opts.roughness ?? ''}|${opts.metalness ?? ''}|${opts.opacity ?? ''}|${opts.side ?? ''}`;
  let material = standardMaterialCache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? .75,
      metalness: opts.metalness ?? 0,
      transparent: opts.opacity != null,
      opacity: opts.opacity ?? 1,
    });
    if (opts.side !== undefined) material.side = opts.side;
    standardMaterialCache.set(key, material);
  }
  return material;
}

// Activa/desactiva sombras según `opts.shadow` (por defecto activadas).
export function applyShadow(mesh, opts) {
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  return mesh;
}

// Caja con material estándar.
export function box(width, height, depth, color, opts = {}) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), stdMat(color, opts));
  return applyShadow(mesh, opts);
}

// Cilindro (radio superior, radio inferior, altura).
export function cyl(radiusTop, radiusBottom, height, color, opts = {}) {
  const mesh = new Mesh(new CylinderGeometry(radiusTop, radiusBottom, height, opts.seg ?? 16), stdMat(color, opts));
  return applyShadow(mesh, opts);
}

// Cono.
export function cone(radius, height, color, opts = {}) {
  const mesh = new Mesh(new ConeGeometry(radius, height, opts.seg ?? 16), stdMat(color, opts));
  return applyShadow(mesh, opts);
}

// Esfera.
export function sphere(radius, color, opts = {}) {
  const mesh = new Mesh(new SphereGeometry(radius, opts.seg ?? 16, opts.seg2 ?? 12), stdMat(color, opts));
  return applyShadow(mesh, opts);
}

// Toro (anillo).
export function torus(radius, tube, color, opts = {}) {
  const mesh = new Mesh(
    new TorusGeometry(radius, tube, opts.radial ?? 10, opts.tubular ?? 24, opts.arc ?? Math.PI * 2),
    stdMat(color, opts),
  );
  return applyShadow(mesh, opts);
}

// Disco plano (cilindro muy bajo) con acabado brillante; solo recibe sombras.
export function disc(radius, color, opts = {}) {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, .12, opts.seg ?? 28),
    stdMat(color, {
      roughness: opts.roughness ?? .25,
      metalness: opts.metalness ?? .3,
      opacity: opts.opacity,
    }),
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// Rejilla de tetones sobre un área width × depth a la altura `y`.
export function studs(width, depth, y, color, opts = {}) {
  const group = new Group();
  const material = stdMat(color, opts);
  const countX = Math.min(MAX_STUDS, Math.max(1, Math.floor(width / STUD_SPACING)));
  const countZ = Math.min(MAX_STUDS, Math.max(1, Math.floor(depth / STUD_SPACING)));
  const startX = -((countX - 1) * STUD_SPACING) / 2;
  const startZ = -((countZ - 1) * STUD_SPACING) / 2;
  for (let ix = 0; ix < countX; ix++) {
    for (let iz = 0; iz < countZ; iz++) {
      const stud = new Mesh(STUD_GEOMETRY, material);
      stud.castShadow = true;
      stud.position.set(startX + ix * STUD_SPACING, y + .06, startZ + iz * STUD_SPACING);
      group.add(stud);
    }
  }
  return group;
}

// Bloque de juguete: caja + tetones encima (salvo `opts.studs === false`).
export function block(width, height, depth, color, opts = {}) {
  const group = new Group();
  group.add(box(width, height, depth, color, opts));
  if (opts.studs !== false) group.add(studs(width, depth, height / 2, color, opts));
  return group;
}

// Paleta de colores del mundo (enteros RGB).
export const PALETTE = {
  stone: 12564904,
  stoneDark: 9209464,
  cream: 15393743,
  white: 15987694,
  rockBrown: 7232071,
  rockGray: 8224130,
  snow: 16054527,
  green: 4165434,
  greenDark: 2911017,
  waterBlue: 3112885,
  sea: 2787012,
  redRoof: 11880495,
  gold: 15245344,
  ninoBlue: 1725046,
  sand: 15126427,
  smoke: 10132122,
};
