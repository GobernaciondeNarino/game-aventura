// Paisaje exterior del mundo: anillo de montañas en el horizonte, la montaña
// con cascada y bosque al oeste (-200, 0), la playa con mar al este y la valla
// perimetral. Devuelve colisionadores circulares y un `tick` que anima el agua.
import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  DoubleSide,
  Matrix4,
  Vector3,
  RepeatWrapping,
  CanvasTexture,
} from 'three';
import { box, cyl, cone, sphere, disc, PALETTE } from './primitives.js';
import { WORLD_BOUNDS } from './worldBounds.js';

// Colores de roca y nieve.
const ROCK = 9080729;
const ROCK_DARK = 7107196;
const SNOW = 16054527;
// Colores de las colinas bajas (< 28 m) y de la cima marrón de las montañas medias.
const LOW_HILL_COLOR = 5213263;
const LOW_HILL_CAP_COLOR = 3499571;
const MID_MOUNTAIN_CAP_COLOR = 7033920;

// Centro del bosque con cascada.
const FOREST_X = -200;
const FOREST_Z = 0;

// Construye todo el paisaje y lo añade a la escena.
export function buildLandscape(scene) {
  const group = new Group();
  group.name = 'landscape';
  const colliders = [];
  const tickers = [];
  addMountainRing(group, colliders);
  addWaterfallForest(group, colliders, tickers);
  addBeach(group, colliders);
  addFence(group);
  scene.add(group);
  return {
    group,
    colliders,
    tick: (dt) => {
      for (const fn of tickers) fn(dt);
    },
  };
}

// Montaña cónica con cima de distinto color según la altura (nieve, marrón o verde).
export function addMountain(parent, x, z, radius, height, opts = {}) {
  let bodyColor = ROCK;
  let capColor = SNOW;
  if (height > 38) {
    bodyColor = ROCK;
    capColor = SNOW;
  } else if (height >= 28) {
    bodyColor = ROCK;
    capColor = MID_MOUNTAIN_CAP_COLOR;
  } else {
    bodyColor = LOW_HILL_COLOR;
    capColor = LOW_HILL_CAP_COLOR;
  }
  const body = cone(radius, height, bodyColor, { seg: 7 });
  body.position.set(x, height / 2, z);
  body.rotation.y = Math.random() * Math.PI;
  parent.add(body);
  {
    const capRadius = radius * (height < 28 ? .6 : .42);
    const capHeight = height * (height < 28 ? .28 : .34);
    const cap = cone(capRadius, capHeight, capColor, { seg: 7, roughness: .6 });
    cap.position.set(x, height * (height < 28 ? .78 : .83), z);
    cap.rotation.y = body.rotation.y;
    parent.add(cap);
  }
  return body;
}

// Anillo de 14 montañas en el horizonte (se omite el lado de la playa).
function addMountainRing(parent, colliders) {
  for (let i = 0; i < 14; i++) {
    const angle = i / 14 * Math.PI * 2;
    if (Math.sin(angle) > .55) continue;
    const distance = 250 + Math.random() * 35;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;
    const radius = 18 + Math.random() * 22;
    const height = 22 + Math.random() * 30;
    addMountain(parent, x, z, radius, height);
    colliders.push({ x, z, r: radius * .85 });
  }
}

// Valla perimetral de postes blancos y travesaños azules sobre el radio del mundo.
function addFence(parent) {
  const radius = WORLD_BOUNDS.R;
  const step = .05;
  for (let angle = 0; angle < Math.PI * 2; angle += step) {
    if (Math.abs(angle - Math.PI / 2) < WORLD_BOUNDS.gapHalf) continue;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const post = box(.25, 2.2, .25, 15987694);
    post.position.set(x, 1.1, z);
    parent.add(post);
    const rail = box(.12, .3, radius * step + .4, PALETTE.ninoBlue);
    rail.position.set(x, 1.5, z);
    rail.rotation.y = angle + Math.PI / 2;
    parent.add(rail);
  }
}

