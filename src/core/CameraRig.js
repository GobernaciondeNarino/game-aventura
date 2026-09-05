// Cámara orbital de videojuego: gira alrededor del jugador según un ángulo
// horizontal (yaw) y vertical (pitch) controlados por el ratón, el arrastre
// táctil o las flechas. Tres modos que se alternan con la tecla C: tercera
// persona cercana, panorámica y primera persona. Evita atravesar el terreno
// acortando la distancia y manteniéndose sobre el suelo.

import { PerspectiveCamera, Vector3, MathUtils } from 'three';

export const CAMERA_MODES = [
  { id: 'tercera', name: 'Tercera persona', distance: 7.5, height: 1.9, defaultPitch: 0.3, minPitch: -0.25, maxPitch: 1.25 },
  { id: 'panoramica', name: 'Panorámica', distance: 14, height: 2.6, defaultPitch: 0.48, minPitch: -0.1, maxPitch: 1.3 },
  { id: 'primera', name: 'Primera persona', distance: 0, height: 1.58, defaultPitch: 0.04, minPitch: -1.15, maxPitch: 1.15, firstPerson: true },
];

// Altura mínima de la cámara sobre el terreno.
const GROUND_CLEARANCE = 1.1;
// Rapidez del suavizado de posición (1/s).
const SMOOTHING = 18;

export class CameraRig {
  constructor({ fov = 70, aspect = 1, near = 0.1, far = 2200, yaw = 0 } = {}) {
    this.camera = new PerspectiveCamera(fov, aspect, near, far);
    this.yaw = yaw;
    this.modeIndex = 0;
    this.pitch = this.mode.defaultPitch;
    this._focus = new Vector3();
    this._dir = new Vector3();
    this._desired = new Vector3();
    this._lookTarget = new Vector3();
    this._initialized = false;
  }

  get mode() {
    return CAMERA_MODES[this.modeIndex];
  }

  /** Pasa al siguiente modo de cámara y lo devuelve. */
  cycleMode() {
    this.modeIndex = (this.modeIndex + 1) % CAMERA_MODES.length;
    const mode = this.mode;
    this.pitch = MathUtils.clamp(this.pitch, mode.minPitch, mode.maxPitch);
    this._initialized = false;
    return mode;
  }

  /** Gira la cámara (radianes). Yaw positivo = hacia la izquierda; pitch positivo = mirar hacia abajo. */
  rotate(deltaYaw, deltaPitch) {
    this.yaw += deltaYaw;
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    else if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    const mode = this.mode;
    this.pitch = MathUtils.clamp(this.pitch + deltaPitch, mode.minPitch, mode.maxPitch);
  }

  /**
   * Actualiza la cámara siguiendo al objetivo.
   * @param {import('three').Object3D} target jugador
   * @param {number} dt segundos
   * @param {boolean} snap colocar sin suavizado
   * @param {(x:number, z:number) => number} [groundFn] cota del terreno
   */
  update(target, dt = 0, snap = false, groundFn = null) {
    const mode = this.mode;
    this._focus.set(target.position.x, target.position.y + mode.height, target.position.z);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    // Dirección hacia la que mira la cámara.
    this._dir.set(Math.sin(this.yaw) * cosP, -sinP, Math.cos(this.yaw) * cosP);

    if (mode.firstPerson) {
      this._desired.copy(this._focus).addScaledVector(this._dir, 0.25);
      this._lookTarget.copy(this._desired).add(this._dir);
      this.camera.position.copy(this._desired);
      this.camera.lookAt(this._lookTarget);
      this._initialized = true;
      return;
    }

    let distance = mode.distance;
    if (groundFn) distance = this._clearDistance(groundFn, distance);
    this._desired.copy(this._focus).addScaledVector(this._dir, -distance);
    if (groundFn) {
      const minY = groundFn(this._desired.x, this._desired.z) + GROUND_CLEARANCE;
      if (this._desired.y < minY) this._desired.y = minY;
    }
    if (snap || !this._initialized) {
      this.camera.position.copy(this._desired);
      this._initialized = true;
    } else {
      this.camera.position.lerp(this._desired, 1 - Math.exp(-dt * SMOOTHING));
    }
    this.camera.lookAt(this._focus);
  }

  // Acorta la distancia si el terreno se interpone entre el jugador y la cámara.
  _clearDistance(groundFn, distance) {
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const d = distance * i / steps;
      const x = this._focus.x - this._dir.x * d;
      const y = this._focus.y - this._dir.y * d;
      const z = this._focus.z - this._dir.z * d;
      if (groundFn(x, z) + 0.7 > y) return Math.max(1.4, distance * (i - 1) / steps);
    }
    return distance;
  }

  /** Compatibilidad: eleva la cámara sobre el terreno y vuelve a mirar al objetivo. */
  clampAboveGround(groundFn, clearance = GROUND_CLEARANCE) {
    const minY = groundFn(this.camera.position.x, this.camera.position.z) + clearance;
    if (this.camera.position.y < minY) {
      this.camera.position.y = minY;
      this.camera.lookAt(this.mode.firstPerson ? this._lookTarget : this._focus);
    }
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
