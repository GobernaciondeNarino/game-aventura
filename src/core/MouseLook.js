// Control de cámara con el ratón (estilo videojuego): al hacer clic sobre el
// lienzo se captura el puntero (Pointer Lock) y los movimientos del ratón se
// acumulan como deltas de giro; Esc lo libera. También registra los flancos de
// los botones izquierdo (patear) y derecho (agarrar) y anula el menú contextual.

export class MouseLook {
  /** @param {HTMLElement} canvas elemento sobre el que se captura el puntero */
  constructor(canvas) {
    this.canvas = canvas;
    this.locked = false;
    this.enabled = true;
    this._dx = 0;
    this._dy = 0;
    this._left = false;
    this._right = false;

    this._onMouseDown = (event) => {
      if (event.button === 2) {
        this._right = true;
      } else if (event.button === 0) {
        if (this.locked) this._left = true;
        else if (this.enabled) this.lock();
      }
    };
    this._onMouseMove = (event) => {
      if (!this.locked) return;
      this._dx += event.movementX || 0;
      this._dy += event.movementY || 0;
    };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
      this._dx = this._dy = 0;
    };
    this._onContextMenu = (event) => event.preventDefault();

    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
  }

  /** Solicita la captura del puntero (debe llamarse desde un gesto del usuario). */
  lock() {
    if (this.locked || !this.canvas.requestPointerLock) return;
    try {
      const result = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (result && typeof result.catch === 'function') result.catch(() => this.canvas.requestPointerLock());
    } catch {
      try { this.canvas.requestPointerLock(); } catch { /* sin soporte */ }
    }
  }

  unlock() {
    if (document.pointerLockElement === this.canvas && document.exitPointerLock) document.exitPointerLock();
  }

  /**
   * Devuelve y reinicia los deltas acumulados y los flancos de los botones.
   * @returns {{dx:number, dy:number, left:boolean, right:boolean, locked:boolean}}
   */
  consume() {
    const result = { dx: this._dx, dy: this._dy, left: this._left, right: this._right, locked: this.locked };
    this._dx = this._dy = 0;
    this._left = this._right = false;
    return result;
  }

  dispose() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}
