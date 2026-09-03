// Matemática del terreno (sin Three.js, determinista).
//
// `heightAt(x, z)` es la "verdad" del relieve para todo el juego: la malla del
// terreno, las texturas de altura/superficie que consume la GPU (césped) y las
// entidades (jugador, NPC, balones, fauna, props) consultan esta misma función,
// así que todo queda apoyado exactamente sobre el suelo.
//
// Composición del relieve:
//   1. colinas suaves de ruido fBm,
//   2. atenuadas por una máscara de "zonas planas" (plaza, vías, sitios,
//      complejo deportivo, laberinto, tienda...) para no romper la jugabilidad,
//   3. cordillera en el anillo exterior y cordillera lejana en el horizonte,
//   4. playa que desciende hacia el Pacífico en el sector este,
//   5. colina rocosa de la cascada,
//   6. cuencas negativas para lagos, poza y río.

import { createNoise2D } from 'simplex-noise';
import { SITES } from '../world/sitesData.js';
import {
  RING_ROAD_RADIUS, ROAD_POLYLINES, ROUNDABOUTS, COMPLEX_PATHS, COMPLEX_PAD, MAZE, SHOP,
  SHOP_ACCESS_ROAD, SHOP_PARKING, SKATE_SPAWN, PLAZA, SEA_LEVEL, BEACH, LAKES, WATERFALL,
  RIVER, FOREST, SPORT_ZONES,
} from '../world/worldLayout.js';

// Extensión de la malla de terreno (media anchura) y de las texturas de mapa.
export const TERRAIN_EXTENT = 900;
export const MAP_HALF = 360;
// Umbral bajo el cual una zona se considera agua (todos los espejos de agua
// están entre -0.45 y -0.55).
export const WATER_THRESHOLD = -0.42;

// ---- PRNG y ruido deterministas -------------------------------------------

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

const noise2D = createNoise2D(mulberry32(20240613));

// Ruido fractal en [-1, 1].
export function fbm2(x, z, octaves = 3, lacunarity = 2, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2D(x * freq, z * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// ---- utilidades geométricas ------------------------------------------------

export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Distancia de (px,pz) al segmento a-b.
function segmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + dx * t;
  const cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}

function polylineDistance(points, px, pz) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = segmentDistance(px, pz, a.x, a.z, b.x, b.z);
    if (d < best) best = d;
  }
  return best;
}

// Distancia exterior a un rectángulo alineado con los ejes (0 dentro).
function rectOutside(px, pz, cx, cz, hw, hd) {
  const dx = Math.max(0, Math.abs(px - cx) - hw);
  const dz = Math.max(0, Math.abs(pz - cz) - hd);
  return Math.hypot(dx, dz);
}

// Máscara suave: 1 dentro de la forma, cae a 0 en `falloff` metros.
function softMask(outsideDistance, falloff) {
  return 1 - smoothstep(0, falloff, outsideDistance);
}

// ---- formas precalculadas --------------------------------------------------

// Senderos de la plaza a cada sitio (cápsulas). Los de Las Lajas y La Cocha
// llevan canales de agua a los lados, por eso son más anchos.
const SITE_PATHS = SITES.map((site) => {
  const len = Math.hypot(site.position.x, site.position.z) || 1;
  const ux = site.position.x / len;
  const uz = site.position.z / len;
  const start = 20;
  const end = len - ((site.solidRadius || 8) + 1);
  const wide = site.id === 'lajas' || site.id === 'cocha';
  return {
    ax: ux * start, az: uz * start, bx: ux * end, bz: uz * end,
    halfWidth: wide ? 12.5 : 5.5,
    hardHalfWidth: wide ? 12.5 : PLAZA.pathWidth / 2 + 0.2,
  };
});

const SITE_PADS = SITES.map((site) => ({
  x: site.position.x, z: site.position.z,
  flatRadius: (site.solidRadius || 8) + 10,
  hardRadius: (site.solidRadius || 8) * 0.9,
}));

const MAZE_HALF = MAZE.size / 2;

// ---- máscaras --------------------------------------------------------------

/**
 * 1 donde el terreno debe quedar totalmente plano (cota 0) por jugabilidad,
 * con transición suave hacia las colinas.
 */
