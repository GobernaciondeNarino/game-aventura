// Funciones de "horneado" del terreno, compartidas por el hilo principal y
// por los Web Workers: calculan filas de la malla de terreno y de las texturas
// de altura/superficie a partir de terrainMath.js.

import { heightAt, surfaceAt } from './terrainMath.js';

/**
 * Deformación del grid: concentra resolución en el centro jugable y la
 * estira hacia el horizonte. u ∈ [-1, 1] → coordenada normalizada [-1, 1].
 */
export const WARP_C = 0.3;
export function warp(u) {
  return WARP_C * u + (1 - WARP_C) * u * u * u;
}

/**
 * Alturas de las filas [rowStart, rowEnd) de un grid deformado de
 * (segments+1)² vértices que cubre ±extent metros.
 */
export function bakeGridRows(segments, extent, rowStart, rowEnd) {
  const n = segments + 1;
  const out = new Float32Array((rowEnd - rowStart) * n);
  let k = 0;
  for (let j = rowStart; j < rowEnd; j++) {
    const z = extent * warp((j / segments) * 2 - 1);
    for (let i = 0; i < n; i++) {
      const x = extent * warp((i / segments) * 2 - 1);
      out[k++] = heightAt(x, z);
    }
  }
  return out;
}

/**
 * Filas [rowStart, rowEnd) de las texturas de mapa (grid regular de `size`
 * texeles cubriendo ±half metros): altura (float) y superficie RGBA8
 * (hard, sand, water, dirt).
 */
export function bakeMapRows(size, half, rowStart, rowEnd) {
  const rows = rowEnd - rowStart;
  const heights = new Float32Array(rows * size);
  const surface = new Uint8Array(rows * size * 4);
  const step = (half * 2) / size;
  let k = 0;
  for (let j = rowStart; j < rowEnd; j++) {
    const z = -half + (j + 0.5) * step;
    for (let i = 0; i < size; i++) {
      const x = -half + (i + 0.5) * step;
      const s = surfaceAt(x, z);
      heights[k] = heightAt(x, z);
      surface[k * 4] = s.hard * 255;
      surface[k * 4 + 1] = s.sand * 255;
      surface[k * 4 + 2] = s.water * 255;
      surface[k * 4 + 3] = s.dirt * 255;
      k++;
    }
  }
  return { heights, surface };
}
