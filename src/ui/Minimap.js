// Minimapa circular (arriba a la derecha) dibujado en un <canvas>.
// Proyecta el mundo (radio WORLD_RADIUS) sobre un disco de RADIUS_PX píxeles:
// marcadores fijos (deportivo, laberinto, bosque, playa), los sitios turísticos
// (dorado si ya fueron visitados) y un triángulo blanco con la orientación del jugador.

/** Lado del canvas en píxeles. */
const SIZE = 150;
/** Centro del canvas. */
const HALF = SIZE / 2;
/** Radio del disco donde se proyecta el mundo. */
const RADIUS_PX = 64;
/** Radio del mundo (unidades de escena) que cabe en el minimapa. */
const WORLD_RADIUS = 290;

/** Puntos de interés fijos: D = deportivo, L = laberinto, B = bosque, P = playa. */
const MINIMAP_MARKERS = [
  { x: 0, z: 165, color: '#00e5ff', label: 'D' },
  { x: 0, z: -185, color: '#b06bff', label: 'L' },
  { x: -200, z: 0, color: '#3f8f3a', label: 'B' },
  { x: 250, z: 0, color: '#e6cf9b', label: 'P' },
];

export class Minimap {
  /** `siteManager` debe exponer `.sites` (lista con `position` y `visited`). */
  constructor(parent, siteManager) {
    this.sites = siteManager;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText = `
      position:absolute; top:16px; right:16px;
      width:${SIZE}px; height:${SIZE}px;
      pointer-events:none; z-index:14;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.4));
    `;
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  /** Convierte coordenadas de mundo (x, z) a píxeles del minimapa. */
  _map(x, z) {
    return {
      mx: HALF + x / WORLD_RADIUS * RADIUS_PX,
      my: HALF - z / WORLD_RADIUS * RADIUS_PX,
    };
  }

  update(player) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();

    // Fondo circular con borde dorado
    ctx.beginPath();
    ctx.arc(HALF, HALF, RADIUS_PX + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12,36,57,0.8)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e8a020';
    ctx.stroke();

    // Recorte circular para todo lo que sigue
    ctx.beginPath();
    ctx.arc(HALF, HALF, RADIUS_PX + 4, 0, Math.PI * 2);
    ctx.clip();

    // Marcadores fijos (cuadrados)
    for (const marker of MINIMAP_MARKERS) {
      const { mx, my } = this._map(marker.x, marker.z);
      ctx.fillStyle = marker.color;
      ctx.fillRect(mx - 3, my - 3, 6, 6);
    }

    // Sitios turísticos (puntos)
    for (const site of this.sites.sites) {
      const { mx, my } = this._map(site.position.x, site.position.z);
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = site.visited ? '#ffd479' : '#9aa2ad';
      ctx.fill();
    }

    // Triángulo del jugador orientado según rotationY
    const { mx, my } = this._map(player.state.x, player.state.z);
    const rotation = player.state.rotationY;
    const sinR = Math.sin(rotation);
    const cosR = Math.cos(rotation);
    const forwardX = sinR;
    const forwardY = -cosR;
    const rightX = -forwardY;
    const rightY = forwardX;
    ctx.beginPath();
    ctx.moveTo(mx + forwardX * 6, my + forwardY * 6);
    ctx.lineTo(mx - forwardX * 4 + rightX * 4, my - forwardY * 4 + rightY * 4);
    ctx.lineTo(mx - forwardX * 4 - rightX * 4, my - forwardY * 4 - rightY * 4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#1a5276';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}
