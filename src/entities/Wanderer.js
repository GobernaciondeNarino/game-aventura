// NPC errante: camina, corre, salta o descansa dentro de un radio alrededor
// de un centro. La lógica de movimiento es pura (stepWander) para poder
// reutilizarla con otras entidades (p. ej. los osos de FaunaSystem).
import { buildNpcFigure } from './npcBuilder.js';
import { rand } from '../core/prng.js';

const GRAVITY = -25;
const JUMP_VELOCITY = 6;
const RUN_SPEED = 5;
const WALK_SPEED = 2;

export class Wanderer {
  constructor({
    x,
    z,
    speed = 2,
    bounds = 85,
    boundCX = 0,
    boundCZ = 0,
    appearance = {},
  } = {}) {
    const figure = buildNpcFigure(appearance);
    this.group = figure.group;
    this.joints = figure;
    this.radius = .5;
    this.speed = speed;
    this.bounds = bounds;
    this.boundCX = boundCX;
    this.boundCZ = boundCZ;
    this.state = {
      x,
      z,
      heading: rand() * Math.PI * 2,
      timer: 3 + rand() * 3,
    };
    this._animPhase = rand() * 10;
    this.behavior = 'walk';
    this.behaviorTimer = 1 + rand() * 3;
    this.y = 0;
    this.vy = 0;
    this.groundY = 0;
    this.group.position.set(x, 0, z);
  }

  // Elige un comportamiento cada cierto tiempo y aplica la física vertical del
  // salto. Devuelve la velocidad horizontal correspondiente al comportamiento.
  updateBehavior(dt, random = Math.random) {
    this.behaviorTimer -= dt;
    if (this.behaviorTimer <= 0) {
      const roll = random();
      this.behavior = roll < .2 ? 'idle' : roll < .6 ? 'walk' : roll < .85 ? 'run' : 'jump';
      this.behaviorTimer = 1.5 + random() * 3;
    }
    if (this.behavior === 'jump' && this.y <= 0 && this.vy <= 0) this.vy = JUMP_VELOCITY;
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
    }
    return this.behavior === 'idle' ? 0 : this.behavior === 'run' ? RUN_SPEED : WALK_SPEED;
  }

  // Paso de deambulación puro: cambia de rumbo al agotarse el temporizador y,
  // si se sale del radio permitido, apunta de vuelta al centro sin avanzar.
  static stepWander(state, dt, random = Math.random, speed = 2, bounds = 85, cx = 0, cz = 0) {
    let { x, z, heading, timer } = state;
    timer -= dt;
    if (timer <= 0) {
      heading = random() * Math.PI * 2;
      timer = 3 + random() * 3;
    }
    let nextX = x + Math.sin(heading) * speed * dt;
    let nextZ = z + Math.cos(heading) * speed * dt;
    if (Math.hypot(nextX - cx, nextZ - cz) > bounds) {
      heading = Math.atan2(cx - x, cz - z);
      nextX = x;
      nextZ = z;
    }
    return { x: nextX, z: nextZ, heading, timer };
  }

  applyPose() {
    this.group.position.set(this.state.x, this.groundY + this.y, this.state.z);
    this.group.rotation.y = this.state.heading;
  }

  // Animación de extremidades según el comportamiento actual.
  animate(dt) {
    const behavior = this.behavior;
    if (behavior === 'jump') {
      this.joints.hipL.rotation.x = -.4;
      this.joints.hipR.rotation.x = -.4;
      this.joints.shoulderL.rotation.x = -.9;
      this.joints.shoulderR.rotation.x = -.9;
      return;
    }
    const amplitude = behavior === 'run' ? .7 : behavior === 'idle' ? .05 : .4;
    const frequency = behavior === 'run' ? 10 : 6;
    this._animPhase += dt * frequency;
    const swing = Math.sin(this._animPhase) * amplitude;
    this.joints.hipL.rotation.x = swing;
    this.joints.hipR.rotation.x = -swing;
    this.joints.shoulderL.rotation.x = -swing;
    this.joints.shoulderR.rotation.x = swing;
  }

  changeDirection() {
    this.state.heading = rand() * Math.PI * 2;
    this.state.timer = 2 + rand() * 3;
  }
}