export function flatMask(x, z) {
  const r = Math.hypot(x, z);
  let m = softMask(Math.max(0, r - 30), 10); // plaza y explanada central

  for (const pad of SITE_PADS) {
    const d = Math.hypot(x - pad.x, z - pad.z);
    m = Math.max(m, softMask(Math.max(0, d - pad.flatRadius), 10));
    if (m >= 1) return 1;
  }
  for (const p of SITE_PATHS) {
    const d = segmentDistance(x, z, p.ax, p.az, p.bx, p.bz);
    m = Math.max(m, softMask(Math.max(0, d - p.halfWidth), 8));
  }

  // vía circunvalar y sus ramales
  m = Math.max(m, softMask(Math.max(0, Math.abs(r - RING_ROAD_RADIUS) - 8), 8));
  for (const road of ROAD_POLYLINES) {
    m = Math.max(m, softMask(Math.max(0, polylineDistance(road, x, z) - 6), 8));
  }
  for (const rb of ROUNDABOUTS) {
    m = Math.max(m, softMask(Math.max(0, Math.hypot(x - rb.x, z - rb.z) - 11), 8));
  }

  // parque deportivo, laberinto, tienda, patineta
  m = Math.max(m, softMask(rectOutside(x, z, COMPLEX_PAD.x, COMPLEX_PAD.z, COMPLEX_PAD.hw, COMPLEX_PAD.hd), 14));
  m = Math.max(m, softMask(rectOutside(x, z, MAZE.cx, MAZE.cz, MAZE_HALF + 4, MAZE_HALF + 4), 10));
  m = Math.max(m, softMask(rectOutside(x, z, SHOP.x, SHOP.z, SHOP.size / 2 + 10, SHOP.size / 2 + 10), 10));
  m = Math.max(m, softMask(Math.max(0, segmentDistance(x, z, SHOP_ACCESS_ROAD.x, SHOP_ACCESS_ROAD.z0, SHOP_ACCESS_ROAD.x, SHOP_ACCESS_ROAD.z1) - 5), 8));
  m = Math.max(m, softMask(rectOutside(x, z, SHOP_PARKING.x, SHOP_PARKING.z, SHOP_PARKING.hw + 1.5, SHOP_PARKING.hd + 1.5), 6));
  m = Math.max(m, softMask(Math.max(0, Math.hypot(x - SKATE_SPAWN.x, z - SKATE_SPAWN.z) - 4), 6));

  // orillas de lagos, poza y río: el agua se excava desde cota 0
  for (const lake of LAKES) {
    m = Math.max(m, softMask(Math.max(0, Math.hypot(x - lake.x, z - lake.z) - lake.R * 1.35), 12));
  }
  const pool = WATERFALL.pool;
  m = Math.max(m, softMask(Math.max(0, Math.hypot(x - pool.x, z - pool.z) - pool.R * 1.4), 10));
  m = Math.max(m, softMask(Math.max(0, polylineDistance(RIVER.points, x, z) - RIVER.halfWidth - 2), 10));

  return m;
}

// ---- componentes del relieve -----------------------------------------------

function hillsAt(x, z, r) {
  const n1 = fbm2(x * 0.018, z * 0.018, 3);
  const n2 = fbm2(x * 0.006 + 7.3, z * 0.006 - 2.1, 2);
  let h = Math.max(0, n1 * 0.6 + n2 * 0.9 + 0.55) * 2.4;
  h *= 1 + smoothstep(120, 240, r) * 1.1; // el piedemonte ondula más
  return h;
}

function mountainsAt(x, z, r) {
  const s = x / Math.max(r, 1e-6); // sin(θ): 1 mirando al este (playa)
  const dirNear = 1 - smoothstep(0.3, 0.8, s);
  const dirFar = 1 - smoothstep(0.55, 0.95, s);
  const ringT = smoothstep(250, 345, r);
  const farT = smoothstep(430, 720, r);
  if (ringT <= 0 && farT <= 0) return 0;

  let m = 0;
  if (ringT > 0 && dirNear > 0) {
    const ridge = 0.5 + 0.5 * fbm2(x * 0.011 + 3.1, z * 0.011 - 5.7, 4);
    const sharp = 1 - Math.abs(fbm2(x * 0.02 - 11, z * 0.02 + 4, 3));
    m += ringT * dirNear * (22 + 40 * ridge + 14 * sharp * sharp);
  }
  if (farT > 0 && dirFar > 0) {
    const farRidge = 0.5 + 0.5 * fbm2(x * 0.0035 + 21, z * 0.0035 + 9, 4);
    m += farT * dirFar * (55 + 105 * farRidge);
  }
  m += (ringT + farT) * 4 * fbm2(x * 0.06, z * 0.06, 2);
  return m;
}

function beachBlend(x, z, h) {
  if (x <= BEACH.sandStart) return h;
  const t = smoothstep(BEACH.sandStart, BEACH.sandFull, x);
  const ripples = 0.12 * fbm2(x * 0.09 + 5, z * 0.09, 2);
  const under = Math.max(0, x - BEACH.shoreline);
  let sand = ripples - under * BEACH.slope - Math.max(0, x - 320) * 0.06;
  if (sand < -40) sand = -40;
  return h * (1 - t) + sand * t;
}