// Montaña grande con cascada animada, poza, espuma, niebla, rocas y bosque de pinos.
function addWaterfallForest(parent, colliders, tickers) {
  addMountain(parent, FOREST_X, FOREST_Z, 28, 42);
  colliders.push({ x: FOREST_X, z: FOREST_Z, r: 22 });

  // Geometría de la ladera: vector "cuesta abajo" y su normal en el plano XY.
  const peakHeight = 42;
  const baseRadius = 28;
  const slopeAngle = Math.atan(peakHeight / baseRadius);
  const sinSlope = Math.sin(slopeAngle);
  const cosSlope = Math.cos(slopeAngle);
  const downX = cosSlope;
  const downY = -sinSlope;
  const normalX = sinSlope;
  const normalY = cosSlope;

  // Saliente de roca en la cima de donde nace el agua.
  const ledge = box(2.8, .5, 1.6, ROCK_DARK);
  ledge.position.set(FOREST_X + .3, peakHeight - .4, 0);
  parent.add(ledge);
  const ledgeTop = box(1.6, .35, 1, ROCK);
  ledgeTop.position.set(FOREST_X + .6, peakHeight + .05, 0);
  parent.add(ledgeTop);

  // Tres láminas de agua superpuestas sobre la ladera.
  const waterTextures = [];
  const sheetLength = 44;
  const sheetOffset = .6 + sheetLength / 2;
  const sheetCenterX = FOREST_X + downX * sheetOffset;
  const sheetCenterY = peakHeight + downY * sheetOffset;
  for (let layer = 0; layer < 3; layer++) {
    const texture = makeWaterfallTexture();
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, 5);
    texture.offset.y = Math.random();
    const sheetWidth = 2 - layer * .4;
    const material = new MeshStandardMaterial({
      map: texture,
      color: 13167359,
      transparent: true,
      opacity: .78 + Math.random() * .12,
      side: DoubleSide,
      emissive: 2773104,
      emissiveIntensity: .5,
    });
    const sheet = new Mesh(new PlaneGeometry(sheetWidth, sheetLength), material);
    const basis = new Matrix4().makeBasis(
      new Vector3(0, 0, -1),
      new Vector3(-downX, -downY, 0),
      new Vector3(normalX, normalY, 0),
    );
    sheet.quaternion.setFromRotationMatrix(basis);
    const lift = .4 + layer * .05;
    sheet.position.set(sheetCenterX + normalX * lift, sheetCenterY + normalY * lift, 0 + (layer - 1) * .6);
    parent.add(sheet);
    waterTextures.push(texture);
  }
  // Animación: desplaza las texturas hacia abajo a distinta velocidad por capa.
  tickers.push((dt) => {
    for (let i = 0; i < waterTextures.length; i++) waterTextures[i].offset.y += dt * (.7 + i * .15);
  });

  // Poza al pie de la cascada.
  const poolX = FOREST_X + downX * (Math.sqrt(peakHeight * peakHeight + baseRadius * baseRadius) + 3);
  const poolZ = 0;
  const pool = disc(8, 3112885, { opacity: .9 });
  pool.position.set(poolX, .2, poolZ);
  parent.add(pool);
  const poolInner = disc(5.5, 6274022, { opacity: .75 });
  poolInner.position.set(poolX, .25, poolZ);
  parent.add(poolInner);

  // Espuma sobre el agua.
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 1.5 + Math.random() * 2.5;
    const foam = sphere(.35 + Math.random() * .4, 16777215, { opacity: .85, shadow: false, seg: 8 });
    foam.scale.y = .5;
    foam.position.set(poolX + Math.cos(angle) * distance, .4 + Math.random() * .25, poolZ + Math.sin(angle) * distance);
    parent.add(foam);
  }
  // Niebla difusa alrededor de la poza.
  for (let i = 0; i < 9; i++) {
    const mist = sphere(2.2 + Math.random() * 1.4, 16777215, { opacity: .16, shadow: false, seg: 10 });
    mist.scale.y = .5;
    mist.position.set(poolX + (Math.random() - .5) * 8, 1.6 + Math.random() * 3.2, poolZ + (Math.random() - .5) * 8);
    parent.add(mist);
  }
  // Rocas alrededor de la poza.
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 7 + Math.random() * 2.5;
    addBush(parent, poolX + Math.cos(angle) * distance, poolZ + Math.sin(angle) * distance, .7 + Math.random() * .8, colliders);
  }
  // Bosque de pinos.
  for (let i = 0; i < 66; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 44;
    const x = FOREST_X + Math.cos(angle) * distance;
    const z = FOREST_Z + Math.sin(angle) * distance;
    addForestTree(parent, x, z);
    colliders.push({ x, z, r: .9 });
  }
  // Rocas dispersas por el bosque.
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 24 + Math.random() * 38;
    const x = FOREST_X + Math.cos(angle) * distance;
    const z = FOREST_Z + Math.sin(angle) * distance;
    const size = .5 + Math.random() * 1.6;
    addBush(parent, x, z, size, colliders);
  }
}

