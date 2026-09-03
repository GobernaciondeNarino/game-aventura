// NPC de pistas: un personaje con sombrero de paja y un aura dorada que
// deambula atado a su punto de aparición (cerca de cada sitio turístico).
// Al interactuar con él ofrece una pista de la siguiente pregunta, con
// un tiempo de espera entre pistas.
import { Mesh, RingGeometry } from 'three';
import { basicMat } from '../world/primitives.js';
import { buildNpcFigure } from './npcBuilder.js';

const HINT_COOLDOWN_MS = 6e4;
const TETHER_RADIUS = 5;
const SPEED = 1;
const AURA_COLOR = 16766073;

export class HintNpc {
  constructor({ x, z, appearance = {} }) {
    const figure = buildNpcFigure({ ...appearance, hat: 'straw', coat: false });
    this.group = figure.group;
    this.joints = figure;
    this.radius = .5;
    this.spawnX = x;
    this.spawnZ = z;
    this.state = {
      x,
      z,
      heading: Math.random() * Math.PI * 2,
      timer: 2 + Math.random() * 3,
    };
    this._animPhase = Math.random() * 10;
    this.cooldownUntil = 0;

    // Aura en el suelo que identifica al NPC de pistas.
    const aura = new Mesh(new RingGeometry(.7, 1, 24), basicMat(AURA_COLOR));
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = .12;
    this.group.add(aura);
    this._aura = aura;

    this.group.position.set(x, 0, z);
  }

  // Deambulación atada: si se aleja más de TETHER_RADIUS del punto de
  // aparición, gira hacia él sin avanzar en ese paso.
  static stepTethered(state, dt, spawnX, spawnZ, random = Math.random) {
    let { x, z, heading, timer } = state;
    timer -= dt;
    if (timer <= 0) {
      heading = random() * Math.PI * 2;
      timer = 2 + random() * 3;
    }
    let nextX = x + Math.sin(heading) * SPEED * dt;
    let nextZ = z + Math.cos(heading) * SPEED * dt;
    if (Math.hypot(nextX - spawnX, nextZ - spawnZ) > TETHER_RADIUS) {
      heading = Math.atan2(spawnX - x, spawnZ - z);
      nextX = x;
      nextZ = z;
    }
    return { x: nextX, z: nextZ, heading, timer };
  }

  isReady(now = Date.now()) {
    return now >= this.cooldownUntil;
  }

  triggerCooldown(now = Date.now()) {
    this.cooldownUntil = now + HINT_COOLDOWN_MS;
  }

  applyPose() {
    this.group.position.set(this.state.x, this.groundY || 0, this.state.z);
    this.group.rotation.y = this.state.heading;
  }

  animateWalk(dt) {
    this._animPhase += dt * 5;
    const swing = Math.sin(this._animPhase) * .3;
    this.joints.hipL.rotation.x = swing;
    this.joints.hipR.rotation.x = -swing;
    this.joints.shoulderL.rotation.x = -swing;
    this.joints.shoulderR.rotation.x = swing;
    this._aura.rotation.z += dt;
  }
}
