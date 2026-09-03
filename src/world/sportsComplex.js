// Complejo deportivo: pista de atletismo con cancha de fútbol 11, canchas de
// fútbol 5, baloncesto, voleibol y tejo, más caminos, arco de entrada,
// graderías, quioscos, lámparas y árboles. Devuelve colisionadores circulares,
// zonas de puntos y los datos que usa el sistema de balones (spawns, paredes
// de arcos y zonas de gol).
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  DoubleSide,
  CanvasTexture,
  RepeatWrapping,
} from 'three';
import { SPORT_ZONES } from './worldLayout.js';
import { box, cyl, sphere, block, basicMat, basicBox, PALETTE } from './primitives.js';
import { ribbonMesh } from './ribbon.js';

// Colores del complejo
const FIELD_GREEN = 7327603;
const TRACK_RED = 14707546;
const COURT_BLUE = 5939414;
const VOLLEY_SAND = 14860673;
const TEJO_CLAY = 14256714;
const NEON_CYAN = 58879;
const HOOP_ORANGE = 16736240;
const WHITE = 16777215;

// Material translúcido para las mallas de los arcos y la red de voleibol
function netMaterial() {
  return new MeshStandardMaterial({
    color: 16777215,
    transparent: true,
    opacity: .22,
    side: DoubleSide,
  });
}

// Losa base de una cancha
function fieldBase(width, depth, color, y = .06) {
  const base = box(width, .12, depth, color, { shadow: false });
  base.receiveShadow = true;
  base.position.y = y;
  return base;
}

// Línea de demarcación (caja plana sin sombras)
function fieldLine(width, depth, color = WHITE, x = 0, z = 0, y = .14) {
  const line = basicBox(width, .05, depth, color);
  line.position.set(x, y, z);
  return line;
}

// Arco de fútbol con postes, travesaño, malla y AABBs de pared
function buildGoal(width, height, depth, direction) {
  const group = new Group();
  const colliders = [];
  const walls = [];
  const halfWidth = width / 2;
  const backX = -direction * depth;

  for (const z of [-halfWidth, halfWidth]) {
    const post = cyl(.1, .1, height, WHITE, { seg: 8 });
    post.position.set(0, height / 2, z);
    group.add(post);
    colliders.push({ x: 0, z, r: .3 });
  }

  const crossbar = cyl(.1, .1, width, WHITE, { seg: 8 });
  crossbar.rotation.x = Math.PI / 2;
  crossbar.position.set(0, height, 0);
  group.add(crossbar);

  for (const z of [-halfWidth, halfWidth]) {
    const backPost = cyl(.07, .07, height * .8, WHITE, { seg: 6 });
    backPost.position.set(backX, height * .4, z);
    group.add(backPost);
  }

  const net = netMaterial();
  const backNet = new Mesh(new PlaneGeometry(width, height * .85), net);
  backNet.rotation.y = Math.PI / 2;
  backNet.position.set(backX, height * .42, 0);
  group.add(backNet);

  const topNet = new Mesh(new PlaneGeometry(depth, width), net);
  topNet.rotation.x = -Math.PI / 2;
  topNet.position.set(backX / 2, height * .9, 0);
  group.add(topNet);

  for (const z of [-halfWidth, halfWidth]) {
    const sideNet = new Mesh(new PlaneGeometry(depth, height * .85), net);
    sideNet.position.set(backX / 2, height * .42, z);
    group.add(sideNet);
  }

  walls.push({
    minX: backX - .18,
    maxX: backX + .18,
    minZ: -halfWidth - .1,
    maxZ: halfWidth + .1,
    minY: 0,
    maxY: height,
  });
  for (const z of [-halfWidth, halfWidth]) {
    walls.push({
      minX: Math.min(0, backX) - .1,
      maxX: Math.max(0, backX) + .1,
      minZ: z - .12,
      maxZ: z + .12,
      minY: 0,
      maxY: height,
    });
  }

  const zone = {
    minX: Math.min(0, backX),
    maxX: Math.max(0, backX),
    minZ: -halfWidth,
    maxZ: halfWidth,
    y: .6,
    yTol: 1.4,
  };

  return { group, colliders, walls, zone };
}

