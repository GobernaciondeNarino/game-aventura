// Marcador del mundo: obelisco con una pantalla que muestra puntaje,
// preguntas respondidas, sitios visitados y zonas deportivas. La pantalla es
// un canvas que se redibuja con updateStats().
import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  DoubleSide,
  CanvasTexture,
} from 'three';
import { box, cyl, cone, block, PALETTE } from './primitives.js';

const SCREEN_Y = 4.2;
const SCREEN_WIDTH = 5.4;
const SCREEN_HEIGHT = 3.4;
const NEON = 58879;

export class Scoreboard {
  constructor() {
    this.group = new Group();
    this.solidRadius = 1.8;
    this._buildObelisk();
    this._buildScreen();
    this.updateStats({
      score: 0,
      answered: 0,
      total: 0,
      sitesCompleted: 0,
      sitesTotal: 10,
    });
  }

  // Base escalonada, columna hexagonal y remate dorado
  _buildObelisk() {
    const baseLower = block(3.2, .6, 3.2, PALETTE.stoneDark);
    baseLower.position.y = .3;
    this.group.add(baseLower);

    const baseUpper = block(2.4, .6, 2.4, PALETTE.stone);
    baseUpper.position.y = .9;
    this.group.add(baseUpper);

    const column = cyl(.7, 1.1, 9, PALETTE.ninoBlue, { seg: 6 });
    column.position.y = 5.7;
    this.group.add(column);

    const tip = cone(.9, 1.6, PALETTE.gold, { seg: 6, metalness: .5, roughness: .3 });
    tip.position.y = 11;
    this.group.add(tip);
  }

  // Pantalla translúcida con marco de neón y soportes laterales
  _buildScreen() {
    const screen = new Group();
    screen.position.set(0, SCREEN_Y, 1.3);
    this.group.add(screen);

    const backdrop = new Mesh(
      new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT),
      new MeshBasicMaterial({
        color: 397854,
        transparent: true,
        opacity: .55,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    backdrop.position.z = -.02;
    screen.add(backdrop);

    this._texture = makeScreenTexture();
    const display = new Mesh(
      new PlaneGeometry(SCREEN_WIDTH - .4, SCREEN_HEIGHT - .4),
      new MeshBasicMaterial({
        map: this._texture,
        transparent: true,
        opacity: .95,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    screen.add(display);

    const neonMaterial = new MeshBasicMaterial({ color: NEON });
    const halfWidth = SCREEN_WIDTH / 2;
    const halfHeight = SCREEN_HEIGHT / 2;
    const frameThickness = .1;
    const frameBars = [
      [SCREEN_WIDTH + frameThickness * 2, frameThickness, 0, halfHeight],
      [SCREEN_WIDTH + frameThickness * 2, frameThickness, 0, -halfHeight],
      [frameThickness, SCREEN_HEIGHT, -halfWidth, 0],
      [frameThickness, SCREEN_HEIGHT, halfWidth, 0],
    ];
    for (const [width, height, x, y] of frameBars) {
      const bar = new Mesh(new PlaneGeometry(width, height), neonMaterial);
      bar.position.set(x, y, .02);
      screen.add(bar);
    }

    for (const x of [-halfWidth, halfWidth]) {
      for (const y of [-halfHeight, halfHeight]) {
        const corner = new Mesh(new PlaneGeometry(.35, .35), neonMaterial);
        corner.position.set(x, y, .03);
        screen.add(corner);
      }
    }

    for (const side of [-1, 1]) {
      const support = box(.12, SCREEN_HEIGHT + .5, .5, NEON, { shadow: false });
      support.position.set(side * (halfWidth + .25), 0, -.2);
      screen.add(support);
    }
  }

  updateStats(stats) {
    drawStats(this._texture.image, stats);
    this._texture.needsUpdate = true;
  }

  getCollider() {
    return { x: 0, z: 0, r: this.solidRadius };
  }
}

// Canvas vacío que se convierte en la textura de la pantalla
function makeScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// Dibuja las estadísticas en el canvas de la pantalla
function drawStats(canvas, stats) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(8, 26, 42, 0.85)';
  roundRect(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#e8a020';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd479';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText('NARIÑO AVENTURA', canvas.width / 2, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText(`Puntaje: ${stats.score}`, canvas.width / 2, 132);
  ctx.font = '34px system-ui, sans-serif';
  ctx.fillText(`Preguntas: ${stats.answered} / ${stats.total}`, canvas.width / 2, 188);
  ctx.fillText(`Sitios: ${stats.sitesCompleted} / ${stats.sitesTotal}`, canvas.width / 2, 232);
  if (stats.zonesTotal) {
    ctx.fillText(`Deportes: ${stats.zonesVisited} / ${stats.zonesTotal}`, canvas.width / 2, 276);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
