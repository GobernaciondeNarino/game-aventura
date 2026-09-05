// Matemática del terreno (sin Three.js, determinista).
//
// `heightAt(x, z)` es la "verdad" del relieve para todo el juego: la malla del
// terreno, las texturas de altura/superficie que consume la GPU (césped) y las
// entidades (jugador, NPC, balones, fauna, props) consultan esta misma función.
//
// Composición del relieve:
//   1. colinas suaves de ruido fBm y cordilleras (anillo cercano y horizonte),
//   2. "niveles": terrazas planas a distinta cota para las zonas jugables
//      (plaza, vías, complejo deportivo, laberinto, tienda a cota 0; cada sitio
//      turístico en su propia terraza) unidas por rampas a lo largo de los
//      senderos,
//   3. conos volcánicos que nacen de la terraza de cada volcán (y cráteres),
//   4. playa que desciende hacia el Pacífico en el sector este,
//   5. colina rocosa de la cascada,
//   6. cuencas negativas: lagos, poza, río somero y cañón del Guáitara.

import { createNoise2D } from 'simplex-noise';
import { SITES, sitePathEnd } from '../world/sitesData.js';
import {
  RING_ROAD_RADIUS, ROAD_POLYLINES, ROUNDABOUTS, COMPLEX_PATHS, COMPLEX_PAD, MAZE, SHOP,
  SHOP_ACCESS_ROAD, SHOP_PARKING, SKATE_SPAWN, PLAZA, SEA_LEVEL, BEACH, LAKES, WATERFALL,
  RIVER, FOREST, SPORT_ZONES, PATH_RAMP_START,
} from '../world/worldLayout.js';

// Extensión de la malla de terreno (media anchura) y de las texturas de mapa.
export const TERRAIN_EXTENT = 900;
export const MAP_HALF = 360;
// Umbral bajo el cual una zona se considera agua (respecto al nivel local).
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

// Distancia de (px,pz) al segmento a-b y parámetro t del punto más cercano.
function segmentClosest(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + dx * t;
  const cz = az + dz * t;
  return { d: Math.hypot(px - cx, pz - cz), t };
}