// Coloca un arco dentro de una cancha y traslada sus colisionadores
function placeGoal(parent, colliders, walls, goals, goal, x, z) {
  goal.group.position.set(x, 0, z);
  parent.add(goal.group);
  for (const collider of goal.colliders) {
    colliders.push({ x: x + collider.x, z: z + collider.z, r: collider.r });
  }
  for (const wall of goal.walls) {
    walls.push({
      minX: wall.minX + x,
      maxX: wall.maxX + x,
      minZ: wall.minZ + z,
      maxZ: wall.maxZ + z,
      minY: wall.minY,
      maxY: wall.maxY,
    });
  }
  if (goal.zone) {
    goals.push({
      minX: goal.zone.minX + x,
      maxX: goal.zone.maxX + x,
      minZ: goal.zone.minZ + z,
      maxZ: goal.zone.maxZ + z,
      y: goal.zone.y,
      yTol: goal.zone.yTol,
    });
  }
}

// Pista de atletismo ovalada con cancha de fútbol 11 en el centro
function buildAthletics() {
  const group = new Group();
  const colliders = [];
  const walls = [];
  const goals = [];

  const track = new Mesh(
    new RingGeometry(20, 27, 64),
    new MeshStandardMaterial({ color: TRACK_RED, roughness: .9, side: DoubleSide }),
  );
  track.rotation.x = -Math.PI / 2;
  track.scale.set(1.6, 1, 1);
  track.position.y = .04;
  track.receiveShadow = true;
  group.add(track);

  for (const radius of [22, 24.5]) {
    const lane = new Mesh(new RingGeometry(radius, radius + .12, 64), basicMat(WHITE));
    lane.rotation.x = -Math.PI / 2;
    lane.scale.set(1.6, 1, 1);
    lane.position.y = .16;
    group.add(lane);
  }

  group.add(fieldBase(54, 32, FIELD_GREEN));
  group.add(fieldLine(.2, 32, WHITE));
  group.add(fieldLine(54, .2, WHITE, 0, 16));
  group.add(fieldLine(54, .2, WHITE, 0, -16));
  placeGoal(group, colliders, walls, goals, buildGoal(7, 2.4, 2, 1), -26, 0);
  placeGoal(group, colliders, walls, goals, buildGoal(7, 2.4, 2, -1), 26, 0);

  return { group, colliders, walls, goals };
}

// Cancha de fútbol 5
function buildFutbol5() {
  const group = new Group();
  const colliders = [];
  const walls = [];
  const goals = [];

  group.add(fieldBase(24, 15, FIELD_GREEN));
  group.add(fieldLine(.16, 15, WHITE));
  group.add(fieldLine(24, .16, WHITE, 0, 7.5));
  group.add(fieldLine(24, .16, WHITE, 0, -7.5));
  placeGoal(group, colliders, walls, goals, buildGoal(4, 1.8, 1.4, 1), -11.5, 0);
  placeGoal(group, colliders, walls, goals, buildGoal(4, 1.8, 1.4, -1), 11.5, 0);

  return { group, colliders, walls, goals };
}

