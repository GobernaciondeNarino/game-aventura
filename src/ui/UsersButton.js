// Botón de "Jugadores" (abajo a la derecha) que muestra la tabla de posiciones
// del Leaderboard local: nombre, puntaje, sitios completados y recompensas.

const ICON_USERS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f7d84" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';

/** Escapa caracteres especiales de HTML en textos escritos por el usuario. */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

export class UsersButton {
  /** `leaderboard` debe exponer `list()` → [{ name, score, sites, rewards }]. */
  constructor(parent, leaderboard) {
    this.lb = leaderboard;
    this.btn = document.createElement('button');
    this.btn.title = 'Jugadores';
    this.btn.innerHTML = ICON_USERS;
    this.btn.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 112px;
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
      width: min(420px, 86vw);
      max-height: 60vh;
      overflow-y: auto;
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
    parent.appendChild(this.panel);
  }

  toggle() {
    if (this.panel.style.display === 'block') {
      this.panel.style.display = 'none';
      return;
    }
    this._render();
    this.panel.style.display = 'block';
  }

  /** Reconstruye la tabla a partir del leaderboard actual. */
  _render() {
    const entries = this.lb.list();
    const rows = entries.map((entry, index) => `
        <tr>
          <td style="padding:4px 6px;color:#0f7d84;font-weight:700;">${index + 1}</td>
          <td style="padding:4px 6px;">${escapeHtml(entry.name)}</td>
          <td style="padding:4px 6px;text-align:right;font-weight:700;">${entry.score}</td>
          <td style="padding:4px 6px;text-align:right;">${entry.sites || 0}/10</td>
          <td style="padding:4px 6px;font-size:1.1rem;">${(entry.rewards || []).join(' ')}</td>
        </tr>`).join('');
    this.panel.innerHTML = `
      <div style="font-size:1.05rem;font-weight:800;color:#0f7d84;margin-bottom:10px;">🏆 Jugadores</div>
      ${entries.length ? `<table style="width:100%;border-collapse:collapse;font-size:0.92rem;">
              <thead><tr style="border-bottom:1px solid #0f7d84;">
                <th style="text-align:left;padding:4px 6px;">#</th>
                <th style="text-align:left;padding:4px 6px;">Nombre</th>
                <th style="text-align:right;padding:4px 6px;">Puntaje</th>
                <th style="text-align:right;padding:4px 6px;">Sitios</th>
                <th style="text-align:right;padding:4px 6px;">Recompensas</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>` : '<div style="opacity:0.7;font-size:0.95rem;">Aún no hay jugadores registrados.</div>'}
    `;
  }
}
