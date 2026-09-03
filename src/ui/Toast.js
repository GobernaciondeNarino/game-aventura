// Aviso emergente (toast) centrado en la parte superior del HUD.
// `show(message, duration)` lo muestra con una animación de entrada
// y lo oculta automáticamente pasado `duration` ms.

export class Toast {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      top: 84px;
      left: 50%;
      transform: translateX(-50%) translateY(-10px);
      padding: 12px 22px;
      background: rgba(12, 36, 57, 0.9);
      border: 2px solid #00e5ff;
      border-radius: 12px;
      color: #eaf6ff;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-weight: 700;
      font-size: 1.05rem;
      box-shadow: 0 6px 22px rgba(0,0,0,0.4);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 18;
      white-space: nowrap;
    `;
    parent.appendChild(this.el);
    this._timer = null;
  }

  show(message, duration = 2200) {
    this.el.textContent = message;
    this.el.style.opacity = '1';
    this.el.style.transform = 'translateX(-50%) translateY(0)';
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.el.style.opacity = '0';
      this.el.style.transform = 'translateX(-50%) translateY(-10px)';
    }, duration);
  }
}