// Cancha de baloncesto con dos tableros y aros
function buildBasket() {
  const group = new Group();
  const colliders = [];
  const walls = [];
  const goals = [];

  group.add(fieldBase(28, 15, COURT_BLUE));
  group.add(fieldLine(.16, 15, WHITE));

  const centerCircle = new Mesh(new RingGeometry(1.8, 1.95, 24), basicMat(HOOP_ORANGE));
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = .15;
  group.add(centerCircle);

  for (const side of [-1, 1]) {
    const poleX = side * 13;
    const pole = cyl(.16, .2, 3.6, 5595248, { seg: 10 });
    pole.position.set(poleX, 1.8, 0);
    group.add(pole);

    const backboard = new Mesh(
      new PlaneGeometry(1.8, 1.2),
      new MeshStandardMaterial({ color: 15398655, transparent: true, opacity: .5, side: DoubleSide }),
    );
    backboard.rotation.y = Math.PI / 2;
    backboard.position.set(poleX - side * .4, 3, 0);
    group.add(backboard);

    const hoop = new Mesh(new RingGeometry(.34, .42, 18), basicMat(HOOP_ORANGE));
    hoop.rotation.x = -Math.PI / 2;
    hoop.position.set(poleX - side * .8, 2.6, 0);
    group.add(hoop);

    colliders.push({ x: poleX, z: 0, r: .5 });
    walls.push({
      minX: poleX - side * .4 - .1,
      maxX: poleX - side * .4 + .1,
      minZ: -.9,
      maxZ: .9,
      minY: 2.4,
      maxY: 3.6,
    });

    const hoopX = poleX - side * .8;
    goals.push({
      minX: hoopX - .4,
      maxX: hoopX + .4,
      minZ: -.4,
      maxZ: .4,
      y: 2.5,
      yTol: .6,
    });
  }

  return { group, colliders, walls, goals };
}

// Cancha de voleibol con red central
function buildVoley() {
  const group = new Group();
  const colliders = [];

  group.add(fieldBase(18, 9, VOLLEY_SAND));
  group.add(fieldLine(18, .14, WHITE, 0, 4.5));
  group.add(fieldLine(18, .14, WHITE, 0, -4.5));

  for (const side of [-1, 1]) {
    const poleZ = side * 4.8;
    const pole = cyl(.1, .12, 2.6, 5595248, { seg: 8 });
    pole.position.set(0, 1.3, poleZ);
    group.add(pole);
    colliders.push({ x: 0, z: poleZ, r: .3 });
  }

  const net = new Mesh(
    new PlaneGeometry(9.6, 1),
    new MeshStandardMaterial({ color: 16777215, transparent: true, opacity: .3, side: DoubleSide }),
  );
  net.rotation.y = Math.PI / 2;
  net.position.set(0, 2, 0);
  group.add(net);

  return { group, colliders, walls: [], goals: [] };
}

// Canchas de tejo techadas con tres pistas
function buildTejo() {
  const group = new Group();
  const colliders = [];

  group.add(fieldBase(24, 14, 10254925));

  const roof = box(24, .4, 14, PALETTE.redRoof, { shadow: true });
  roof.position.y = 4.2;
  group.add(roof);

  for (const x of [-11, 11]) {
    for (const z of [-6, 6]) {
      const post = cyl(.18, .2, 4.2, PALETTE.rockBrown, { seg: 8 });
      post.position.set(x, 2.1, z);
      group.add(post);
      colliders.push({ x, z, r: .3 });
    }
  }

  for (let i = 0; i < 3; i++) {
    const laneZ = -4 + i * 4;
    const lane = box(20, .16, 1.2, TEJO_CLAY, { shadow: false });
    lane.position.set(0, .14, laneZ);
    group.add(lane);
    for (const x of [-8, 8]) {
      const target = new Mesh(new RingGeometry(.5, .62, 18), basicMat(NEON_CYAN));
      target.rotation.x = -Math.PI / 2;
      target.position.set(x, .24, laneZ);
      group.add(target);
    }
  }

  return { group, colliders, walls: [], goals: [] };
}

// Quiosco de comidas
function buildKiosk(color = PALETTE.ninoBlue) {
  const group = new Group();

  const body = block(2.6, 1.6, 2, color, { studs: false });
  body.position.y = .8;
  group.add(body);

  const counter = box(2.8, .2, .6, PALETTE.gold);
  counter.position.set(0, 1.2, 1.1);
  group.add(counter);

  const roof = box(3.2, .25, 2.6, PALETTE.redRoof);
  roof.position.y = 2.4;
  group.add(roof);

  const neonStrip = box(3, .08, 2.4, NEON_CYAN);
  neonStrip.material = basicMat(NEON_CYAN);
  neonStrip.position.y = 2.22;
  group.add(neonStrip);

  return { group, r: 1.6 };
}

