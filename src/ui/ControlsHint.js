// Pista de controles del balón que aparece en la parte inferior cuando el
// jugador está cerca de un balón: teclas G (agarrar/soltar) y F (patear/lanzar).

/** Devuelve el HTML de una tecla dibujada como "keycap" dorado. */
function keycap(label) {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;background:linear-gradient(180deg,#ffd479,#e8a020);color:#0c2439;font-weight:800;border-radius:7px;border:2px solid #fff3d6;box-shadow:0 2px 0 #a86f12;">${label}</span>`;
}

export class ControlsHint {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%) translateY(8px);
      display: flex;
      gap: 18px;
      padding: 8px 16px;
      background: rgba(12, 36, 57, 0.78);
      border: 1px solid rgba(0,229,255,0.5);
      border-radius: 12px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #eaf6ff;
      font-size: 0.9rem;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 13;
      white-space: nowrap;
    `;
    this.el.innerHTML = `
      ${keycap('G')}<span style="align-self:center;">agarrar / soltar</span>
      ${keycap('F')}<span style="align-self:center;">patear / lanzar</span>
    `;
    parent.appendChild(this.el);
    this._visible = false;
  }

  show() {
    if (this._visible) return;
    this._visible = true;
    this.el.style.opacity = '1';
    this.el.style.transform = 'translateX(-50%) translateY(0)';
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateX(-50%) translateY(8px)';
  }
}