function segmentDistance(px, pz, ax, az, bx, bz) {
  return segmentClosest(px, pz, ax, az, bx, bz).d;
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

// Senderos de la plaza a cada sitio (cápsulas) con su rampa.
const SITE_PATHS = SITES.map((site) => {
  const len = Math.hypot(site.position.x, site.position.z) || 1;
  const ux = site.position.x / len;
  const uz = site.position.z / len;
  const start = 20;
  const padRadius = site.padRadius ?? (site.solidRadius || 8) + 12;
  const end = sitePathEnd(site);
  return {
    id: site.id,
    ux, uz, len,
    ax: ux * start, az: uz * start, bx: ux * end, bz: uz * end,
    halfWidth: 6,
    hardHalfWidth: PLAZA.pathWidth / 2 + 0.2,
    rampFullAt: Math.max(PATH_RAMP_START + 20, len - padRadius - 2),
    elevation: site.elevation || 0,
    // en los volcanes el pavimento termina al pie del cono (sigue un sendero de tierra)
    coneStart: site.terrain?.cone ? len - site.terrain.cone.radius : Infinity,
  };
});

const SITE_PADS = SITES.map((site) => ({
  id: site.id,
  x: site.position.x, z: site.position.z,
  // dirección unitaria hacia la plaza (para el sendero que sube el cono)
  tx: -site.position.x / (Math.hypot(site.position.x, site.position.z) || 1),
  tz: -site.position.z / (Math.hypot(site.position.x, site.position.z) || 1),
  flatRadius: site.padRadius ?? (site.solidRadius || 8) + 12,
  hardRadius: (site.solidRadius || 8) * 0.9,
  h: site.elevation || 0,
  cone: site.terrain?.cone || null,
  crater: site.terrain?.crater || null,
}));

const MAZE_HALF = MAZE.size / 2;

// Cota de la rampa de un sendero en función de la distancia radial recorrida.
function rampHeight(path, radial) {
  return path.elevation * smoothstep(PATH_RAMP_START, path.rampFullAt, radial);
}

// ---- máscaras --------------------------------------------------------------

/**
 * Máscara (0..1) de las estructuras jugables a cota 0: plaza, vías, glorietas,
 * parque deportivo, laberinto, tienda, patineta y orillas de agua. Los conos
 * volcánicos no pueden invadirlas.
 */
export function structureMask(x, z) {
  const r = Math.hypot(x, z);
  let m = softMask(Math.max(0, r - 30), 10); // plaza y explanada central
  m = Math.max(m, softMask(Math.max(0, Math.abs(r - RING_ROAD_RADIUS) - 8), 8));
  for (const road of ROAD_POLYLINES) {
    m = Math.max(m, softMask(Math.max(0, polylineDistance(road, x, z) - 6), 8));
  }
  for (const rb of ROUNDABOUTS) {
    m = Math.max(m, softMask(Math.max(0, Math.hypot(x - rb.x, z - rb.z) - 11), 8));
  }
  m = Math.max(m, softMask(rectOutside(x, z, COMPLEX_PAD.x, COMPLEX_PAD.z, COMPLEX_PAD.hw, COMPLEX_PAD.hd), 14));
  m = Math.max(m, softMask(rectOutside(x, z, MAZE.cx, MAZE.cz, MAZE_HALF + 4, MAZE_HALF + 4), 10));
  m = Math.max(m, softMask(rectOutside(x, z, SHOP.x, SHOP.z, SHOP.size / 2 + 10, SHOP.size / 2 + 10), 10));
  m = Math.max(m, softMask(Math.max(0, segmentDistance(x, z, SHOP_ACCESS_ROAD.x, SHOP_ACCESS_ROAD.z0, SHOP_ACCESS_ROAD.x, SHOP_ACCESS_ROAD.z1) - 5), 8));
  m = Math.max(m, softMask(rectOutside(x, z, SHOP_PARKING.x, SHOP_PARKING.z, SHOP_PARKING.hw + 1.5, SHOP_PARKING.hd + 1.5), 6));
  m = Math.max(m, softMask(Math.max(0, Math.hypot(x - SKATE_SPAWN.x, z - SKATE_SPAWN.z) - 4), 6));
  for (const lake of LAKES) {
    m = Math.max(m, softMask(Math.max(0, Math.hypot(x - lake.x, z - lake.z) - lake.R * 1.35), 12));
  }
  const pool = WATERFALL.pool;
  m = Math.max(m, softMask(Math.max(0, Math.hypot(x - pool.x, z - pool.z) - pool.R * 1.4), 10));
  m = Math.max(m, softMask(Math.max(0, polylineDistance(RIVER.points, x, z) - RIVER.canyonRim - 2), 10));
  return m;
}

/**
 * Terrazas ("niveles"): devuelve la máscara total y la cota objetivo ponderada
 * de todas las zonas planas (estructuras a cota 0, terrazas de sitios a su
 * elevación y rampas de los senderos).
 */
export function padHeightAt(x, z) {
  let mMax = structureMask(x, z);
  let mSum = mMax;
  let hSum = 0; // las estructuras están a cota 0

  for (const pad of SITE_PADS) {
    const d = Math.hypot(x - pad.x, z - pad.z);
    const m = softMask(Math.max(0, d - pad.flatRadius), 10);
    if (m > 0) {
      mMax = Math.max(mMax, m);
      mSum += m;
      hSum += m * pad.h;
    }
  }
  for (const p of SITE_PATHS) {
    const c = segmentClosest(x, z, p.ax, p.az, p.bx, p.bz);
    const m = softMask(Math.max(0, c.d - p.halfWidth), 8);
    if (m > 0) {
      const radial = x * p.ux + z * p.uz;
      const h = rampHeight(p, radial);
      mMax = Math.max(mMax, m);
      mSum += m;
      hSum += m * h;
    }
  }
  return { m: mMax, h: mSum > 0 ? hSum / mSum : 0 };
}

/** Compatibilidad: máscara de zonas planas (sin la cota). */
export function flatMask(x, z) {
  return padHeightAt(x, z).m;
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

// Conos volcánicos (y cráteres) de los sitios, protegidos por la máscara de estructuras.
function volcanoesAt(x, z, structure) {
  let h = 0;
  for (const pad of SITE_PADS) {
    if (!pad.cone) continue;
    const dx = x - pad.x;
    const dz = z - pad.z;
    const d = Math.hypot(dx, dz);
    const R = pad.cone.radius;
    if (d >= R) continue;
    let slope = Math.pow(1 - smoothstep(0, R, d), 1.35);
    let inside = 0; // interior del cráter (0..1)
    let plateau = 1;
    if (pad.crater) {
      // cumbre truncada: meseta a la altura del borde, donde se excava el cráter
      const rc = pad.crater.radius;
      plateau = Math.pow(1 - smoothstep(0, R, rc), 1.35);
      slope = Math.min(slope, plateau);
      inside = 1 - smoothstep(rc * 0.45, rc * 0.95, d);
    }
    let cone = pad.cone.height * slope;
    // Sendero de subida: cresta de pendiente constante hacia la plaza.
    const along = dx * pad.tx + dz * pad.tz;
    const lateral = Math.abs(dx * pad.tz - dz * pad.tx);
    const trail = softMask(Math.max(0, lateral - 3.5), 6) * smoothstep(-3, 3, along);
    if (trail > 0) {
      const ramp = pad.crater
        ? pad.cone.height * plateau * (1 - smoothstep(pad.crater.radius, R, d))
        : pad.cone.height * (1 - d / R);
      cone = cone * (1 - trail) + ramp * trail;
    }
    // rugosidad de la ladera (no dentro del cráter ni sobre el sendero)
    cone += (1 - d / R) * 1.6 * fbm2(x * 0.07 + 3, z * 0.07 - 5, 2) * (1 - inside) * (1 - trail * 0.8);
    if (pad.crater) cone -= pad.crater.depth * inside;
    h += cone;
  }
  return h * (1 - structure);
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

/**
 * Muestra el río: distancia al eje, nivel del agua y encajonamiento
 * interpolados en el tramo más cercano.
 */
export function riverSample(x, z) {
  const pts = RIVER.points;
  let best = { d: Infinity, level: pts[0].level, canyon: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const c = segmentClosest(x, z, a.x, a.z, b.x, b.z);
    if (c.d < best.d) {
      best = {
        d: c.d,
        level: a.level + (b.level - a.level) * c.t,
        canyon: a.canyon + (b.canyon - a.canyon) * c.t,
      };
    }
  }
  return best;
}

function basinsAt(x, z) {
  let b = 0;
  for (const lake of LAKES) {
    const d = Math.hypot(x - lake.x, z - lake.z);
    if (lake.wall) {
      // lago de fondo de cañón: pared casi vertical hasta el fondo
      const bottom = lake.level - lake.depth;
      b += bottom * smoothstep(lake.R, lake.R * 0.72, d);
    } else {
      b += basinDepth(d, lake.R, lake.depth);
    }
  }
  const pool = WATERFALL.pool;
  b += basinDepth(Math.hypot(x - pool.x, z - pool.z), pool.R, pool.depth);

  const rs = riverSample(x, z);
  if (rs.d < RIVER.canyonRim) {
    // cauce somero (perfil suave) mezclado con el cañón (paredes abruptas)
    const shallow = rs.d < RIVER.halfWidth ? -RIVER.depth * (1 - smoothstep(0, RIVER.halfWidth, rs.d)) : 0;
    const bed = rs.level - RIVER.bedOffset;
    const canyon = bed * (1 - smoothstep(RIVER.canyonHalfWidth, RIVER.canyonRim, rs.d));
    b += shallow * (1 - rs.canyon) + canyon * rs.canyon;
  }
  return b;
}

// ---- API pública -----------------------------------------------------------

/** Altura del terreno (m) en coordenadas de mundo. */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const pad = padHeightAt(x, z);
  const natural = hillsAt(x, z, r) + mountainsAt(x, z, r);
  let h = natural * (1 - pad.m) + pad.h * pad.m;
  h += volcanoesAt(x, z, structureMask(x, z));
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

/**
 * Nivel del agua que cubre un punto dado (o null si está en seco).
 * Comprueba mar, lagos, poza y río con sus niveles propios.
 */
export function waterLevelAt(x, z) {
  const h = heightAt(x, z);
  if (x > BEACH.shoreline - 8 && h < SEA_LEVEL + 0.03) return SEA_LEVEL;
  for (const lake of LAKES) {
    if (Math.hypot(x - lake.x, z - lake.z) < lake.R && h < lake.level + 0.03) return lake.level;
  }
  const pool = WATERFALL.pool;
  if (Math.hypot(x - pool.x, z - pool.z) < pool.R && h < pool.level + 0.03) return pool.level;
  const rs = riverSample(x, z);
  if (rs.d < RIVER.canyonRim && h < rs.level + 0.03) return rs.level;
  return null;
}

/** true si el punto está bajo un espejo de agua (lago, poza, río o mar). */
export function isWaterAt(x, z) {
  return waterLevelAt(x, z) !== null;
}

/**
 * Clasificación de superficie para texturizado y colocación de vegetación.
 * @returns {{hard:number, sand:number, water:number, dirt:number}}
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
    const radial = x * p.ux + z * p.uz;
    const paved = 1 - smoothstep(p.coneStart - 8, p.coneStart, radial);
    hard = Math.max(hard, softMask(Math.max(0, d - p.hardHalfWidth), 0.8) * paved);
    dirt = Math.max(dirt, softMask(Math.max(0, d - p.hardHalfWidth), 3.5) * (0.7 + 0.25 * (1 - paved)));
  }
  for (const pad of SITE_PADS) {
    const d = Math.hypot(x - pad.x, z - pad.z);
    hard = Math.max(hard, softMask(Math.max(0, d - pad.hardRadius), 1.5));
    dirt = Math.max(dirt, softMask(Math.max(0, d - pad.hardRadius), 4) * 0.5);
    if (pad.cone) {
      // ladera volcánica: tierra y ceniza, sin césped cerca de la cumbre
      const t = 1 - smoothstep(pad.cone.radius * 0.35, pad.cone.radius, d);
      dirt = Math.max(dirt, t * 0.9);
    }
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
    if (lake.wall) sand = Math.max(sand, smoothstep(lake.R * 1.25, lake.R * 1.02, d) * 0.6);
    else sand = Math.max(sand, smoothstep(lake.R * 1.18, lake.R * 0.92, d));
  }
  const pool = WATERFALL.pool;
  sand = Math.max(sand, smoothstep(pool.R * 1.3, pool.R, Math.hypot(x - pool.x, z - pool.z)));
  const rs = riverSample(x, z);
  const bank = RIVER.halfWidth * (1 - rs.canyon) + RIVER.canyonRim * rs.canyon;
  sand = Math.max(sand, smoothstep(bank + 1.5, bank - 1.5, rs.d) * (1 - rs.canyon * 0.6));

  // suelo de bosque (más tierra, menos césped)
  const dForest = Math.hypot(x - FOREST.x, z - FOREST.z);
  dirt = Math.max(dirt, smoothstep(FOREST.radius, FOREST.radius * 0.45, dForest) * 0.7);

  const water = waterLevelAt(x, z) !== null ? 1 : 0;

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
