// Botón redondo (abajo a la derecha) que activa o silencia la música de fondo.
// El <audio> se crea de forma perezosa y arranca con la primera interacción
// del usuario (pointerdown/keydown) para respetar las políticas de autoplay.

const ICON_SOUND_ON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>';
const ICON_SOUND_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="22" y1="9" x2="16" y2="15"></line><line x1="16" y1="9" x2="22" y2="15"></line></svg>';

/** Volumen de la música de fondo. */
const MUSIC_VOLUME = 0.45;

export class AudioToggle {
  constructor(parent, src = './aventura-narino.mp3') {
    this.src = src;
    this.audio = null;
    this.enabled = true;

    this.btn = document.createElement('button');
    this.btn.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #0f7d84;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.94);
      color: #0f7d84;
      cursor: pointer;
      pointer-events: auto;
      z-index: 40;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      transition: background 0.15s, transform 0.1s;
    `;
    this.btn.addEventListener('mouseenter', () => {
      this.btn.style.background = '#e6f4f5';
    });
    this.btn.addEventListener('mouseleave', () => {
      this.btn.style.background = 'rgba(255, 255, 255, 0.94)';
    });
    this.btn.addEventListener('click', () => this.toggle());
    parent.appendChild(this.btn);

    // Arranque diferido: primera interacción del usuario
    this._startOnce = () => {
      this._ensureAudio();
      if (this.enabled) this.audio.play().catch(() => {});
      window.removeEventListener('pointerdown', this._startOnce);
      window.removeEventListener('keydown', this._startOnce);
    };
    window.addEventListener('pointerdown', this._startOnce);
    window.addEventListener('keydown', this._startOnce);
    this._render();
  }

  _ensureAudio() {
    if (!this.audio) {
      this.audio = new Audio(this.src);
      this.audio.loop = true;
      this.audio.volume = MUSIC_VOLUME;
    }
  }

  toggle() {
    this._ensureAudio();
    this.enabled = !this.enabled;
    if (this.enabled) this.audio.play().catch(() => {});
    else this.audio.pause();
    this._render();
  }

  _render() {
    this.btn.innerHTML = this.enabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
    this.btn.title = this.enabled ? 'Silenciar música' : 'Activar música';
  }
}
