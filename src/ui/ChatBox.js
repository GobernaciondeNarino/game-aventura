// Chat del modo multijugador: registro de mensajes (abajo a la izquierda),
// contador de jugadores en línea y campo de texto que se abre con Enter o con
// el botón 💬. Mientras se escribe, las teclas no llegan al juego.

const MAX_LINES = 6;

export class ChatBox {
  /**
   * @param {HTMLElement} parent
   * @param {{ onSend: (text: string) => void }} opts
   */
  constructor(parent, { onSend }) {
    this.onSend = onSend;
    this.isOpen = false;

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position:absolute; left:16px; bottom:160px; width:min(360px, 70vw);
      display:flex; flex-direction:column; gap:6px; pointer-events:none; z-index:15;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    `;
    parent.appendChild(this.root);

    this.online = document.createElement('div');
    this.online.style.cssText = `
      align-self:flex-start; padding:4px 10px; border-radius:8px;
      background:rgba(12,36,57,0.7); border:1px solid rgba(0,229,255,0.45);
      color:#eaf6ff; font-size:0.8rem; font-weight:700;
    `;
    this.online.textContent = '🌐 Conectando…';
    this.root.appendChild(this.online);

    this.log = document.createElement('div');
    this.log.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
    this.root.appendChild(this.log);

    this.form = document.createElement('div');
    this.form.style.cssText = `
      display:none; align-items:center; gap:6px; pointer-events:auto;
    `;
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.maxLength = 140;
    this.input.placeholder = 'Escribe un mensaje y pulsa Enter (Esc para cerrar)';
    this.input.style.cssText = `
      flex:1; padding:9px 12px; border-radius:10px; border:2px solid #e8a020;
      background:rgba(12,36,57,0.92); color:#fff; font-size:0.95rem; outline:none;
    `;
    // Evita que WASD/espacio muevan al jugador mientras se escribe.
    for (const type of ['keydown', 'keyup', 'keypress']) {
      this.input.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type !== 'keydown') return;
        if (e.key === 'Enter') {
          this._submit();
        } else if (e.key === 'Escape') {
          this.close();
        }
      });
    }
    this.form.appendChild(this.input);
    this.root.appendChild(this.form);

    // Botón 💬 (útil en móvil) junto a los botones inferiores.
    this.btn = document.createElement('button');
    this.btn.title = 'Chat';
    this.btn.textContent = '💬';
    this.btn.style.cssText = `
      position:absolute; bottom:16px; right:160px; width:40px; height:40px;
      display:flex; align-items:center; justify-content:center;
      border:1.5px solid #0f7d84; border-radius:50%; background:rgba(255,255,255,0.94);
      cursor:pointer; pointer-events:auto; z-index:40; font-size:1.1rem;
      box-shadow:0 3px 8px rgba(0,0,0,0.25);
    `;
    this.btn.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    parent.appendChild(this.btn);

    this._onKey = (e) => {
      if (e.key === 'Enter' && !this.isOpen && !e.repeat && !this._modalOpen()) {
        e.preventDefault();
        this.open();
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  _modalOpen() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  }

  open() {
    this.isOpen = true;
    this.form.style.display = 'flex';
    setTimeout(() => this.input.focus(), 0);
  }

  close() {
    this.isOpen = false;
    this.form.style.display = 'none';
    this.input.blur();
  }

  _submit() {
    const text = this.input.value.trim();
    this.input.value = '';
    if (text) this.onSend(text);
    this.close();
  }

  setOnline(count) {
    this.online.textContent = count > 1 ? `🌐 En línea: ${count} jugadores` : '🌐 En línea: solo tú (por ahora)';
  }

  setStatus(text) {
    this.online.textContent = text;
  }

  addMessage(name, text, isSelf = false, isSystem = false) {
    const line = document.createElement('div');
    line.style.cssText = `
      padding:6px 10px; border-radius:10px; font-size:0.88rem; line-height:1.3;
      background:${isSystem ? 'rgba(20,48,30,0.8)' : isSelf ? 'rgba(26,82,118,0.85)' : 'rgba(12,36,57,0.82)'};
      color:#f5f5f5; border:1px solid ${isSystem ? '#6fcf73' : isSelf ? '#00e5ff' : 'rgba(255,255,255,0.25)'};
      transition: opacity 1s ease;
    `;
    const strong = document.createElement('strong');
    strong.style.color = isSystem ? '#b8f0bb' : '#ffd479';
    strong.textContent = isSystem ? '' : `${name}: `;
    line.appendChild(strong);
    line.appendChild(document.createTextNode(text));
    this.log.appendChild(line);
    while (this.log.children.length > MAX_LINES) this.log.removeChild(this.log.firstChild);
    setTimeout(() => {
      line.style.opacity = '0';
      setTimeout(() => line.parentNode && line.parentNode.removeChild(line), 1100);
    }, 14000);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
  }
}
