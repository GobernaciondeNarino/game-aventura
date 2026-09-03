// Controles táctiles para móviles y tablets: un joystick virtual a la izquierda
// que emula WASD y una botonera a la derecha que emula Espacio/Shift/E/F/G/H.
// Todo se traduce a llamadas `input.setVirtual(code, pressed)` del InputManager.

/** Botones de la botonera: [código de tecla emulado, etiqueta visible]. */
const PAD_BUTTONS = [
  ['Space', 'Saltar'],
  ['ShiftLeft', 'Correr'],
  ['KeyE', 'E'],
  ['KeyF', 'F'],
  ['KeyG', 'G'],
  ['KeyH', 'H'],
];

/** Teclas de movimiento que gobierna el joystick. */
const MOVE_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];

/** Umbral normalizado (0..1) a partir del cual el joystick activa una dirección. */
const JOYSTICK_THRESHOLD = 0.35;

/** Posición (px) del knob en reposo, centrado dentro de la base de 120px. */
const KNOB_REST_PX = 35;

/** Devuelve true si el dispositivo tiene capacidad táctil. */
export function isTouchDevice() {
  return (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0)
    || (typeof window !== 'undefined' && 'ontouchstart' in window);
}

export class TouchControls {
  constructor(parent, input) {
    this.input = input;
    this._active = new Set();

    // Base circular del joystick
    this.base = document.createElement('div');
    this.base.style.cssText = `
      position:absolute; left:24px; bottom:24px; width:120px; height:120px;
      border-radius:50%; background:rgba(12,36,57,0.4);
      border:2px solid rgba(255,255,255,0.3); pointer-events:auto; z-index:30;
      touch-action:none;
    `;
    // Knob (perilla) que sigue al dedo
    this.knob = document.createElement('div');
    this.knob.style.cssText = `
      position:absolute; left:35px; top:35px; width:50px; height:50px;
      border-radius:50%; background:rgba(232,160,32,0.85);
      border:2px solid #fff3d6; pointer-events:none;
    `;
    this.base.appendChild(this.knob);
    parent.appendChild(this.base);

    this._joyId = null;
    this.base.addEventListener('pointerdown', (event) => this._joyStart(event));
    this.base.addEventListener('pointermove', (event) => this._joyMove(event));
    this.base.addEventListener('pointerup', () => this._joyEnd());
    this.base.addEventListener('pointercancel', () => this._joyEnd());
    this.base.addEventListener('pointerleave', () => this._joyEnd());

    // Botonera de acciones (rejilla 3 columnas)
    this.pad = document.createElement('div');
    this.pad.style.cssText = `
      position:absolute; right:16px; bottom:74px;
      display:grid; grid-template-columns:repeat(3,56px); gap:8px;
      pointer-events:none; z-index:30;
    `;
    parent.appendChild(this.pad);

    for (const [code, label] of PAD_BUTTONS) this._addButton(code, label);
  }

  /** Crea un botón redondo que mantiene pulsada la tecla `code` mientras se toca. */
  _addButton(code, label) {
    const button = document.createElement('button');
    button.textContent = label;
    button.style.cssText = `
      width:56px; height:56px; border-radius:50%;
      background:rgba(26,82,118,0.78); color:#eaf6ff;
      border:2px solid rgba(255,255,255,0.3); font-weight:700; font-size:0.85rem;
      pointer-events:auto; touch-action:none; user-select:none;
    `;
    const press = (event) => {
      event.preventDefault();
      this.input.setVirtual(code, true);
      button.style.background = 'rgba(232,160,32,0.85)';
    };
    const release = (event) => {
      event.preventDefault();
      this.input.setVirtual(code, false);
      button.style.background = 'rgba(26,82,118,0.78)';
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    this.pad.appendChild(button);
  }

  _joyStart(event) {
    event.preventDefault();
    this._joyId = event.pointerId;
    this.base.setPointerCapture?.(event.pointerId);
    this._joyMove(event);
  }

  _joyMove(event) {
    if (this._joyId !== event.pointerId) return;
    const rect = this.base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const radius = rect.width / 2;
    const distance = Math.hypot(dx, dy) || 1;
    // Limitar el knob al radio de la base
    if (distance > radius) {
      dx = dx / distance * radius;
      dy = dy / distance * radius;
    }
    this.knob.style.left = `${KNOB_REST_PX + dx}px`;
    this.knob.style.top = `${KNOB_REST_PX + dy}px`;
    const axisX = dx / radius;
    const axisY = dy / radius;
    this._set('KeyW', axisY < -JOYSTICK_THRESHOLD);
    this._set('KeyS', axisY > JOYSTICK_THRESHOLD);
    this._set('KeyA', axisX < -JOYSTICK_THRESHOLD);
    this._set('KeyD', axisX > JOYSTICK_THRESHOLD);
  }

  _joyEnd() {
    this._joyId = null;
    this.knob.style.left = `${KNOB_REST_PX}px`;
    this.knob.style.top = `${KNOB_REST_PX}px`;
    for (const code of MOVE_KEYS) this.input.setVirtual(code, false);
  }

  _set(code, pressed) {
    this.input.setVirtual(code, pressed);
  }
}
