// Texturas procedurales generadas en tiempo de carga (sin descargar archivos).
//
// Todas son "tileables": el ruido se muestrea sobre un toro 4D, de modo que
// los bordes encajan y pueden repetirse sobre el terreno sin costuras.

import {
  CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat,
  RepeatWrapping, SRGBColorSpace, UnsignedByteType,
} from 'three';
import { createNoise4D } from 'simplex-noise';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noise4D = createNoise4D(mulberry32(777));

// Ruido fBm tileable en [0,1] evaluado en coordenadas normalizadas (u,v) ∈ [0,1).
function tileableFbm(u, v, octaves, seedOffset) {
  const TAU = Math.PI * 2;
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const r = freq;
    const nx = Math.cos(u * TAU) * r + seedOffset;
    const ny = Math.sin(u * TAU) * r - seedOffset * 0.5;
    const nz = Math.cos(v * TAU) * r + seedOffset * 1.7;
    const nw = Math.sin(v * TAU) * r + seedOffset * 0.3;
    sum += amp * noise4D(nx, ny, nz, nw);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm * 0.5 + 0.5;
}

let cachedNoise = null;
let cachedNoiseNormal = null;

/**
 * Textura RGBA tileable con cuatro canales de ruido independientes
 * (frecuencias base distintas). Se usa para variar color/rugosidad del
 * terreno, para la arena y para el agua.
 */
export function getNoiseTexture(size = 256) {
  if (cachedNoise) return cachedNoise;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const i = (y * size + x) * 4;
      data[i] = tileableFbm(u, v, 4, 0) * 255;
      data[i + 1] = tileableFbm(u * 2, v * 2, 3, 11) * 255;
      data[i + 2] = tileableFbm(u * 4, v * 4, 3, 23) * 255;
      data[i + 3] = tileableFbm(u * 8, v * 8, 2, 37) * 255;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cachedNoise = tex;
  return tex;
}

/**
 * Mapa de normales tileable derivado del canal rojo del ruido (relieve fino
 * de tierra/roca).
 */
export function getNoiseNormalTexture(size = 256, strength = 2.2) {
  if (cachedNoiseNormal) return cachedNoiseNormal;
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x] = tileableFbm(x / size, y / size, 5, 51);
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hl = height[y * size + ((x - 1 + size) % size)];
      const hr = height[y * size + ((x + 1) % size)];
      const hd = height[((y - 1 + size) % size) * size + x];
      const hu = height[((y + 1) % size) * size + x];
      let nx = (hl - hr) * strength * size * 0.02;
      let ny = (hd - hu) * strength * size * 0.02;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const nz = 1 / len;
      const i = (y * size + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cachedNoiseNormal = tex;
  return tex;
}

/**
 * Mapa de normales de agua: suma de ondas tileables de distintas direcciones
 * más ruido fino. Sirve para el mar (Water de Three.js) y para lagos/río.
 */
export function makeWaterNormalTexture(size = 512) {
  const TAU = Math.PI * 2;
  const waves = [
    { kx: 3, ky: 1, amp: 0.22 }, { kx: -2, ky: 5, amp: 0.16 }, { kx: 7, ky: -3, amp: 0.1 },
    { kx: 11, ky: 6, amp: 0.06 },
  ];
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let h = 0;
      for (const w of waves) h += w.amp * Math.sin((w.kx * u + w.ky * v) * TAU);
      h += (tileableFbm(u * 3, v * 3, 4, 91) - 0.5) * 1.6;
      h += (tileableFbm(u * 9, v * 9, 2, 97) - 0.5) * 0.35;
      height[y * size + x] = h;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const k = size * 0.009;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hl = height[y * size + ((x - 1 + size) % size)];
      const hr = height[y * size + ((x + 1) % size)];
      const hd = height[((y - 1 + size) % size) * size + x];
      const hu = height[((y + 1) % size) * size + x];
      let nx = (hl - hr) * k;
      let ny = (hd - hu) * k;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Capa de nubes: alfa fBm con umbral suave (cúmulos dispersos), tileable.
 */
export function makeCloudTexture(size = 1024, coverage = 0.48) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const step = 2; // muestreo a mitad de resolución y relleno 2x2 (rápido)
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const u = x / size;
      const v = y / size;
      const base = tileableFbm(u, v, 5, 131);
      const detail = tileableFbm(u * 3, v * 3, 3, 141);
      let a = (base - (1 - coverage)) * 2.6 + (detail - 0.5) * 0.35;
      a = Math.min(1, Math.max(0, a));
      a = a * a * (3 - 2 * a);
      const shade = 200 + 55 * detail;
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const i = ((y + dy) * size + (x + dx)) * 4;
          d[i] = shade;
          d[i + 1] = shade;
          d[i + 2] = 255;
          d[i + 3] = a * 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Hoja seca/verde para las partículas de hojas al viento (con nervadura).
 */
export function makeLeafParticleTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.44);
  ctx.bezierCurveTo(size * 0.36, -size * 0.3, size * 0.38, size * 0.2, 0, size * 0.46);
  ctx.bezierCurveTo(-size * 0.38, size * 0.2, -size * 0.36, -size * 0.3, 0, -size * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.4);
  ctx.lineTo(0, size * 0.42);
  ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    const y = i * size * 0.1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size * 0.22 * (i % 2 ? 1 : -1), y - size * 0.08);
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * Textura de espuma/agua para la cascada: vetas verticales blancas.
 */
export function makeWaterfallTexture(width = 128, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(210,235,255,0.55)');
  grad.addColorStop(1, 'rgba(160,205,240,0.75)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const rnd = mulberry32(4242);
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = rnd() * width;
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + rnd() * 0.55})`;
    ctx.lineWidth = 1 + rnd() * 3;
    ctx.beginPath();
    const y0 = rnd() * height;
    ctx.moveTo(x, y0);
    ctx.lineTo(x + (rnd() - 0.5) * 6, y0 + 30 + rnd() * 90);
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Sprite circular suave (partículas de niebla/espuma). */
export function makeSoftParticleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}
