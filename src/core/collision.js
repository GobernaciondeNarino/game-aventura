// Resolución de colisiones 2D (plano XZ) para un círculo de radio `radius`.
// `resolveAABBs` empuja el punto fuera de cajas alineadas a los ejes
// ({ minX, maxX, minZ, maxZ }); `resolveCircles` lo empuja fuera de
// colisionadores circulares ({ x, z, r }). Ambas devuelven la posición corregida.

export function resolveAABBs(aabbs, x, z, radius = .5) {
    let px = x;
    let pz = z;
    for (const box of aabbs) {
        // Punto de la caja más cercano al círculo.
        const closestX = Math.max(box.minX, Math.min(px, box.maxX));
        const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
        const dx = px - closestX;
        const dz = pz - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq >= radius * radius) continue;
        if (distSq > 1e-9) {
            const dist = Math.sqrt(distSq);
            const push = radius - dist;
            px += dx / dist * push;
            pz += dz / dist * push;
        } else {
            // El centro está dentro de la caja: salir por la cara más cercana.
            const toMinX = px - box.minX;
            const toMaxX = box.maxX - px;
            const toMinZ = pz - box.minZ;
            const toMaxZ = box.maxZ - pz;
            const nearest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
            if (nearest === toMinX) px = box.minX - radius;
            else if (nearest === toMaxX) px = box.maxX + radius;
            else if (nearest === toMinZ) pz = box.minZ - radius;
            else pz = box.maxZ + radius;
        }
    }
    return { x: px, z: pz };
}

/**
 * Índice espacial (rejilla uniforme) para colisionadores circulares. Permite
 * miles de árboles/rocas sin recorrer toda la lista en cada consulta.
 */
export class ColliderIndex {
  constructor(circles = [], cellSize = 16) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.all = [];
    for (const c of circles) this.add(c);
  }

  _key(ix, iz) {
    return ix * 73856093 ^ iz * 19349663;
  }

  add(circle) {
    if (!circle || !circle.r) return;
    this.all.push(circle);
    const s = this.cellSize;
    const minX = Math.floor((circle.x - circle.r) / s);
    const maxX = Math.floor((circle.x + circle.r) / s);
    const minZ = Math.floor((circle.z - circle.r) / s);
    const maxZ = Math.floor((circle.z + circle.r) / s);
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const key = this._key(ix, iz);
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = [];
          this.cells.set(key, bucket);
        }
        bucket.push(circle);
      }
    }
  }

  /** Colisionadores cuyo círculo puede tocar un círculo de radio `radius` en (x,z). */
  query(x, z, radius = 1) {
    const s = this.cellSize;
    const minX = Math.floor((x - radius) / s);
    const maxX = Math.floor((x + radius) / s);
    const minZ = Math.floor((z - radius) / s);
    const maxZ = Math.floor((z + radius) / s);
    const out = [];
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const bucket = this.cells.get(this._key(ix, iz));
        if (bucket) for (const c of bucket) if (!out.includes(c)) out.push(c);
      }
    }
    return out;
  }

  get length() {
    return this.all.length;
  }

  [Symbol.iterator]() {
    return this.all[Symbol.iterator]();
  }
}

/** Devuelve los círculos cercanos, tanto si `circles` es un array como un ColliderIndex. */
export function nearbyCircles(circles, x, z, radius = 1) {
  return circles instanceof ColliderIndex ? circles.query(x, z, radius + 3) : circles;
}

export function resolveCircles(circles, x, z, radius = .5) {
  if (circles instanceof ColliderIndex) circles = circles.query(x, z, radius + 3);
    let px = x;
    let pz = z;
    for (const circle of circles) {
        if (!circle.r) continue;
        const dx = px - circle.x;
        const dz = pz - circle.z;
        const minDist = circle.r + radius;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist && dist > 1e-4) {
            const push = minDist - dist;
            px += dx / dist * push;
            pz += dz / dist * push;
        } else if (dist <= 1e-4) {
            // Centros coincidentes: desplazar en +X.
            px = circle.x + minDist;
        }
    }
    return { x: px, z: pz };
}