// Letrero informativo con el nombre de la cancha
function buildInfoSign(text = 'INFO') {
  const group = new Group();

  for (const x of [-.7, .7]) {
    const post = cyl(.07, .09, 2, 2830134, { seg: 8 });
    post.position.set(x, 1, 0);
    group.add(post);
  }

  const texture = makeSignTexture(text);
  const panel = new Mesh(
    new PlaneGeometry(2, 1.2),
    new MeshBasicMaterial({ map: texture, transparent: true, opacity: .85, side: DoubleSide }),
  );
  panel.position.set(0, 2, 0);
  group.add(panel);

  const neonBar = box(2.15, .06, .02, NEON_CYAN);
  neonBar.material = basicMat(NEON_CYAN);
  neonBar.position.set(0, 2.62, 0);
  group.add(neonBar);

  return { group, r: .5 };
}

// Gradería (banca con respaldo)
function buildBleacher(color = 16777215, width = 3.4) {
  const group = new Group();

  const seat = box(width, .16, .55, color);
  seat.position.y = .5;
  group.add(seat);

  const backrest = box(width, .55, .12, color);
  backrest.position.set(0, .82, -.22);
  group.add(backrest);

  for (const x of [-width / 2 + .4, width / 2 - .4]) {
    const leg = box(.14, .5, .55, 10134189);
    leg.position.set(x, .25, 0);
    group.add(leg);
  }

  return { group, r: width / 2 };
}

// Lámpara de parque
function buildLamp() {
  const group = new Group();

  const pole = cyl(.1, .13, 3.2, 2830134, { seg: 8 });
  pole.position.y = 1.6;
  group.add(pole);

  const arm = box(.7, .1, .1, 2830134);
  arm.position.set(.25, 3.2, 0);
  group.add(arm);

  const head = sphere(.26, 1053462, { seg: 10 });
  head.position.set(.55, 3.15, 0);
  group.add(head);

  const bulb = sphere(.2, NEON_CYAN, { seg: 10 });
  bulb.material = basicMat(16774080);
  bulb.position.set(.55, 3.05, 0);
  group.add(bulb);

  return { group, r: .3 };
}

// Árbol de parque (tronco y dos copas)
function buildParkTree() {
  const group = new Group();

  const trunk = cyl(.2, .25, 1.4, PALETTE.rockBrown, { seg: 8 });
  trunk.position.y = .7;
  group.add(trunk);

  const crown = sphere(1.1, PALETTE.green, { seg: 10 });
  crown.position.y = 2;
  group.add(crown);

  const crownDark = sphere(.8, PALETTE.greenDark, { seg: 10 });
  crownDark.position.set(.4, 2.5, .2);
  group.add(crownDark);

  return { group, r: .8 };
}

// Textura del letrero informativo (texto con salto de línea automático)
function makeSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 320);
  ctx.fillStyle = 'rgba(6, 40, 60, 0.7)';
  roundRect(ctx, 8, 8, 496, 304, 18);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#00e5ff';
  ctx.stroke();
  ctx.fillStyle = '#bff4ff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillWrappedText(ctx, text, 256, 160, 460, 52);
  return new CanvasTexture(canvas);
}

// Dibuja texto centrado partiéndolo en líneas que quepan en maxWidth
function fillWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  const startY = y - (lines.length - 1) * lineHeight / 2;
  lines.forEach((line, index) => ctx.fillText(line, x, startY + index * lineHeight));
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

// Constructores por tipo de zona
const ZONE_BUILDERS = {
  athletics: buildAthletics,
  futbol5: buildFutbol5,
  basket: buildBasket,
  voley: buildVoley,
  tejo: buildTejo,
};

// Zonas deportivas: posición, medio ancho/fondo, puntos al visitar y nombre
export { SPORT_ZONES };

