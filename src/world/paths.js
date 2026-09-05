// Plaza central, senderos radiales hacia cada sitio (cintas que siguen el
// relieve: suben en rampa hasta la terraza de cada sitio y, en los volcanes,
// continúan como sendero de tierra por la ladera) y los "props" decorativos que
// los bordean (árboles, pinos, rocas, farolas, bancos...). También construye el
// cartel de bienvenida "¡Esto es Nariño!".
import {
  Group,
  Mesh,
  RingGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  DoubleSide,
  Vector2,
  RepeatWrapping,
  CanvasTexture,
} from 'three';
import { box, cyl, cone, sphere, block, PALETTE } from './primitives.js';
import { SITES, sitePathEnd } from './sitesData.js';
import { PLAZA, RING_ROAD_RADIUS } from './worldLayout.js';
import { ribbonMesh } from './ribbon.js';
import { heightAt, isWaterAt, slopeAt } from '../environment/terrainMath.js';
import { getNoiseTexture } from '../environment/proceduralTextures.js';

const PLAZA_INNER = PLAZA.innerRadius;
const PLAZA_RADIUS = PLAZA.outerRadius;
const PATH_START = PLAZA.pathStart;
const PATH_WIDTH = PLAZA.pathWidth;
const TRAIL_WIDTH = 2.4;
// Altura de la cinta sobre el terreno (las vías van a .05; el sendero queda debajo en los cruces).
const PATH_LIFT = 0.04;

// Configuración de props por sitio: tipos, ambos lados e inset lateral.
const SITE_PROP_CONFIG = {
  lajas: { props: ['lamppost', 'bench'], bothSides: true, propInset: 2.6 },
  cocha: { props: ['pine', 'tree', 'rock'] },
  galeras: { props: ['pine', 'rock'] },
  cumbal: { props: ['pine', 'rock'] },
  chiles: { props: ['pine', 'rock'] },
  azufral: { props: ['rock', 'pine'] },
  catedral: { props: ['lamppost', 'tree'], bothSides: true },
  planada: { props: ['tree', 'pine', 'tree'] },
  morro: { props: ['palm', 'rock'] },
  sandona: { props: ['tree', 'bench'] },
};

// Radio de colisión de cada tipo de prop (0 = sin colisión).
const PROP_RADIUS = {
  tree: .8,
  pine: .7,
  palm: .45,
  rock: .7,
  lamppost: .25,
  boat: 0,
  reed: 0,
  bench: .7,
  house: 2,
  hatStand: .4,
};

// Construye plaza, cartel y un sendero por sitio. Devuelve el grupo y los colisionadores.
export function buildPaths(scene, sites = SITES) {
  const root = new Group();
  root.name = 'paths';
  const colliders = [];
  addPlaza(root);
  addWelcomeSign(root);
  const pavementTexture = makePavementTexture();
  const trailMaterial = makeTrailMaterial();
  for (const site of sites) {
    const config = SITE_PROP_CONFIG[site.id] || { props: ['tree', 'rock'] };
    const direction = new Vector2(site.position.x, site.position.z);
    const distance = direction.length();
    direction.normalize();
    const end = sitePathEnd(site);
    if (end - PATH_START <= 2) continue;
    const cone = site.terrain?.cone;
    const coneStart = cone ? Math.min(end, distance - cone.radius) : end;
    // Tramo pavimentado (de la plaza al pie del sitio o del cono).
    addRibbon(root, direction, PATH_START, coneStart, PATH_WIDTH, makePathMaterial(pavementTexture, coneStart - PATH_START));
    // Tramo de sendero de tierra que sube el volcán.
    if (cone && end > coneStart + 2) addRibbon(root, direction, coneStart - 1, end, TRAIL_WIDTH, trailMaterial);
    addPropsAlongPath(root, config, direction, PATH_START, coneStart, colliders);
    if (cone) addPropsAlongPath(root, { props: ['rock'], propInset: TRAIL_WIDTH / 2 + 1.2, spacing: 9 }, direction, coneStart, end, colliders);
  }
  scene.add(root);
  return { root, colliders };
}

