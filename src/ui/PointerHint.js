// Aviso para escritorio: indica cómo activar el control de cámara con el ratón
// (clic sobre el juego) y cómo liberarlo (Esc). Se oculta mientras el puntero
// está capturado o hay un panel abierto.

export class PointerHint {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 72px;
      transform: translateX(-50%);
      padding: 7px 14px;
      background: rgba(12, 36, 57, 0.72);
      border: 1px solid rgba(232, 160, 32, 0.6);
      border-radius: 999px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #eaf6ff;
      font-size: 0.82rem;
      pointer-events: none;
      transition: opacity 0.25s ease;
      z-index: 13;
      white-space: nowrap;
      max-width: 92vw;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    this.el.textContent = '🖱️ Haz clic en el juego para dirigir la cámara con el ratón · Esc libera el cursor · C cambia la cámara';
    parent.appendChild(this.el);
    this._disabled = false;
    this._visible = true;
  }

  disable() {
    this._disabled = true;
    this.el.style.display = 'none';
  }

  /** @param {boolean} locked puntero capturado @param {boolean} uiOpen hay un panel modal abierto */
  update(locked, uiOpen) {
    if (this._disabled) return;
    const show = !locked && !uiOpen;
    if (show === this._visible) return;
    this._visible = show;
    this.el.style.opacity = show ? '1' : '0';
  }
}
