// Límites circulares del mundo jugable. El mundo es un círculo de radio `R`
// con una apertura hacia la playa (+X) de medio ángulo `gapHalf`, donde el
// límite se extiende hasta `beachLimit`.
export const WORLD_BOUNDS = { R: 280, gapHalf: .72, beachLimit: 296 };

// Devuelve la posición (x, z) recortada al borde del mundo si se sale de él.
export function clampToWorld(x, z) {
  const distance = Math.hypot(x, z);
  const limit = Math.abs(Math.atan2(x, z) - Math.PI / 2) < WORLD_BOUNDS.gapHalf
    ? WORLD_BOUNDS.beachLimit
    : WORLD_BOUNDS.R;
  if (distance > limit) {
    const scale = limit / distance;
    return { x: x * scale, z: z * scale };
  }
  return { x, z };
}