// Construye el complejo completo y lo añade a la escena
export function buildSportsComplex(scene) {
  const root = new Group();
  root.name = 'sportsComplex';
  const colliders = [];
  const goalWalls = [];
  const goalZones = [];

  addComplexPaths(root);
  for (const zoneData of SPORT_ZONES) {
    placeZone(root, colliders, goalWalls, goalZones, ZONE_BUILDERS[zoneData.type](), zoneData);
  }
  addEntranceArch(root, colliders);
  addFurniture(root, colliders);
  scene.add(root);

  const zones = SPORT_ZONES.map((zone) => ({
    id: zone.id,
    x: zone.x,
    z: zone.z,
    hw: zone.hw,
    hd: zone.hd,
    points: zone.points,
    name: zone.name,
  }));

  // Tipo de balón por tipo de cancha y desplazamientos de spawn
  const ballKindByType = {
    athletics: 'soccer',
    futbol5: 'soccer',
    basket: 'basket',
    voley: 'volley',
  };
  const spawnOffsets = [
    [-2.5, 0],
    [2.5, 0],
    [0, -2.5],
    [0, 2.5],
    [0, 0],
  ];
  const ballSpawns = [];
  for (const zone of SPORT_ZONES) {
    const kind = ballKindByType[zone.type];
    if (kind) {
      for (const [dx, dz] of spawnOffsets) {
        ballSpawns.push({ kind, x: zone.x + dx, z: zone.z + dz });
      }
    }
  }

  return { group: root, colliders, zones, ballSpawns, goalWalls, goalZones };
}

// Ubica una cancha construida y traslada sus colisionadores al mundo
function placeZone(root, colliders, goalWalls, goalZones, built, zoneData) {
  built.group.position.set(zoneData.x, 0, zoneData.z);
  root.add(built.group);
  for (const collider of built.colliders) {
    colliders.push({ x: zoneData.x + collider.x, z: zoneData.z + collider.z, r: collider.r });
  }
  for (const wall of built.walls || []) {
    goalWalls.push({
      minX: wall.minX + zoneData.x,
      maxX: wall.maxX + zoneData.x,
      minZ: wall.minZ + zoneData.z,
      maxZ: wall.maxZ + zoneData.z,
      minY: wall.minY,
      maxY: wall.maxY,
    });
  }
  for (const goal of built.goals || []) {
    goalZones.push({
      minX: goal.minX + zoneData.x,
      maxX: goal.maxX + zoneData.x,
      minZ: goal.minZ + zoneData.z,
      maxZ: goal.maxZ + zoneData.z,
      y: goal.y,
      yTol: goal.yTol,
    });
  }
}

// Coloca mobiliario (quiosco, letrero, lámpara, árbol) con su colisionador
function placeFurniture(root, colliders, item, x, z, rotationY = 0) {
  item.group.position.set(x, 0, z);
  item.group.rotation.y = rotationY;
  root.add(item.group);
  if (item.r > 0) colliders.push({ x, z, r: item.r });
}

// Caminos internos del complejo (cintas texturizadas)
function addComplexPaths(root) {
  const texture = makeComplexPathTexture();
  texture.wrapS = texture.wrapT = RepeatWrapping;
  const material = new MeshStandardMaterial({
    map: texture,
    color: 16777215,
    roughness: .85,
    side: DoubleSide,
  });

  const entry = { x: 0, z: 80 };
  const nodeA = { x: 15, z: 102 };
  const nodeB = { x: 22, z: 128 };
  const nodeC = { x: 22, z: 158 };
  const nodeD = { x: 24, z: 192 };
  const routes = [
    [entry, nodeA, nodeB, nodeC, nodeD, { x: 20, z: 222 }],
    [entry, { x: 16, z: 62 }, { x: 18, z: 44 }, { x: 8, z: 28 }],
    [nodeA, { x: -28, z: 116 }, { x: -68, z: 124 }],
    [nodeB, { x: 44, z: 122 }, { x: 50, z: 120 }],
    [nodeC, { x: 15, z: 163 }, { x: 12, z: 165 }],
    [nodeC, { x: 45, z: 160 }, { x: 50, z: 160 }],
    [nodeD, { x: 42, z: 202 }, { x: 37, z: 205 }],
    [nodeD, { x: 6, z: 208 }, { x: -2, z: 212 }],
    [nodeD, { x: -16, z: 202 }, { x: -36, z: 210 }],
    [nodeB, { x: 55, z: 128 }, { x: 84, z: 130 }],
  ];
  for (const route of routes) root.add(ribbonMesh(route, 3.6, material));
}

