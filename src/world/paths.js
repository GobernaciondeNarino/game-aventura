// Plaza central, senderos radiales hacia cada sitio y los "props" decorativos
// que los bordean (árboles, pinos, rocas, farolas, barcas, bancos, casas...).
// También construye el cartel de bienvenida "¡Esto es Nariño!".
import {
  Group,
  Mesh,
  RingGeometry,
  BoxGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  DoubleSide,
  Vector2,
  RepeatWrapping,
  CanvasTexture,
} from 'three';
import { box, cyl, cone, sphere, block, PALETTE } from './primitives.js';
import { SITES } from './sitesData.js';

const PLAZA_INNER = 17;
const PLAZA_RADIUS = 24;
const PATH_START = 23;
const PATH_WIDTH = 3.2;

// Configuración de props por sitio: tipos, cantidad, ambos lados, canales de agua e inset.
const SITE_PROP_CONFIG = {
  lajas: { props: ['lamppost'], count: 7, bothSides: true, water: true, propInset: 2.8 },
  cocha: { props: ['boat', 'reed'], count: 6, water: true, propInset: 7.6 },
  galeras: { props: ['pine', 'rock'], count: 7 },
  cumbal: { props: ['pine', 'rock'], count: 7 },
  chiles: { props: ['pine', 'rock'], count: 7 },
  azufral: { props: ['rock', 'pine'], count: 6 },
  catedral: { props: ['lamppost', 'bench'], count: 7, bothSides: true },
  planada: { props: ['tree', 'pine', 'tree'], count: 9 },
  morro: { props: ['palm', 'boat'], count: 6 },
  sandona: { props: ['house', 'hatStand'], count: 6 },
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
  for (const site of sites) {
    const config = SITE_PROP_CONFIG[site.id] || { props: ['tree', 'rock'], count: 5 };
    const direction = new Vector2(site.position.x, site.position.z);
    const distance = direction.length();
    direction.normalize();
    const pathLength = distance - (site.solidRadius || 8) - 1 - PATH_START;
    if (pathLength <= 2) continue;
    addPath(root, direction, pathLength, pavementTexture);
    if (config.water) addCanals(root, direction, pathLength, colliders);
    addPropsAlongPath(root, config, direction, pathLength, colliders);
    addPropsAroundSite(root, site, config, colliders);
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

// Sendero recto desde la plaza hacia un sitio (direction es un Vector2 unitario x/z).
function addPath(parent, direction, length, baseTexture) {
  const texture = baseTexture.clone();
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, Math.max(2, Math.round(length / 2)));
  const path = new Mesh(
    new BoxGeometry(PATH_WIDTH, .16, length),
    new MeshStandardMaterial({ map: texture, color: 15922165, roughness: .95 }),
  );
  path.rotation.y = Math.atan2(direction.x, direction.y);
  const center = PATH_START + length / 2;
  path.position.set(direction.x * center, .08, direction.y * center);
  path.receiveShadow = true;
  parent.add(path);
}

// Canales de agua a ambos lados del sendero, con barandilla junto al camino.
function addCanals(parent, direction, length, colliders) {
  const side = new Vector2(direction.y, -direction.x);
  const center = PATH_START + length / 2;
  const angle = Math.atan2(direction.x, direction.y);
  for (const sign of [1, -1]) {
    const offset = PATH_WIDTH / 2 + 6;
    const water = new Mesh(
      new BoxGeometry(7, .3, length),
      new MeshStandardMaterial({
        color: PALETTE.waterBlue,
        roughness: .2,
        metalness: .3,
        transparent: true,
        opacity: .85,
      }),
    );
    water.rotation.y = angle;
    water.position.set(
      direction.x * center + side.x * offset * sign,
      -.02,
      direction.y * center + side.y * offset * sign,
    );
    parent.add(water);
    addCanalRail(parent, direction, side, length, (PATH_WIDTH / 2 + .2) * sign, colliders);
  }
}

// Barandilla: postes blancos (con colisión) y travesaño dorado.
function addCanalRail(parent, direction, side, length, offset, colliders) {
  const angle = Math.atan2(direction.x, direction.y);
  const postCount = Math.max(2, Math.floor(length / 3));
  for (let i = 0; i <= postCount; i++) {
    const along = PATH_START + length * i / postCount;
    const x = direction.x * along + side.x * offset;
    const z = direction.y * along + side.y * offset;
    const post = box(.16, 1, .16, PALETTE.white);
    post.position.set(x, .5, z);
    parent.add(post);
    colliders.push({ x, z, r: .3 });
  }
  const rail = box(.1, .12, length, PALETTE.gold);
  rail.rotation.y = angle;
  const center = PATH_START + length / 2;
  rail.position.set(direction.x * center + side.x * offset, .85, direction.y * center + side.y * offset);
  parent.add(rail);
}

// Props repartidos a lo largo del sendero, alternando lado (o ambos lados).
function addPropsAlongPath(parent, config, direction, length, colliders) {
  const side = new Vector2(direction.y, -direction.x);
  const count = config.count || 5;
  const inset = config.propInset ?? PATH_WIDTH / 2 + 1.4;
  for (let i = 0; i < count; i++) {
    const t = (i + .5) / count;
    const along = PATH_START + t * length;
    const kind = config.props[i % config.props.length];
    const sides = config.bothSides ? [1, -1] : [i % 2 === 0 ? 1 : -1];
    for (const sign of sides) {
      const x = direction.x * along + side.x * inset * sign;
      const z = direction.y * along + side.y * inset * sign;
      placeProp(parent, kind, x, z, colliders);
    }
  }
}

// Props en círculo alrededor del sitio, dejando libre el lado que mira a la plaza.
function addPropsAroundSite(parent, site, config, colliders) {
  const centerX = site.position.x;
  const centerZ = site.position.z;
  const baseRadius = (site.solidRadius || 8) + 3;
  const towardPlaza = Math.atan2(-centerX, -centerZ);
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2;
    if (Math.abs((angle - towardPlaza + Math.PI * 3) % (Math.PI * 2) - Math.PI) < .6) continue;
    const radius = baseRadius + i % 2 * 2;
    const x = centerX + Math.sin(angle) * radius;
    const z = centerZ + Math.cos(angle) * radius;
    const kind = config.props[i % config.props.length];
    if (kind === 'boat' || kind === 'reed') continue;
    placeProp(parent, kind, x, z, colliders);
  }
}

// Coloca un prop con rotación aleatoria y registra su colisión si procede.
function placeProp(parent, kind, x, z, colliders) {
  const prop = buildProp(kind);
  prop.position.set(x, 0, z);
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
