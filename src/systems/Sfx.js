// Efectos de sonido sintetizados con Web Audio (sin archivos externos).
// Cada efecto es una secuencia corta de tonos con envolvente exponencial.
// El AudioContext se crea de forma perezosa y se reanuda si está suspendido.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  /** Devuelve el AudioContext (creándolo si hace falta) o null si no hay soporte. */
  _ensure() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** Reproduce un tono de `frequency` Hz durante `duration` s tras `delay` s. */
  _tone(frequency, duration, { type = 'sine', vol = 0.18, delay = 0 } = {}) {
    const ctx = this._ensure();
    if (!ctx || !this.enabled) return;
    const startAt = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(vol, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  /** Respuesta correcta. */
  correct() {
    this._tone(660, 0.12, { type: 'triangle' });
    this._tone(990, 0.18, { type: 'triangle', delay: 0.1 });
  }

  /** Respuesta incorrecta. */
  wrong() {
    this._tone(200, 0.28, { type: 'sawtooth', vol: 0.14 });
  }

  /** Gol anotado. */
  goal() {
    this._tone(523, 0.12, { type: 'square', vol: 0.14 });
    this._tone(659, 0.12, { type: 'square', vol: 0.14, delay: 0.1 });
    this._tone(784, 0.2, { type: 'square', vol: 0.14, delay: 0.2 });
  }

  /** Zona deportiva descubierta. */
  zone() {
    this._tone(880, 0.1, { type: 'sine', vol: 0.13 });
  }

  /** Pista recibida de un NPC. */
  hint() {
    this._tone(740, 0.1, { type: 'triangle', vol: 0.13 });
    this._tone(880, 0.12, { type: 'triangle', vol: 0.13, delay: 0.08 });
  }

  /** Laberinto completado. */
  maze() {
    this._tone(659, 0.1, { type: 'triangle' });
    this._tone(880, 0.1, { type: 'triangle', delay: 0.09 });
    this._tone(1175, 0.22, { type: 'triangle', delay: 0.18 });
  }
}
