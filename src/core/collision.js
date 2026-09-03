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

export function resolveCircles(circles, x, z, radius = .5) {
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
