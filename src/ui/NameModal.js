// Modal que pide el nombre del jugador al completar un sitio por primera vez.
// `open(message, defaultName, onSubmit)` muestra el formulario; al pulsar
// "Guardar" o Enter llama a `onSubmit(name)` ("Anónimo" si queda vacío).

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

export class NameModal {
  constructor(parent) {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(6, 18, 30, 0.55);
      pointer-events: auto;
      z-index: 50;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    `;
    this.box = document.createElement('div');
    this.box.style.cssText = `
      width: min(420px, 90vw);
      padding: 22px 26px;
      background: rgba(255,255,255,0.98);
      border: 2px solid #0f7d84;
      border-radius: 14px;
      color: #0c2439;
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
    `;
    this.overlay.appendChild(this.box);
    parent.appendChild(this.overlay);
    this._onSubmit = null;
  }

  open(message, defaultName, onSubmit) {
    this._onSubmit = onSubmit;
    this.box.innerHTML = `
      <div style="font-weight:800;color:#0f7d84;font-size:1.1rem;margin-bottom:4px;">¡Completaste un sitio!</div>
      <div style="font-size:0.95rem;margin-bottom:14px;">${escapeHtml(message)}</div>
      <label style="display:block;font-size:0.9rem;margin-bottom:6px;">¿Cómo te llamas?</label>
      <input class="nm-input" type="text" maxlength="24" value="${escapeHtml(defaultName || '')}" style="
        width:100%; box-sizing:border-box;
        padding:10px 12px; font-size:1rem;
        border:1.5px solid #0f7d84; border-radius:8px;
        outline:none;
      ">
      <button class="nm-ok" style="
        margin-top:14px; width:100%;
        padding:10px 16px; font-size:1rem; font-weight:700;
        background:#0f7d84; color:#fff;
        border:none; border-radius:8px;
        cursor:pointer;
      ">Guardar</button>
    `;
    const input = this.box.querySelector('.nm-input');
    const okButton = this.box.querySelector('.nm-ok');
    const submit = () => {
      const name = (input.value || '').trim() || 'Anónimo';
      this.overlay.style.display = 'none';
      if (this._onSubmit) this._onSubmit(name);
    };
    okButton.addEventListener('click', submit);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submit();
    });
    this.overlay.style.display = 'flex';
    setTimeout(() => input.focus(), 50);
  }
}
