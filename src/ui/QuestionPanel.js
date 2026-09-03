// Modal de pregunta de trivia: muestra el enunciado del sitio, las respuestas
// barajadas y el resultado (verde = correcta, rojo = la elegida si falló).
// `onAnswer(site, index, answer)` debe devolver `{ correct, delta }`;
// el modal se cierra solo 1.5 s después de responder o con Esc.

/** Devuelve una copia barajada (Fisher-Yates) de `array`. */
function shuffle(array, random = Math.random) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

export class QuestionPanel {
  constructor(parent, { onAnswer, onClose } = {}) {
    this.onAnswer = onAnswer || (() => {});
    this.onClose = onClose || (() => {});
    this.isOpen = false;
    this._locked = false;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(6, 18, 30, 0.55);
      pointer-events: auto;
      z-index: 30;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    `;
    this.box = document.createElement('div');
    this.box.style.cssText = `
      width: min(560px, 90vw);
      box-sizing: border-box;
      padding: 26px 28px;
      background: rgba(12, 36, 57, 0.96);
      border: 2px solid #e8a020;
      border-radius: 16px;
      color: #f5f5f5;
      box-shadow: 0 18px 50px rgba(0,0,0,0.55);
    `;
    this.overlay.appendChild(this.box);
    parent.appendChild(this.overlay);

    // Clic fuera de la caja cierra el modal
    this.overlay.addEventListener('mousedown', (event) => {
      if (event.target === this.overlay) this.close();
    });
    this._onKey = (event) => {
      if (this.isOpen && event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', this._onKey);
  }

  /** Abre el modal con la pregunta `question` (índice `index`) del sitio `site`. */
  open(site, index, question) {
    this.isOpen = true;
    this._locked = false;
    this._site = site;
    this._index = index;
    this._question = question;
    const answers = shuffle(question.answers);
    this.box.innerHTML = '';

    const title = document.createElement('div');
    title.textContent = site.name;
    title.style.cssText = 'color:#ffd479;font-weight:700;font-size:1.05rem;margin-bottom:4px;';
    this.box.appendChild(title);

    const statement = document.createElement('div');
    statement.textContent = question.text;
    statement.style.cssText = 'font-size:1.15rem;line-height:1.4;margin:6px 0 18px;';
    this.box.appendChild(statement);

    this._buttons = [];
    for (const answer of answers) {
      const button = document.createElement('button');
      button.textContent = answer.text;
      button.style.cssText = `
        display:block; width:100%; text-align:left;
        margin:8px 0; padding:13px 16px;
        background:#163d63; color:#f5f5f5;
        border:2px solid #2a6a9e; border-radius:10px;
        font-size:1rem; cursor:pointer;
        transition: background 0.15s, border-color 0.15s;
      `;
      button.addEventListener('mouseenter', () => {
        if (!this._locked) button.style.background = '#1f5286';
      });
      button.addEventListener('mouseleave', () => {
        if (!this._locked) button.style.background = '#163d63';
      });
      button.addEventListener('click', () => this._choose(answer, button));
      this.box.appendChild(button);
      this._buttons.push({ btn: button, ans: answer });
    }

    this._feedback = document.createElement('div');
    this._feedback.style.cssText = 'min-height:24px;margin-top:14px;font-weight:700;font-size:1.05rem;';
    this.box.appendChild(this._feedback);

    const escHint = document.createElement('div');
    escHint.textContent = 'Esc para cerrar';
    escHint.style.cssText = 'margin-top:8px;font-size:0.8rem;opacity:0.6;';
    this.box.appendChild(escHint);

    this.overlay.style.display = 'flex';
  }

  /** Marca la respuesta elegida, colorea los botones y muestra el resultado. */
  _choose(answer, button) {
    if (this._locked) return;
    this._locked = true;
    for (const { btn, ans } of this._buttons) {
      if (ans.correct) {
        btn.style.background = '#1e7a3c';
        btn.style.borderColor = '#2fbf5f';
      } else if (ans === answer) {
        btn.style.background = '#8a2b2b';
        btn.style.borderColor = '#c44';
      }
      btn.style.cursor = 'default';
    }
    const result = this.onAnswer(this._site, this._index, answer);
    if (result && result.correct) {
      this._feedback.style.color = '#7ee29a';
      this._feedback.textContent = `¡Correcto!  +${result.delta} puntos`;
    } else {
      this._feedback.style.color = '#ff9a9a';
      this._feedback.textContent = `Incorrecto.  ${result ? result.delta : ''} puntos · espera 30s`;
    }
    setTimeout(() => this.close(), 1500);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.onClose();
  }
}
