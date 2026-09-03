// Laberinto con paredes de neón. Se regenera cada vez que el jugador entra,
// cronometra el recorrido y entrega puntos al alcanzar la gema central; al
// recogerla las paredes interiores se hunden y vuelven a subir al salir.
import {
  Group,
  Vector3,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  RingGeometry,
  DoubleSide,
  CanvasTexture,
} from 'three';
import { box, basicMat } from './primitives.js';
import { resolveAABBs } from '../core/collision.js';

const WALL_HEIGHT = 2.6;
const WALL_THICKNESS = .5;
const WALL_COLOR = 3494000;
const NEON = 58879;
const TIME_BONUS_BASE = 45;
const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };

// Genera un laberinto perfecto (DFS con retroceso) de cols x cols celdas
export function generateMaze(cols, random = Math.random) {
  const cells = [];
  for (let row = 0; row < cols; row++) {
    cells.push([]);
    for (let col = 0; col < cols; col++) {
      cells[row].push({ n: true, e: true, s: true, w: true, visited: false });
    }
  }

  const stack = [[0, 0]];
  cells[0][0].visited = true;
  let visitedCount = 1;
  while (stack.length) {
    const [row, col] = stack[stack.length - 1];
    const neighbours = [];
    if (row > 0 && !cells[row - 1][col].visited) neighbours.push(['n', row - 1, col]);
    if (row < cols - 1 && !cells[row + 1][col].visited) neighbours.push(['s', row + 1, col]);
    if (col > 0 && !cells[row][col - 1].visited) neighbours.push(['w', row, col - 1]);
    if (col < cols - 1 && !cells[row][col + 1].visited) neighbours.push(['e', row, col + 1]);
    if (!neighbours.length) {
      stack.pop();
      continue;
    }
    const [direction, nextRow, nextCol] = neighbours[Math.floor(random() * neighbours.length)];
    cells[row][col][direction] = false;
    cells[nextRow][nextCol][OPPOSITE[direction]] = false;
    cells[nextRow][nextCol].visited = true;
    visitedCount++;
    stack.push([nextRow, nextCol]);
  }

  return { cells, cols, visitedCount };
}