// Anillo pavimentado de la plaza central.
function addPlaza(parent) {
  const texture = makePavementTexture('#e6e8ec');
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(PLAZA_RADIUS, PLAZA_RADIUS);
  const ring = new Mesh(
    new RingGeometry(PLAZA_INNER, PLAZA_RADIUS, 48),
    new MeshStandardMaterial({ map: texture, color: 15922165, roughness: .95 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .05;
  ring.receiveShadow = true;
  parent.add(ring);
}

// Material del pavimento de un sendero de longitud dada (repite la baldosa cada ~1.6 m).
function makePathMaterial(baseTexture, length) {
  const texture = baseTexture.clone();
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // ribbonGeometry da v en unidades de 3 m: 1.8 repeticiones por unidad ≈ una baldosa cada 1.6 m.
  texture.repeat.set(2, 1.8);
  return new MeshStandardMaterial({ map: texture, color: 15922165, roughness: .95 });
}

// Material de sendero de tierra para las laderas volcánicas.
function makeTrailMaterial() {
  const texture = getNoiseTexture(256).clone();
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1.2);
  return new MeshStandardMaterial({ map: texture, color: 0xb59470, roughness: 1 });
}

// Cinta que sigue el terreno entre dos distancias radiales (a lo largo de `direction`).
function addRibbon(parent, direction, from, to, width, material) {
  const points = [];
  const steps = Math.max(4, Math.ceil((to - from) / 2.5));
  for (let i = 0; i <= steps; i++) {
    const along = from + (to - from) * i / steps;
    const x = direction.x * along;
    const z = direction.y * along;
    points.push({ x, y: heightAt(x, z) + PATH_LIFT, z });
  }
  const mesh = ribbonMesh(points, width, material, steps);
  mesh.receiveShadow = true;
  mesh.name = 'path';
  parent.add(mesh);
}

// Props repartidos a lo largo del sendero, alternando lado (o ambos lados).
function addPropsAlongPath(parent, config, direction, from, to, colliders) {
  const side = new Vector2(direction.y, -direction.x);
  const spacing = config.spacing || 11;
  const count = Math.max(2, Math.round((to - from) / spacing));
  const inset = config.propInset ?? PATH_WIDTH / 2 + 1.4;
  for (let i = 0; i < count; i++) {
    const t = (i + .5) / count;
    const along = from + t * (to - from);
    // deja libre la circunvalar y su acera
    if (Math.abs(along - RING_ROAD_RADIUS) < 6) continue;
    const kind = config.props[i % config.props.length];
    const sides = config.bothSides ? [1, -1] : [i % 2 === 0 ? 1 : -1];
    for (const sign of sides) {
      const x = direction.x * along + side.x * inset * sign;
      const z = direction.y * along + side.y * inset * sign;
      placeProp(parent, kind, x, z, colliders);
    }
  }
}

// Coloca un prop apoyado en el terreno (si no hay agua ni pendiente fuerte) y registra su colisión.
function placeProp(parent, kind, x, z, colliders) {
  if (isWaterAt(x, z) || slopeAt(x, z) > 0.75) return;
  const prop = buildProp(kind);
  prop.position.set(x, heightAt(x, z), z);
  prop.rotation.y = Math.random() * Math.PI * 2;
  parent.add(prop);
  const radius = PROP_RADIUS[kind] ?? 0;
  if (radius > 0) colliders.push({ x, z, r: radius });
}

// Fábrica de props por tipo.
export function buildProp(kind) {
  switch (kind) {
    case 'lamppost':
      return buildLamppost();
    case 'boat':
      return buildBoat();
    case 'reed':
      return buildReed();
    case 'pine':
      return buildPine();
    case 'rock':
      return buildRock();
    case 'bench':
      return buildBench();
    case 'palm':
      return buildPalm();
    case 'house':
      return buildHouse();
    case 'hatStand':
      return buildHatStand();
    case 'tree':
    default:
      return buildTree();
  }
}

// Árbol frondoso: tronco y dos esferas de copa.
function buildTree() {
  const group = new Group();
  const trunk = cyl(.18, .22, 1.2, PALETTE.rockBrown, { seg: 8 });
  trunk.position.y = .6;
  group.add(trunk);
  const canopy = sphere(.95, PALETTE.green, { seg: 10 });
  canopy.position.y = 1.7;
  group.add(canopy);
  const canopyDark = sphere(.7, PALETTE.greenDark, { seg: 10 });
  canopyDark.position.set(.3, 2.2, .2);
  group.add(canopyDark);
  return group;
}

// Pino: tronco y tres conos.
function buildPine() {
  const group = new Group();
  const trunk = cyl(.16, .2, .8, PALETTE.rockBrown, { seg: 8 });
  trunk.position.y = .4;
  group.add(trunk);
  for (let tier = 0; tier < 3; tier++) {
    const canopy = cone(1 - tier * .25, 1, PALETTE.greenDark, { seg: 10 });
    canopy.position.y = 1 + tier * .7;
    group.add(canopy);
  }
  return group;
}

// Palmera pequeña con cinco hojas y un coco.
function buildPalm() {
  const group = new Group();
  const trunk = cyl(.15, .2, 2, PALETTE.rockBrown, { seg: 8 });
  trunk.position.y = 1;
  trunk.rotation.z = .1;
  group.add(trunk);
  for (let i = 0; i < 5; i++) {
    const frond = cone(.28, 1.2, PALETTE.green, { seg: 6 });
    frond.position.y = 2.1;
    frond.rotation.z = Math.cos(i / 5 * Math.PI * 2) * 1;
    frond.rotation.x = Math.sin(i / 5 * Math.PI * 2) * 1;
    group.add(frond);
  }
  const coconut = sphere(.18, PALETTE.rockBrown, { seg: 6 });
  coconut.position.y = 2;
  group.add(coconut);
  return group;
}

// Roca: esfera aplastada grande y otra pequeña.
function buildRock() {
  const group = new Group();
  const boulder = sphere(.7 + Math.random() * .4, PALETTE.rockGray, { seg: 8 });
  boulder.scale.y = .65;
  boulder.position.y = .3;
  group.add(boulder);
  const pebble = sphere(.4, PALETTE.stoneDark, { seg: 8 });
  pebble.scale.y = .7;
  pebble.position.set(.6, .2, .3);
  group.add(pebble);
  return group;
}

// Farola: poste, brazo y bombilla luminosa (material básico).
function buildLamppost() {
  const group = new Group();
  const pole = cyl(.08, .1, 2.2, 3356477, { seg: 8 });
  pole.position.y = 1.1;
  group.add(pole);
  const arm = box(.5, .08, .08, 3356477);
  arm.position.set(0, 2.2, 0);
  group.add(arm);
  const bulb = new Mesh(sphere(.22, PALETTE.gold).geometry, new MeshBasicMaterial({ color: 16773296 }));
  bulb.position.y = 2.3;
  group.add(bulb);
  return group;
}

// Barca: casco rojo, interior de madera y mástil.
function buildBoat() {
  const group = new Group();
  const hull = box(2, .5, .9, PALETTE.redRoof);
  hull.position.y = .3;
  group.add(hull);
  const deck = box(1.5, .3, .55, 7027242);
  deck.position.y = .5;
  group.add(deck);
  const mast = cyl(.05, .05, 1.2, PALETTE.rockBrown, { seg: 6 });
  mast.position.set(0, 1, 0);
  group.add(mast);
  return group;
}

// Juncos: cinco tallos finos ligeramente inclinados.
function buildReed() {
  const group = new Group();
  for (let i = 0; i < 5; i++) {
    const stem = cyl(.04, .05, 1 + Math.random() * .5, PALETTE.greenDark, { seg: 5 });
    stem.position.set((Math.random() - .5) * .6, .6, (Math.random() - .5) * .6);
    stem.rotation.z = (Math.random() - .5) * .3;
    group.add(stem);
  }
  return group;
}

// Banco: tabla y dos patas.
function buildBench() {
  const group = new Group();
  const seat = box(1.4, .12, .5, PALETTE.rockBrown);
  seat.position.y = .5;
  group.add(seat);
  for (const x of [-.55, .55]) {
    const leg = box(.12, .5, .5, PALETTE.stoneDark);
    leg.position.set(x, .25, 0);
    group.add(leg);
  }
  return group;
}

// Casa blanca con tejado rojo a cuatro aguas.
function buildHouse() {
  const group = new Group();
  const walls = block(3.2, 2.8, 3.2, PALETTE.white, { studs: false });
  walls.position.y = 1.4;
  group.add(walls);
  const roof = cone(2.7, 2, PALETTE.redRoof, { seg: 4 });
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.8;
  group.add(roof);
  return group;
}

// Expositor de sombrero de paja toquilla: poste, ala y copa.
function buildHatStand() {
  const group = new Group();
  const pole = cyl(.08, .1, 1.6, PALETTE.rockBrown, { seg: 8 });
  pole.position.y = .8;
  group.add(pole);
  const brim = cyl(.7, .7, .12, PALETTE.sand, { seg: 16 });
  brim.position.y = 1.6;
  group.add(brim);
  const crown = cyl(.36, .4, .5, PALETTE.sand, { seg: 14 });
  crown.position.y = 1.85;
  group.add(crown);
  return group;
}

// Cartel de bienvenida en el borde de la plaza, mirando hacia el centro.
function addWelcomeSign(parent) {
  const sign = new Group();
  for (const x of [-2, 2]) {
    const post = cyl(.12, .14, 3.4, PALETTE.rockBrown, { seg: 8 });
    post.position.set(x, 1.7, 0);
    sign.add(post);
  }
  const board = new Mesh(
    new PlaneGeometry(5.2, 1.4),
    new MeshBasicMaterial({ map: makeSignTexture(), transparent: true, side: DoubleSide }),
  );
  board.position.set(0, 3, 0);
  sign.add(board);
  sign.position.set(0, 0, PLAZA_RADIUS - 1);
  sign.rotation.y = Math.PI;
  parent.add(sign);
}

// Textura de pavimento: baldosa clara con un círculo sombreado y borde sutil.
export function makePavementTexture(color = '#eef0f3') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  const gradient = ctx.createRadialGradient(128 / 2 - 8, 128 / 2 - 8, 6, 128 / 2, 128 / 2, 34);
  gradient.addColorStop(0, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(128 / 2, 128 / 2, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 126, 126);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

// Textura del cartel "¡Esto es Nariño!".
function makeSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  roundRect(ctx, 8, 8, 1008, 240, 28);
  ctx.fillStyle = '#1a5276';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#e8a020';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¡Esto es Nariño!', 512, 128);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// Traza un rectángulo con esquinas redondeadas en el contexto 2D.
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
