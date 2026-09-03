// Botón "i" (abajo a la derecha) que despliega un panel con la lista de
// controles del juego (teclado) y una nota sobre los controles táctiles.

const ICON_INFO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f7d84" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="11"></line><circle cx="12" cy="7.5" r="1.2" fill="#0f7d84"></circle></svg>';

/** Fila "tecla → acción" del panel de controles. */
function controlRow(key, action) {
  return `<div style="display:flex;align-items:center;gap:10px;margin:4px 0;">
    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:54px;padding:3px 8px;background:#0f7d84;color:#fff;border-radius:6px;font-weight:700;font-size:0.85rem;">${key}</span>
    <span style="font-size:0.92rem;">${action}</span>
  </div>`;
}

export class InfoButton {
  constructor(parent) {
    this.btn = document.createElement('button');
    this.btn.title = 'Controles';
    this.btn.innerHTML = ICON_INFO;
    this.btn.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 64px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #0f7d84;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.94);
      cursor: pointer;
      pointer-events: auto;
      z-index: 40;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
    `;
    this.btn.addEventListener('mouseenter', () => this.btn.style.background = '#e6f4f5');
    this.btn.addEventListener('mouseleave', () => this.btn.style.background = 'rgba(255,255,255,0.94)');
    this.btn.addEventListener('click', () => this.toggle());
    parent.appendChild(this.btn);

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: absolute;
      right: 16px;
      bottom: 64px;
      width: min(330px, 86vw);
      padding: 16px 20px;
      background: rgba(255,255,255,0.97);
      border: 2px solid #0f7d84;
      border-radius: 14px;
      color: #0c2439;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 22px rgba(0,0,0,0.3);
      pointer-events: auto;
      z-index: 41;
      display: none;
    `;
    this.panel.innerHTML = `
      <div style="font-size:1.05rem;font-weight:800;color:#0f7d84;margin-bottom:10px;">🎮 Controles</div>
      ${controlRow('WASD', 'mover')}
      ${controlRow('Shift', 'correr')}
      ${controlRow('Espacio', 'saltar')}
      ${controlRow('E', 'responder pregunta')}
      ${controlRow('F', 'patear / lanzar balón')}
      ${controlRow('G', 'agarrar / soltar balón')}
      ${controlRow('H', 'pedir pista a NPC')}
      ${controlRow('B', 'subir / bajar patineta')}
      <div style="margin-top:8px;font-size:0.8rem;opacity:0.7;">En móvil/tablet aparecen joystick y botones en pantalla.</div>
    `;
    parent.appendChild(this.panel);
  }

  toggle() {
    this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
  }

  close() {
    this.panel.style.display = 'none';
  }
}