function waterfallHillAt(x, z) {
  const { hill } = WATERFALL;
  const sx = x > hill.x ? hill.sx * 0.78 : hill.sx * 1.3; // cara este más abrupta
  const dx = (x - hill.x) / sx;
  const dz = (z - hill.z) / hill.sz;
  const g = Math.exp(-0.5 * (dx * dx + dz * dz));
  if (g < 1e-3) return 0;
  return g * (hill.height + 3 * fbm2(x * 0.08, z * 0.08, 2));
}

function basinDepth(d, R, depth) {
  if (d >= R) return 0;
  const t = smoothstep(0, 1, 1 - d / R);
  return -depth * Math.pow(t, 0.85);
}

function basinsAt(x, z) {
  let b = 0;
  for (const lake of LAKES) {
    b += basinDepth(Math.hypot(x - lake.x, z - lake.z), lake.R, lake.depth);
  }
  const pool = WATERFALL.pool;
  b += basinDepth(Math.hypot(x - pool.x, z - pool.z), pool.R, pool.depth);
  const dRiver = polylineDistance(RIVER.points, x, z);
  if (dRiver < RIVER.halfWidth) {
    b -= RIVER.depth * (1 - smoothstep(0, RIVER.halfWidth, dRiver));
  }
  return b;
}

// ---- API pública -----------------------------------------------------------

/** Altura del terreno (m) en coordenadas de mundo. */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const flat = flatMask(x, z);
  let h = (hillsAt(x, z, r) + mountainsAt(x, z, r)) * (1 - flat);
  h = beachBlend(x, z, h);
  h += waterfallHillAt(x, z);
  h += basinsAt(x, z);
  return h;
}

