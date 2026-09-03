// Contador de FPS de depuración (arriba a la izquierda). Solo se activa si la
// URL lleva `?fps=1`. Promedia las últimas 30 muestras y refresca cada 250 ms,
// coloreando el texto según el rendimiento (verde / amarillo / rojo).

/** Número de muestras de dt que se promedian. */
const SAMPLE_COUNT = 30;
/** Intervalo mínimo entre actualizaciones del texto (ms). */
const UPDATE_INTERVAL_MS = 250;

/** Lee el parámetro `fps=1` de la URL de forma segura. */
function isFpsEnabled() {
  try {
    return new URLSearchParams(window.location.search).get('fps') === '1';
  } catch {
    return false;
  }
}

export class FpsCounter {
  constructor(parent) {
    this.enabled = isFpsEnabled();
    if (!this.enabled) return;
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 4px 10px;
      background: rgba(0,0,0,0.7);
      color: #00f0a0;
      font: 700 13px/1 ui-monospace, "Courier New", monospace;
      border-radius: 6px;
      pointer-events: none;
      z-index: 50;
    `;
    this.el.textContent = 'FPS --';
    parent.appendChild(this.el);
    this._samples = [];
    this._lastUpdate = 0;
  }

  /** Llamar una vez por fotograma con el delta de tiempo `dt` (segundos). */
  tick(dt) {
    if (!this.enabled) return;
    const fps = 1 / Math.max(dt, 1e-4);
    this._samples.push(fps);
    if (this._samples.length > SAMPLE_COUNT) this._samples.shift();
    const now = performance.now();
    if (now - this._lastUpdate > UPDATE_INTERVAL_MS) {
      const average = this._samples.reduce((sum, value) => sum + value, 0) / this._samples.length;
      this.el.textContent = `FPS ${average.toFixed(0)}`;
      this.el.style.color = average >= 55 ? '#00f0a0' : average >= 30 ? '#ffcf30' : '#ff5050';
      this._lastUpdate = now;
    }
  }
}
