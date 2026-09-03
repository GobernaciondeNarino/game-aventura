// Paisaje construido a mano sobre el terreno realista: la playa del Pacífico
// (casetas, tumbonas y palmeras) y los peñascos del bosque de la cascada.
// Las montañas, el mar, el río y la cascada los generan ahora los sistemas de
// `environment/` (terreno, agua, árboles); aquí solo quedan los props.
import { Group } from 'three';
import { box, cyl, cone, sphere, PALETTE } from './primitives.js';
import { FOREST } from './worldLayout.js';
import { heightAt, isWaterAt } from '../environment/terrainMath.js';

// Colores de roca.
const ROCK = 9080729;
const ROCK_DARK = 7107196;

// Construye los props del paisaje y los añade a la escena.
export function buildLandscape(scene) {
  const group = new Group();
  group.name = 'landscape';
  const colliders = [];
  addForestRocks(group, colliders);
  addBeach(group, colliders);
  scene.add(group);
  return {
    group,
    colliders,
    tick: () => {},
  };
}

// Peñascos dispersos por el bosque de niebla (evitando el agua).
function addForestRocks(parent, colliders) {
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * (FOREST.radius - 22);
    const x = FOREST.x + Math.cos(angle) * distance;
    const z = FOREST.z + Math.sin(angle) * distance;
    if (isWaterAt(x, z)) continue;
    addBush(parent, x, z, .5 + Math.random() * 1.6, colliders);
  }
}

// Peñasco redondeado (con una piedra pequeña al lado si es grande). Colisiona si size > .7.
export function addBush(parent, x, z, size, colliders) {
  const color = Math.random() < .5 ? ROCK : ROCK_DARK;
  const ground = heightAt(x, z);
  const boulder = sphere(size, color, { seg: 8 });
  boulder.scale.y = .55 + Math.random() * .2;
  boulder.scale.x = .9 + Math.random() * .3;
  boulder.position.set(x, ground + size * .4, z);
  boulder.rotation.y = Math.random() * Math.PI * 2;
  parent.add(boulder);
  if (size > .8) {
    const pebble = sphere(size * .35, color === ROCK ? ROCK_DARK : ROCK, { seg: 6 });
    pebble.scale.y = .6;
    pebble.position.set(x + size * .7, ground + size * .25, z - size * .4);
    parent.add(pebble);
  }
  if (size > .7) colliders.push({ x, z, r: size * .85 });
}

// Playa al este: palmeras, casetas y tumbonas sobre la arena (la arena y el mar
// son parte del terreno y del sistema de agua).
function addBeach(parent, colliders) {
  for (let i = 0; i < 34; i++) {
    const x = 212 + Math.random() * 34;
    const z = -200 + Math.random() * 400;
    if (x < 218 && Math.abs(z) < 9) continue; // deja libre el final de la vía del este
    addPalm(parent, x, z);
    colliders.push({ x, z, r: .5 });
  }
  for (const z of [-180, -120, -50, 30, 100, 170]) addBeachHut(parent, colliders, 232, z);
  for (let i = 0; i < 18; i++) {
    const z = -190 + i * 22 + (Math.random() - .5) * 4;
    addSunbed(parent, colliders, 238 + Math.random() * 4, z);
    addSunbed(parent, colliders, 244 + Math.random() * 3, z + 3);
  }
}

// Caseta de playa cuadrada con techo a rayas.
export function addBeachHut(parent, colliders, x, z) {
  const ground = heightAt(x, z);
  const hut = new Group();
  const body = box(4, 2.4, 4, 16774102, { shadow: true });
  body.position.y = 1.2;
  hut.add(body);
  for (let i = 0; i < 4; i++) {
    const stripe = box(4.6, .3, 1.1, i % 2 ? 12597547 : 16119285);
    stripe.position.set(0, 2.6, -1.65 + i * 1.1);
    hut.add(stripe);
  }
  hut.position.set(x, ground, z);
  parent.add(hut);
  colliders.push({ x, z, r: 2.4 });
}

// Tumbona blanca con sombrilla de color aleatorio.
export function addSunbed(parent, colliders, x, z) {
  const ground = heightAt(x, z);
  const g = new Group();
  const base = box(.9, .12, 1.9, 16777215);
  base.position.y = .45;
  g.add(base);
  const backrest = box(.9, .7, .12, 16777215);
  backrest.rotation.x = -.5;
  backrest.position.set(0, .7, -.9);
  g.add(backrest);
  const pole = cyl(.05, .05, 2.4, 10254925, { seg: 6 });
  pole.position.set(.7, 1.2, 0);
  g.add(pole);
  const umbrella = cone(1.3, .7, Math.random() < .5 ? 15105570 : 2719929, { seg: 12 });
  umbrella.position.set(.7, 2.5, 0);
  g.add(umbrella);
  g.position.set(x, ground, z);
  parent.add(g);
  colliders.push({ x: x + .7, z, r: .4 });
}

// Palmera: tronco ligeramente inclinado y seis hojas cónicas.
export function addPalm(parent, x, z) {
  const ground = heightAt(x, z);
  const g = new Group();
  const height = 3.2 + Math.random() * 1.6;
  const trunk = cyl(.18, .26, height, PALETTE.rockBrown, { seg: 7 });
  trunk.position.y = height / 2;
  trunk.rotation.z = (Math.random() - .5) * .2;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = cone(.32, 1.7, PALETTE.green, { seg: 5 });
    frond.position.y = height + .1;
    frond.rotation.z = Math.cos(i / 6 * Math.PI * 2) * 1;
    frond.rotation.x = Math.sin(i / 6 * Math.PI * 2) * 1;
    g.add(frond);
  }
  g.position.set(x, ground, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  parent.add(g);
}