// Arco de entrada con pancarta "COMPLEJO DEPORTIVO"
function addEntranceArch(root, colliders) {
  const arch = new Group();
  arch.position.set(0, 0, 96);
  root.add(arch);

  for (const x of [-4, 4]) {
    const pillar = box(1.2, 6, 1.2, PALETTE.ninoBlue);
    pillar.position.set(x, 3, 0);
    arch.add(pillar);

    const cap = box(1.3, .2, 1.3, NEON_CYAN);
    cap.material = basicMat(NEON_CYAN);
    cap.position.set(x, 6, 0);
    arch.add(cap);

    colliders.push({ x, z: 96, r: .9 });
  }

  const beam = box(9.4, 1, 1.2, PALETTE.ninoBlue);
  beam.position.set(0, 6.6, 0);
  arch.add(beam);

  const banner = new Mesh(
    new PlaneGeometry(8, 1.2),
    new MeshBasicMaterial({ map: makeBannerTexture('COMPLEJO DEPORTIVO'), transparent: true, side: DoubleSide }),
  );
  banner.position.set(0, 6.6, .7);
  arch.add(banner);
}

// Graderías, letreros, quioscos, lámparas y árboles alrededor de las canchas
function addFurniture(root, colliders) {
  for (const zone of SPORT_ZONES) {
    const bleacherWidth = Math.min(2 * zone.hw, 24);
    for (const side of [-1, 1]) {
      const z = zone.z + side * (zone.hd + 1.8);
      addBleacherRow(root, colliders, zone.x, z, bleacherWidth, side > 0 ? Math.PI : 0);
    }
    placeFurniture(root, colliders, buildInfoSign(zone.name), zone.x, zone.z + (zone.hd + 3 + 1.5));
  }

  placeFurniture(root, colliders, buildKiosk(), 14, 110, -.4);
  placeFurniture(root, colliders, buildKiosk(PALETTE.ninoBlue), 24, 150, .5);

  for (const [x, z] of [
    [20, 102],
    [27, 128],
    [16, 158],
    [29, 192],
    [14, 222],
  ]) {
    placeFurniture(root, colliders, buildLamp(), x, z);
  }

  const treeSpots = [
    [30, 110],
    [35, 150],
    [40, 180],
    [30, 200],
    [-30, 205],
    [-66, 108],
    [78, 108],
    [-105, 130],
    [-105, 185],
    [-100, 225],
    [-50, 242],
    [0, 250],
    [55, 245],
    [118, 135],
    [118, 165],
    [40, 95],
    [-40, 95],
  ];
  for (const [x, z] of treeSpots) placeFurniture(root, colliders, buildParkTree(), x, z);
}

// Fila de gradería con varios colisionadores repartidos a lo largo
function addBleacherRow(root, colliders, x, z, width, rotationY) {
  const bleacher = buildBleacher(16777215, width);
  bleacher.group.position.set(x, 0, z);
  bleacher.group.rotation.y = rotationY;
  root.add(bleacher.group);
  const segments = Math.max(1, Math.ceil(width / 2));
  for (let i = 0; i <= segments; i++) {
    const offset = -width / 2 + width * i / segments;
    colliders.push({ x: x + offset, z, r: .85 });
  }
}

// Textura repetible de los caminos del complejo
function makeComplexPathTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f6f9';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0, 200, 235, 0.55)';
  ctx.fillRect(5, 0, 4, 128);
  ctx.fillRect(119, 0, 4, 128);
  ctx.fillStyle = 'rgba(150,160,175,0.5)';
  ctx.fillRect(128 / 2 - 3, 16, 6, 48);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

// Textura de la pancarta del arco de entrada
function makeBannerTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 192);
  ctx.fillStyle = 'rgba(8, 26, 42, 0.85)';
  roundRect2(ctx, 6, 6, 1012, 180, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#00e5ff';
  ctx.stroke();
  ctx.fillStyle = '#bff4ff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 100);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function roundRect2(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
