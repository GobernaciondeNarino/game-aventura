// Web Worker: hornea filas del terreno en paralelo (ver Terrain.js).
import { bakeGridRows, bakeMapRows } from './terrainBake.js';

self.onmessage = (event) => {
  const { id, kind, rowStart, rowEnd } = event.data;
  if (kind === 'grid') {
    const { segments, extent } = event.data;
    const heights = bakeGridRows(segments, extent, rowStart, rowEnd);
    self.postMessage({ id, heights }, [heights.buffer]);
  } else if (kind === 'map') {
    const { size, half } = event.data;
    const { heights, surface } = bakeMapRows(size, half, rowStart, rowEnd);
    self.postMessage({ id, heights, surface }, [heights.buffer, surface.buffer]);
  }
};
