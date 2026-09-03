// Tarjeta verde que aparece al descubrir un animal (fauna): nombre,
// puntos otorgados y descripción. Se oculta sola pasados `duration` ms.

export class FaunaCard {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 88px;
      transform: translateX(-50%) translateY(16px);
      width: min(520px, 86vw);
      box-sizing: border-box;
      padding: 14px 20px;
      background: rgba(20, 48, 30, 0.9);
      border: 2px solid #6fcf73;
      border-radius: 14px;
      color: #f5f5f5;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 13;
    `;
    this.el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-size:1.3rem;">🐾</span>
        <span class="fc-name" style="font-size:1.2rem;font-weight:700;color:#b8f0bb;"></span>
        <span class="fc-pts" style="margin-left:auto;font-weight:700;color:#ffd479;"></span>
      </div>
      <div class="fc-desc" style="font-size:0.95rem;line-height:1.4;"></div>
    `;
    parent.appendChild(this.el);
    this._name = this.el.querySelector('.fc-name');
    this._pts = this.el.querySelector('.fc-pts');
    this._desc = this.el.querySelector('.fc-desc');
    this._timer = null;
  }

  /** `fauna` = { name, points, description }. */
  show(fauna, duration = 6000) {
    this._name.textContent = `¡Descubriste: ${fauna.name}!`;
    this._pts.textContent = `+${fauna.points}`;
    this._desc.textContent = fauna.description;
    this.el.style.opacity = '1';
    this.el.style.transform = 'translateX(-50%) translateY(0)';
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.el.style.opacity = '0';
      this.el.style.transform = 'translateX(-50%) translateY(16px)';
    }, duration);
  }
}
