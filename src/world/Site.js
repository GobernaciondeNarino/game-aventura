// Sitio turístico en el mundo: envuelve la maqueta construida, la etiqueta
// flotante con el nombre y el anillo dorado que aparece al visitarlo.
// También expone helpers para detectar el sitio activo por proximidad y
// resolver colisiones circulares contra los sitios.
import {
  Vector3,
  Box3,
  Sprite,
  SpriteMaterial,
  Mesh,
  TorusGeometry,
  MeshStandardMaterial,
  CanvasTexture,
} from 'three';
import { siteRotation } from './sitesData.js';

export class Site {
  /**
   * @param {object} data datos del sitio (sitesData)
   * @param {import('three').Group} group maqueta construida (marco local)
   * @param {number} [baseY] cota (m) del origen de la maqueta
   */
  constructor(data, group, baseY = 0) {
    this.id = data.id;
    this.name = data.name;
    this.municipio = data.municipio;
    this.description = data.description;
    this.position = new Vector3(data.position.x, baseY, data.position.z);
    this.proximityRadius = data.proximityRadius;
    this.solidRadius = data.solidRadius;
    this.extraColliders = [];
    this.visited = false;
    this.group = group;
    this.group.position.copy(this.position);
    const scale = data.scale || 1;
    this.group.scale.setScalar(scale);
    // La maqueta mira hacia el centro del mundo (más rotación extra opcional)
    this.group.rotation.y = siteRotation(data);
    this.group.updateMatrixWorld(true);
    this.label = this._buildLabel();
    this.visitedRing = this._buildVisitedRing();
  }

  // Sprite con el nombre, colocado sobre la parte más alta de la maqueta
  _buildLabel() {
    const bounds = new Box3().setFromObject(this.group);
    const topY = Number.isFinite(bounds.max.y) ? Math.min(bounds.max.y, this.position.y + 26) : this.position.y + 8;
    const texture = makeLabelTexture(this.name);
    const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthTest: true }));
    sprite.scale.set(8, 2, 1);
    sprite.position.set(this.position.x, topY + 2.2, this.position.z);
    return sprite;
  }

  // Anillo dorado en el suelo, oculto hasta que se visita el sitio
  _buildVisitedRing() {
    const ring = new Mesh(
      new TorusGeometry(this.solidRadius + .5, .3, 8, 32),
      new MeshStandardMaterial({
        color: 15245344,
        emissive: 7029760,
        metalness: .6,
        roughness: .3,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(this.position.x, this.position.y + .15, this.position.z);
    ring.visible = false;
    return ring;
  }

  markVisited() {
    this.visited = true;
    this.visitedRing.visible = true;
  }

  addToScene(scene) {
    scene.add(this.group);
    scene.add(this.label);
    scene.add(this.visitedRing);
  }

  tick(dt) {
    if (this.group.userData.tick) this.group.userData.tick(dt);
  }
}

// Devuelve el sitio más cercano cuyo radio de proximidad contiene (x, z)
export function findActiveSite(sites, x, z) {
  let closest = null;
  let closestDistance = 1 / 0;
  for (const site of sites) {
    const dx = site.position.x - x;
    const dz = site.position.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance <= site.proximityRadius && distance < closestDistance) {
      closest = site;
      closestDistance = distance;
    }
  }
  return closest;
}

// Empuja (x, z) fuera del radio sólido de cada sitio
export function resolveSiteCollisions(sites, x, z) {
  let resolvedX = x;
  let resolvedZ = z;
  for (const site of sites) {
    const dx = resolvedX - site.position.x;
    const dz = resolvedZ - site.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < site.solidRadius && distance > 1e-4) {
      const push = site.solidRadius - distance;
      resolvedX += dx / distance * push;
      resolvedZ += dz / distance * push;
    } else if (distance <= 1e-4) {
      resolvedX = site.position.x + site.solidRadius;
    }
  }
  return { x: resolvedX, z: resolvedZ };
}

// Textura de la etiqueta flotante con el nombre del sitio
function makeLabelTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const padding = 16;
  const innerWidth = canvas.width - padding * 2;
  const innerHeight = canvas.height - padding * 2;
  const radius = 28;
  ctx.fillStyle = 'rgba(12, 36, 57, 0.86)';
  roundRect(ctx, padding, padding, innerWidth, innerHeight, radius);
  ctx.fill();
  ctx.strokeStyle = '#e8a020';
  ctx.lineWidth = 5;
  roundRect(ctx, padding, padding, innerWidth, innerHeight, radius);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, innerWidth - 20);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
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