export class Maze {
  constructor(scene, parent, { cx, cz, size, cols = 11 }, onComplete) {
    this.cx = cx;
    this.cz = cz;
    this.size = size;
    this.cols = cols;
    this.cell = size / cols;
    this.onComplete = onComplete || (() => {});
    this.group = new Group();
    scene.add(this.group);
    this.fxGroup = new Group();
    scene.add(this.fxGroup);
    this.walls = [];
    this.goal = new Vector3();
    this.active = false;
    this.completedThisRun = false;
    this.elapsed = 0;
    this._goalSpin = null;
    this.gem = null;
    this._particles = [];
    this._gemColors = [3073696, 16736160, 6267135, 16766282, 11561983, 16743226];
    this._gemColorIdx = 0;
    this._buildPad(scene);

    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      position:absolute; top:16px; left:16px; padding:8px 14px;
      background:rgba(12,36,57,0.7); border:1px solid #00e5ff; border-radius:10px;
      color:#eaf6ff; font-family:system-ui,sans-serif; font-weight:700; font-size:0.95rem;
      pointer-events:none; z-index:14; display:none;
    `;
    parent.appendChild(this.timerEl);
    this.regenerate();
  }

  // Plataforma base, bordes de neón y letrero "LABERINTO"
  _buildPad(scene) {
    const pad = new Group();
    scene.add(pad);
    const half = this.size / 2;

    const floor = box(this.size, .16, this.size, 3819096, { shadow: false });
    floor.position.set(this.cx, .08, this.cz);
    floor.receiveShadow = true;
    pad.add(floor);

    for (const [width, depth, offsetX, offsetZ] of [
      [this.size, .3, 0, half],
      [this.size, .3, 0, -half],
      [.3, this.size, half, 0],
      [.3, this.size, -half, 0],
    ]) {
      const edge = box(width, .1, depth, NEON);
      edge.material = basicMat(NEON);
      edge.position.set(this.cx + offsetX, .2, this.cz + offsetZ);
      pad.add(edge);
    }

    const sign = new Mesh(
      new PlaneGeometry(6, 1.2),
      new MeshBasicMaterial({ map: makeMazeSignTexture(), transparent: true, side: DoubleSide }),
    );
    sign.position.set(this.cx, 4.2, this.cz + half);
    pad.add(sign);
  }

  // Reconstruye paredes, meta y gema con un laberinto nuevo
  regenerate() {
    this.group.clear();
    this.wallsInterior = [];
    this.wallsBoundary = [];
    this.walls = [];
    this._wallMeshes = [];
    this._wallDropT = -1;
    this._wallAnimState = 'idle';

    const { cells } = generateMaze(this.cols, Math.random);
    const originX = this.cx - this.size / 2;
    const originZ = this.cz - this.size / 2;
    const cell = this.cell;

    for (let row = 0; row < this.cols; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (cells[row][col].e && col < this.cols - 1) {
          this._wall(originX + (col + 1) * cell, originZ + (row + .5) * cell, WALL_THICKNESS, cell, true);
        }
        if (cells[row][col].s && row < this.cols - 1) {
          this._wall(originX + (col + .5) * cell, originZ + (row + 1) * cell, cell, WALL_THICKNESS, true);
        }
      }
    }

    // Muros perimetrales, dejando la entrada abierta en el centro del lado sur
    const entranceCol = Math.floor(this.cols / 2);
    this._wall(this.cx, originZ, this.size + WALL_THICKNESS, WALL_THICKNESS, false);
    this._wall(originX + this.size, this.cz, WALL_THICKNESS, this.size + WALL_THICKNESS, false);
    this._wall(originX, this.cz, WALL_THICKNESS, this.size + WALL_THICKNESS, false);
    for (let col = 0; col < this.cols; col++) {
      if (col !== entranceCol) {
        this._wall(originX + (col + .5) * cell, originZ + this.size, cell, WALL_THICKNESS, false);
      }
    }
    this.walls = [...this.wallsBoundary, ...this.wallsInterior];

    const center = Math.floor(this.cols / 2);
    this.goal.set(originX + (center + .5) * cell, 0, originZ + (center + .5) * cell);
    this._buildGoal();
    this.completedThisRun = false;
    this.elapsed = 0;
  }

  // Crea un muro con barra superior de neón y registra su AABB
  _wall(x, z, width, depth, interior = true) {
    const wall = box(width, WALL_HEIGHT, depth, WALL_COLOR);
    wall.position.set(x, WALL_HEIGHT / 2, z);
    this.group.add(wall);

    const topBar = box(width * .96, .14, depth * .96, NEON);
    topBar.material = basicMat(NEON);
    topBar.position.set(x, WALL_HEIGHT, z);
    this.group.add(topBar);

    const aabb = {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    };
    if (interior) {
      this.wallsInterior.push(aabb);
      this._wallMeshes.push({ mesh: wall, topBar, baseY: WALL_HEIGHT / 2, topBaseY: WALL_HEIGHT });
    } else {
      this.wallsBoundary.push(aabb);
    }
  }

  // Gema flotante en el centro del laberinto
  _buildGoal() {
    const color = this._gemColors[this._gemColorIdx];
    this._gemColor = color;

    const gem = new Mesh(
      new OctahedronGeometry(.8, 0),
      new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: .45,
        metalness: .3,
        roughness: .1,
        transparent: true,
        opacity: .9,
      }),
    );
    gem.scale.set(1, 1.5, 1);
    gem.position.set(this.goal.x, 1.7, this.goal.z);
    gem.visible = true;
    this.group.add(gem);

    const ring = new Mesh(new RingGeometry(.9, 1.1, 24), basicMat(color));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(this.goal.x, .2, this.goal.z);
    this.group.add(ring);

    this.gem = gem;
    this._goalSpin = gem;
    this._goalBaseY = 1.7;
  }

  // Oculta la gema, lanza partículas y comienza la caída de las paredes
  _collectGem() {
    if (!this.gem) return;
    const origin = this.gem.position.clone();
    const color = this._gemColor;
    this.gem.visible = false;
    this._goalSpin = null;
    this.gem = null;
    this._wallAnimState = 'dropping';
    this._wallDropT = 0;
    this.walls = [...this.wallsBoundary];

    for (let i = 0; i < 20; i++) {
      const particle = new Mesh(
        new OctahedronGeometry(.18, 0),
        new MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
      particle.position.copy(origin);
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      particle.userData.vx = Math.cos(angle) * speed;
      particle.userData.vz = Math.sin(angle) * speed;
      particle.userData.vy = 3 + Math.random() * 4;
      particle.userData.life = .9;
      this.fxGroup.add(particle);
      this._particles.push(particle);
    }
  }

  // Animación de caída/subida de las paredes interiores
  _updateWallAnim(dt) {
    if (!this._wallMeshes || this._wallDropT < 0) return;
    this._wallDropT += dt;
    const t = Math.min(this._wallDropT / 1.6, 1);
    const dropDistance = WALL_HEIGHT + .5;

    if (this._wallAnimState === 'dropping') {
      const eased = t * t * t;
      const offset = dropDistance * eased;
      for (const entry of this._wallMeshes) {
        entry.mesh.position.y = entry.baseY - offset;
        entry.topBar.position.y = entry.topBaseY - offset;
      }
      if (t >= 1) {
        for (const entry of this._wallMeshes) {
          entry.mesh.visible = false;
          entry.topBar.visible = false;
        }
        this._wallAnimState = 'dropped';
        this._wallDropT = -1;
      }
    } else if (this._wallAnimState === 'rising') {
      const eased = 1 - Math.pow(1 - t, 3);
      const offset = dropDistance * (1 - eased);
      for (const entry of this._wallMeshes) {
        entry.mesh.visible = true;
        entry.topBar.visible = true;
        entry.mesh.position.y = entry.baseY - offset;
        entry.topBar.position.y = entry.topBaseY - offset;
      }
      if (t >= 1) {
        this.walls = [...this.wallsBoundary, ...this.wallsInterior];
        this._wallAnimState = 'idle';
        this._wallDropT = -1;
      }
    }
  }

  // Partículas de la gema recogida
  _updateParticles(dt) {
    if (!this._particles.length) return;
    for (const particle of this._particles) {
      particle.userData.life -= dt;
      particle.userData.vy -= 12 * dt;
      particle.position.x += particle.userData.vx * dt;
      particle.position.y += particle.userData.vy * dt;
      particle.position.z += particle.userData.vz * dt;
      const k = Math.max(0, particle.userData.life / .9);
      particle.scale.setScalar(k);
      particle.material.opacity = k;
      particle.rotation.y += dt * 8;
    }
    this._particles = this._particles.filter((particle) => {
      if (particle.userData.life <= 0) {
        this.fxGroup.remove(particle);
        return false;
      }
      return true;
    });
  }

  // Resuelve colisiones contra las paredes solo si el jugador está cerca
  collide(x, z, radius = .5) {
    if (Math.abs(x - this.cx) > this.size / 2 + 2 || Math.abs(z - this.cz) > this.size / 2 + 2) {
      return { x, z };
    }
    return resolveAABBs(this.walls, x, z, radius);
  }

  update(dt, x, z) {
    if (this._goalSpin) {
      this._goalSpin.rotation.y += dt * 1.2;
      this._goalSpin.position.y = this._goalBaseY + Math.sin(performance.now() * .002) * .25;
    }
    this._updateParticles(dt);
    this._updateWallAnim(dt);

    const inside = Math.abs(x - this.cx) <= this.size / 2 && Math.abs(z - this.cz) <= this.size / 2;
    if (inside && !this.active) {
      this.regenerate();
      this.active = true;
    } else if (!inside && this.active) {
      this.active = false;
      this.timerEl.style.display = 'none';
      this._gemColorIdx = (this._gemColorIdx + 1) % this._gemColors.length;
      if (this._wallAnimState === 'dropped') {
        this._wallAnimState = 'rising';
        this._wallDropT = 0;
      }
    }

    if (this.active && !this.completedThisRun) {
      this.elapsed += dt;
      this.timerEl.style.display = 'block';
      this.timerEl.textContent = `Laberinto: ${this.elapsed.toFixed(1)}s`;
      const dx = x - this.goal.x;
      const dz = z - this.goal.z;
      if (Math.hypot(dx, dz) < this.cell * .5) {
        this.completedThisRun = true;
        const points = 100 + Math.max(0, Math.round(TIME_BONUS_BASE - this.elapsed)) * 4;
        this.timerEl.textContent = `¡Meta! +${points} (${this.elapsed.toFixed(1)}s)`;
        this.onComplete(points);
        this._collectGem();
      }
    }
  }
}

// Textura del letrero "LABERINTO"
function makeMazeSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 192);
  ctx.fillStyle = 'rgba(8, 26, 42, 0.85)';
  roundRect(ctx, 6, 6, 1012, 180, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#00e5ff';
  ctx.stroke();
  ctx.fillStyle = '#bff4ff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LABERINTO', 512, 100);
  return new CanvasTexture(canvas);
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