/** Normal del terreno por diferencias centrales. */
export function normalAt(x, z, eps = 0.6) {
  const hl = heightAt(x - eps, z);
  const hr = heightAt(x + eps, z);
  const hd = heightAt(x, z - eps);
  const hu = heightAt(x, z + eps);
  const nx = hl - hr;
  const nz = hd - hu;
  const ny = 2 * eps;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/** Pendiente (0 plano … 1 vertical) del terreno. */
export function slopeAt(x, z) {
  return 1 - normalAt(x, z).y;
}

/** true si el punto está bajo un espejo de agua (lago, poza, río o mar). */
export function isWaterAt(x, z) {
  return heightAt(x, z) < WATER_THRESHOLD;
}

/** Nivel del agua que cubre un punto dado (o null si está en seco). */
export function waterLevelAt(x, z) {
  if (heightAt(x, z) >= WATER_THRESHOLD) return null;
  if (x > BEACH.shoreline - 8) return SEA_LEVEL;
  for (const lake of LAKES) {
    if (Math.hypot(x - lake.x, z - lake.z) < lake.R) return lake.level;
  }
  const pool = WATERFALL.pool;
  if (Math.hypot(x - pool.x, z - pool.z) < pool.R) return pool.level;
  return RIVER.level;
}

/**
 * Clasificación de superficie para texturizado y colocación de vegetación.
 * @returns {{hard:number, sand:number, water:number, dirt:number}}
 *   hard  = pavimento/estructuras (sin césped),
 *   sand  = arena de playa y orillas,
 *   water = 1 bajo el agua,
 *   dirt  = tierra desnuda (bordes de vías, suelo de bosque).
 */
export function surfaceAt(x, z) {
  const r = Math.hypot(x, z);
  let hard = 0;
  let dirt = 0;

  // plaza (anillo pavimentado) y tablero central
  const plazaOut = Math.max(0, Math.max(PLAZA.innerRadius - r, r - PLAZA.outerRadius));
  hard = Math.max(hard, softMask(plazaOut, 0.8));
  dirt = Math.max(dirt, softMask(Math.max(0, r - PLAZA.outerRadius), 3.5) * 0.8);
  hard = Math.max(hard, softMask(Math.max(0, r - 2.4), 0.8));

  for (const p of SITE_PATHS) {
    const d = segmentDistance(x, z, p.ax, p.az, p.bx, p.bz);
    hard = Math.max(hard, softMask(Math.max(0, d - p.hardHalfWidth), 0.8));
    dirt = Math.max(dirt, softMask(Math.max(0, d - p.hardHalfWidth), 3.5) * 0.7);
  }
  for (const pad of SITE_PADS) {
    const d = Math.hypot(x - pad.x, z - pad.z);
    hard = Math.max(hard, softMask(Math.max(0, d - pad.hardRadius), 1.5));
    dirt = Math.max(dirt, softMask(Math.max(0, d - pad.hardRadius), 4) * 0.5);
  }

  // vías
  const ringD = Math.max(0, Math.abs(r - RING_ROAD_RADIUS) - 2.1);
  hard = Math.max(hard, softMask(ringD, 0.8));
  dirt = Math.max(dirt, softMask(ringD, 3.5) * 0.8);
  for (const road of ROAD_POLYLINES) {
    const d = Math.max(0, polylineDistance(road, x, z) - 2.1);
    hard = Math.max(hard, softMask(d, 0.8));
    dirt = Math.max(dirt, softMask(d, 3.5) * 0.8);
  }
  for (const rb of ROUNDABOUTS) {
    const d = Math.max(0, Math.hypot(x - rb.x, z - rb.z) - rb.r);
    hard = Math.max(hard, softMask(d, 0.8));
    dirt = Math.max(dirt, softMask(d, 3) * 0.6);
  }

  // parque deportivo: canchas y senderos
  for (const zone of SPORT_ZONES) {
    const d = rectOutside(x, z, zone.x, zone.z, zone.hw + 1.2, zone.hd + 1.2);
    hard = Math.max(hard, softMask(d, 0.8));
    dirt = Math.max(dirt, softMask(d, 3) * 0.6);
  }
  for (const path of COMPLEX_PATHS) {
    const d = Math.max(0, polylineDistance(path, x, z) - 1.9);
    hard = Math.max(hard, softMask(d, 0.8));
    dirt = Math.max(dirt, softMask(d, 3) * 0.6);
  }

  // laberinto, tienda, patineta
  hard = Math.max(hard, softMask(rectOutside(x, z, MAZE.cx, MAZE.cz, MAZE_HALF + 0.5, MAZE_HALF + 0.5), 0.8));
  hard = Math.max(hard, softMask(rectOutside(x, z, SHOP.x, SHOP.z, SHOP.size / 2 + 0.8, SHOP.size / 2 + 0.8), 0.8));
  hard = Math.max(hard, softMask(Math.max(0, segmentDistance(x, z, SHOP_ACCESS_ROAD.x, SHOP_ACCESS_ROAD.z0, SHOP_ACCESS_ROAD.x, SHOP_ACCESS_ROAD.z1) - SHOP_ACCESS_ROAD.halfWidth), 0.8));
  hard = Math.max(hard, softMask(rectOutside(x, z, SHOP_PARKING.x, SHOP_PARKING.z, SHOP_PARKING.hw, SHOP_PARKING.hd), 0.8));
  hard = Math.max(hard, softMask(Math.max(0, Math.hypot(x - SKATE_SPAWN.x, z - SKATE_SPAWN.z) - 1.5), 1));

  // arena: playa, orillas de lagos/poza y ribera del río
  let sand = smoothstep(194, 214, x);
  for (const lake of LAKES) {
    const d = Math.hypot(x - lake.x, z - lake.z);
    sand = Math.max(sand, smoothstep(lake.R * 1.18, lake.R * 0.92, d));
  }
  const pool = WATERFALL.pool;
  sand = Math.max(sand, smoothstep(pool.R * 1.3, pool.R, Math.hypot(x - pool.x, z - pool.z)));
  const dRiver = polylineDistance(RIVER.points, x, z);
  sand = Math.max(sand, smoothstep(RIVER.halfWidth + 1.5, RIVER.halfWidth - 1.5, dRiver));

  // suelo de bosque (más tierra, menos césped)
  const dForest = Math.hypot(x - FOREST.x, z - FOREST.z);
  dirt = Math.max(dirt, smoothstep(FOREST.radius, FOREST.radius * 0.45, dForest) * 0.7);

  const h = heightAt(x, z);
  const water = h < WATER_THRESHOLD ? 1 : 0;

  return { hard: clamp01(hard), sand: clamp01(sand), water, dirt: clamp01(dirt) };
}

/**
 * Densidad de césped 0..1 en un punto: sin césped sobre pavimento, agua,
 * arena, roca empinada ni nieve; menos césped en tierra de bosque.
 */
export function grassDensityAt(x, z) {
  const s = surfaceAt(x, z);
  if (s.water || s.hard > 0.5) return 0;
  const h = heightAt(x, z);
  const slope = slopeAt(x, z);
  let d = (1 - s.hard) * (1 - s.sand) * (1 - s.dirt * 0.6);
  d *= 1 - smoothstep(0.28, 0.5, slope);
  d *= 1 - smoothstep(48, 70, h);
  return clamp01(d);
}