// Peñasco redondeado (con una piedra pequeña al lado si es grande). Colisiona si size > .7.
export function addBush(parent, x, z, size, colliders) {
  const color = Math.random() < .5 ? ROCK : ROCK_DARK;
  const boulder = sphere(size, color, { seg: 8 });
  boulder.scale.y = .55 + Math.random() * .2;
  boulder.scale.x = .9 + Math.random() * .3;
  boulder.position.set(x, size * .4, z);
  boulder.rotation.y = Math.random() * Math.PI * 2;
  parent.add(boulder);
  if (size > .8) {
    const pebble = sphere(size * .35, color === ROCK ? ROCK_DARK : ROCK, { seg: 6 });
    pebble.scale.y = .6;
    pebble.position.set(x + size * .7, size * .25, z - size * .4);
    parent.add(pebble);
  }
  if (size > .7) colliders.push({ x, z, r: size * .85 });
}

// Pino de bosque: tronco + tres conos de copa.
export function addForestTree(parent, x, z) {
  const height = 2.4 + Math.random() * 1.8;
  const trunk = cyl(.22, .28, height * .5, PALETTE.rockBrown, { seg: 7 });
  trunk.position.set(x, height * .25, z);
  parent.add(trunk);
  for (let tier = 0; tier < 3; tier++) {
    const canopy = cone(1.4 - tier * .35, 1.6, PALETTE.greenDark, { seg: 8 });
    canopy.position.set(x, height * .5 + tier * height * .22, z);
    parent.add(canopy);
  }
}

// Playa al este: arena, mar translúcido, palmeras, casetas y tumbonas.
function addBeach(parent, colliders) {
  const sand = box(80, .2, 420, PALETTE.sand, { shadow: false });
  sand.position.set(248, .1, 0);
  sand.receiveShadow = true;
  parent.add(sand);
  const sea = box(140, .3, 460, PALETTE.sea, { shadow: false });
  sea.material = new MeshStandardMaterial({
    color: PALETTE.sea,
    transparent: true,
    opacity: .85,
    roughness: .2,
    metalness: .3,
  });
  sea.position.set(338, 0, 0);
  parent.add(sea);
  for (let i = 0; i < 36; i++) {
    const x = 215 + Math.random() * 35;
    const z = -200 + Math.random() * 400;
    addPalm(parent, x, z);
    colliders.push({ x, z, r: .5 });
  }
  for (const z of [-180, -120, -50, 30, 100, 170]) addBeachHut(parent, colliders, 232, z);
  for (let i = 0; i < 18; i++) {
    const z = -190 + i * 22 + (Math.random() - .5) * 4;
    addSunbed(parent, colliders, 260 + Math.random() * 4, z);
    addSunbed(parent, colliders, 266 + Math.random() * 4, z + 3);
  }
}

// Caseta de playa cuadrada con techo a rayas.
export function addBeachHut(parent, colliders, x, z) {
  const body = box(4, 2.4, 4, 16774102, { shadow: true });
  body.position.set(x, 1.2, z);
  parent.add(body);
  for (let i = 0; i < 4; i++) {
    const stripe = box(4.6, .3, 1.1, i % 2 ? 12597547 : 16119285);
    stripe.position.set(x, 2.6, z - 1.65 + i * 1.1);
    parent.add(stripe);
  }
  colliders.push({ x, z, r: 2.4 });
}

// Tumbona blanca con sombrilla de color aleatorio.
export function addSunbed(parent, colliders, x, z) {
  const base = box(.9, .12, 1.9, 16777215);
  base.position.set(x, .45, z);
  parent.add(base);
  const backrest = box(.9, .7, .12, 16777215);
  backrest.rotation.x = -.5;
  backrest.position.set(x, .7, z - .9);
  parent.add(backrest);
  const pole = cyl(.05, .05, 2.4, 10254925, { seg: 6 });
  pole.position.set(x + .7, 1.2, z);
  parent.add(pole);
  const umbrella = cone(1.3, .7, Math.random() < .5 ? 15105570 : 2719929, { seg: 12 });
  umbrella.position.set(x + .7, 2.5, z);
  parent.add(umbrella);
  colliders.push({ x: x + .7, z, r: .4 });
}

// Palmera: tronco ligeramente inclinado y seis hojas cónicas.
export function addPalm(parent, x, z) {
  const trunk = cyl(.18, .26, 3.2, PALETTE.rockBrown, { seg: 7 });
  trunk.position.set(x, 1.6, z);
  trunk.rotation.z = (Math.random() - .5) * .2;
  parent.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = cone(.32, 1.7, PALETTE.green, { seg: 5 });
    frond.position.set(x, 3.3, z);
    frond.rotation.z = Math.cos(i / 6 * Math.PI * 2) * 1;
    frond.rotation.x = Math.sin(i / 6 * Math.PI * 2) * 1;
    parent.add(frond);
  }
}

// Textura de la cascada: degradado azul con vetas blancas verticales.
export function makeWaterfallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#cdeeff');
  gradient.addColorStop(1, '#5aa6d8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 10;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - .5) * 6, 128);
    ctx.stroke();
  }
  return new CanvasTexture(canvas);
}
