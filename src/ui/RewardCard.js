// Tarjeta blanca de "¡RECOMPENSA!" que aparece al completar un sitio:
// icono, nombre y nota de la recompensa. Se oculta sola tras `duration` ms.

export class RewardCard {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 88px;
      transform: translateX(-50%) translateY(16px);
      width: min(420px, 86vw);
      box-sizing: border-box;
      padding: 14px 20px;
      background: rgba(255,255,255,0.97);
      border: 2px solid #0f7d84;
      border-radius: 14px;
      color: #0c2439;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 28px rgba(0,0,0,0.45);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 13;
    `;
    parent.appendChild(this.el);
    this._timer = null;
  }

  /** `reward` = { icon, name, note } (ver data/rewards.js). */
  show(reward, duration = 5000) {
    this.el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:2.2rem;">${reward.icon}</div>
        <div>
          <div style="font-size:0.8rem;color:#0f7d84;font-weight:800;letter-spacing:0.04em;">¡RECOMPENSA!</div>
          <div style="font-size:1.05rem;font-weight:700;">${reward.name}</div>
          <div style="font-size:0.9rem;opacity:0.8;">${reward.note}</div>
        </div>
      </div>
    `;
    this.el.style.opacity = '1';
    this.el.style.transform = 'translateX(-50%) translateY(0)';
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.el.style.opacity = '0';
      this.el.style.transform = 'translateX(-50%) translateY(16px)';
    }, duration);
  }
}
