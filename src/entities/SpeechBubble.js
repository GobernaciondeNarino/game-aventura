// Bocadillo de diálogo: un Sprite con una textura de canvas generada al vuelo
// (fondo blanco redondeado, borde azul, puntita inferior y texto centrado).
// Las texturas se cachean por texto para no regenerarlas en cada uso.
import { SpriteMaterial, Sprite, CanvasTexture } from 'three';

const PADDING = 22;
const MAX_LINE_WIDTH = 360;
const LINE_HEIGHT = 38;
const FONT = 'bold 30px system-ui, sans-serif';
const BUBBLE_HEIGHT = 1.1;

export class SpeechBubble {
  constructor() {
    this.material = new SpriteMaterial({ transparent: true, depthTest: true });
    this.sprite = new Sprite(this.material);
    this.sprite.position.set(0, 3, 0);
    this.sprite.visible = false;
    this._timer = 0;
    this._cache = new Map();
  }

  // Muestra el texto durante `duration` segundos.
  show(text, duration = 3) {
    const { texture, aspect } = this._textureFor(text);
    this.material.map = texture;
    this.material.needsUpdate = true;
    const height = BUBBLE_HEIGHT;
    this.sprite.scale.set(height * aspect, height, 1);
    this.sprite.visible = true;
    this._timer = duration;
  }

  get visible() {
    return this.sprite.visible;
  }

  update(dt) {
    if (this.sprite.visible) {
      this._timer -= dt;
      if (this._timer <= 0) this.sprite.visible = false;
    }
  }

  // Genera (o recupera de la caché) la textura del bocadillo para un texto.
  _textureFor(text) {
    let entry = this._cache.get(text);
    if (entry) return entry;

    const padding = PADDING;
    const measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = FONT;

    // Partir el texto en líneas que quepan en MAX_LINE_WIDTH.
    const words = text.split(' ');
    const lines = [];
    let current = '';
    const maxWidth = MAX_LINE_WIDTH;
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureCtx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);

    const lineHeight = LINE_HEIGHT;
    const width = Math.min(maxWidth, Math.max(...lines.map(line => measureCtx.measureText(line).width))) + padding * 2;
    const height = lines.length * lineHeight + padding * 2 + 16;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Cuerpo del bocadillo
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#1a5276';
    ctx.lineWidth = 4;
    roundRect(ctx, 4, 4, width - 8, height - 20, 16);
    ctx.fill();
    ctx.stroke();

    // Puntita inferior
    ctx.beginPath();
    ctx.moveTo(width / 2 - 12, height - 16);
    ctx.lineTo(width / 2 + 12, height - 16);
    ctx.lineTo(width / 2, height - 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // Texto
    ctx.fillStyle = '#0c2439';
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => ctx.fillText(line, width / 2, padding + 16 + index * lineHeight));

    entry = { texture: new CanvasTexture(canvas), aspect: width / height };
    this._cache.set(text, entry);
    return entry;
  }
}

// Traza un rectángulo con esquinas redondeadas (sin rellenar).
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
