// Panel informativo inferior que aparece al acercarse a un sitio turístico:
// muestra nombre, municipio, descripción y el estado de la pregunta
// (pulsar E, sitio completado o tiempo de espera). Inyecta una sola vez
// el CSS de la tecla animada `.ip-keycap`.

let stylesInjected = false;

/** Inserta en <head> los estilos compartidos del panel (solo la primera vez). */
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ipKeyPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232,160,32,0.7); }
      50% { transform: scale(1.12); box-shadow: 0 0 18px 4px rgba(232,160,32,0.55); }
    }
    .ip-keycap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px; height: 38px;
      margin-right: 12px;
      background: linear-gradient(180deg, #ffd479, #e8a020);
      color: #0c2439;
      font-weight: 800;
      font-size: 1.25rem;
      border-radius: 9px;
      border: 2px solid #fff3d6;
      box-shadow: 0 3px 0 #a86f12;
      animation: ipKeyPulse 1.1s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

export class InfoPanel {
  constructor(parent) {
    injectStyles();
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 32px;
      transform: translateX(-50%) translateY(16px);
      width: min(560px, 86vw);
      box-sizing: border-box;
      padding: 16px 22px;
      background: rgba(12, 36, 57, 0.88);
      border: 2px solid #e8a020;
      border-radius: 14px;
      color: #f5f5f5;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.28s ease, transform 0.28s ease;
      z-index: 12;
    `;
    this.el.innerHTML = `
      <div class="ip-name" style="font-size:1.25rem;font-weight:700;color:#ffd479;"></div>
      <div class="ip-muni" style="font-size:0.85rem;opacity:0.8;margin:2px 0 8px;"></div>
      <div class="ip-desc" style="font-size:0.95rem;line-height:1.4;"></div>
      <div class="ip-status" style="margin-top:12px;min-height:40px;display:flex;align-items:center;"></div>
    `;
    parent.appendChild(this.el);
    this._name = this.el.querySelector('.ip-name');
    this._muni = this.el.querySelector('.ip-muni');
    this._desc = this.el.querySelector('.ip-desc');
    this._status = this.el.querySelector('.ip-status');
    this._currentId = null;
    this._visible = false;
    this._statusKey = null;
  }

  /** Muestra el panel para `site` con `status = { type, seconds? }`. */
  show(site, status) {
    if (site.id !== this._currentId) {
      this._currentId = site.id;
      this._name.textContent = site.name;
      this._muni.textContent = site.municipio;
      this._desc.textContent = site.description;
    }
    this._renderStatus(status);
    if (!this._visible) {
      this._visible = true;
      this.el.style.opacity = '1';
      this.el.style.transform = 'translateX(-50%) translateY(0)';
    }
  }

  /** Redibuja la fila de estado solo cuando cambia (tipo o segundos restantes). */
  _renderStatus(status) {
    const key = `${status.type}:${status.seconds || ''}`;
    if (key === this._statusKey) return;
    this._statusKey = key;
    if (status.type === 'prompt') {
      this._status.innerHTML = `
        <span class="ip-keycap">E</span>
        <span style="font-weight:700;color:#fff;">para responder la pregunta</span>
      `;
    } else if (status.type === 'done') {
      this._status.innerHTML = '<span style="font-weight:700;color:#7ee29a;font-size:1.05rem;">✓ Sitio completado</span>';
    } else if (status.type === 'cooldown') {
      this._status.innerHTML = `<span style="font-weight:700;color:#ff9a9a;">Inténtalo de nuevo en ${status.seconds}s</span>`;
    } else {
      this._status.innerHTML = '';
    }
  }

  hide() {
    if (!this._visible && this._currentId === null) return;
    this._visible = false;
    this._currentId = null;
    this._statusKey = null;
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateX(-50%) translateY(16px)';
  }
}
