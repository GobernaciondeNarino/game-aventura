// Disposición general del mundo (datos puros, sin Three.js).
//
// Reúne en un solo lugar las coordenadas que comparten varios sistemas:
// las vías, las glorietas, los senderos del complejo deportivo, el laberinto,
// la tienda y los cuerpos de agua del entorno realista. El terreno usa estas
// formas para dejar planas las zonas jugables, para excavar lagos, río y cañón
// y para decidir dónde crece el césped, dónde hay arena y dónde hay agua.

// Radio de la vía circunvalar (coincide con RING_ROAD_RADIUS de roads.js).
export const RING_ROAD_RADIUS = 92;

// Vías (polilíneas) que salen de la circunvalar. Ancho de cinta: 4 m.
export const ROAD_POLYLINES = [
  [{ x: 92, z: 0 }, { x: 108, z: 10 }, { x: 120, z: 0 }, { x: 150, z: -8 }, { x: 206, z: 0 }],
  [{ x: -92, z: 0 }, { x: -118, z: -10 }, { x: -150, z: 0 }, { x: -176, z: 0 }],
  [{ x: 0, z: -92 }, { x: 10, z: -116 }, { x: 0, z: -138 }],
  [{ x: 0, z: 92 }, { x: 0, z: 100 }],
];

// Glorietas (centro y radio exterior del anillo pavimentado).
export const ROUNDABOUTS = [
  { x: 92, z: 0 }, { x: -92, z: 0 }, { x: 0, z: -92 }, { x: 0, z: 92 }, { x: 120, z: 0 }, { x: -150, z: 0 },
].map((c) => ({ ...c, r: 8.5 }));

// Senderos del complejo deportivo (cintas de 3.6 m).
const HUB_A = { x: 0, z: 80 };
const HUB_B = { x: 15, z: 102 };
const HUB_C = { x: 22, z: 128 };
const HUB_D = { x: 22, z: 158 };
const HUB_E = { x: 24, z: 192 };
export const COMPLEX_PATHS = [
  [HUB_A, HUB_B, HUB_C, HUB_D, HUB_E, { x: 20, z: 222 }],
  [HUB_A, { x: 16, z: 62 }, { x: 18, z: 44 }, { x: 8, z: 28 }],
  [HUB_B, { x: -28, z: 116 }, { x: -68, z: 124 }],
  [HUB_C, { x: 44, z: 122 }, { x: 50, z: 120 }],
  [HUB_D, { x: 15, z: 163 }, { x: 12, z: 165 }],
  [HUB_D, { x: 45, z: 160 }, { x: 50, z: 160 }],
  [HUB_E, { x: 42, z: 202 }, { x: 37, z: 205 }],
  [HUB_E, { x: 6, z: 208 }, { x: -2, z: 212 }],
  [HUB_E, { x: -16, z: 202 }, { x: -36, z: 210 }],
  [HUB_C, { x: 55, z: 128 }, { x: 84, z: 130 }],
];

// Rectángulo (suave) que se aplana bajo todo el parque deportivo.
export const COMPLEX_PAD = { x: 5, z: 172, hw: 118, hd: 82 };

// Laberinto y su base pavimentada.
export const MAZE = { cx: 0, cz: -185, size: 74, cols: 11 };

// Tienda Ñaño, su vía de acceso (hacia la vía del este) y el parqueadero.
export const SHOP = { x: 140, z: -130, size: 14 };
export const SHOP_ACCESS_ROAD = { x: 140, z0: -122, z1: -2, halfWidth: 2.5 };
export const SHOP_PARKING = { x: 140, z: -119, hw: 5.5, hd: 3.5 };

// Patineta (punto de aparición).
export const SKATE_SPAWN = { x: 5, z: -140 };

// Plaza central: anillo pavimentado de 17 a 24 m, senderos desde 23 m.
export const PLAZA = { innerRadius: 17, outerRadius: 24, pathStart: 23, pathWidth: 3.2 };

// Senderos a los sitios: la rampa hacia la terraza del sitio empieza pasada la
// circunvalar (a este radio) y alcanza la cota del sitio al llegar a su terraza.
export const PATH_RAMP_START = 110;

// ---- Agua del entorno realista ----------------------------------------------

// Nivel del mar (y) y perfil de la playa: la arena baja hacia el Pacífico.
export const SEA_LEVEL = -0.45;
export const BEACH = { sandStart: 190, sandFull: 235, shoreline: 252, slope: 0.09 };

// Lagos. `wall: true` = lago de fondo de cañón (paredes casi verticales).
export const LAKES = [
  // La Laguna de La Cocha: el gran lago del nordeste (el sitio está en su orilla suroeste).
  { id: 'cocha', x: 140, z: 75, R: 34, depth: 6, level: -0.5, rim: 0 },
  // Laguna baja: remanso al final del cañón del río, 12 m por debajo de la meseta.
  { id: 'laguna-baja', x: -125, z: -135, R: 18, depth: 3, level: -12.5, rim: 0, wall: true },
];

// Cascada: colina rocosa al oeste y poza a sus pies.
export const WATERFALL = {
  hill: { x: -214, z: 22, sx: 15, sz: 24, height: 34 },
  top: { x: -207, z: 22 },
  pool: { x: -176, z: 18, R: 10, depth: 2.6, level: -0.5 },
};

// Río Guáitara (en miniatura): nace en la poza de la cascada, baja por unos
// rápidos y se encajona en un cañón bajo el Santuario de Las Lajas, hasta la
// laguna baja. `level` es la cota del agua en cada vértice; `canyon` (0..1)
// indica cuánto se encajona el cauce en ese tramo.
export const RIVER = {
  halfWidth: 6,        // cauce somero
  depth: 1.7,          // profundidad del cauce somero bajo la meseta
  canyonHalfWidth: 6,  // fondo del cañón
  canyonRim: 11,       // distancia al eje donde termina la pared del cañón
  bedOffset: 1.3,      // el lecho queda esta distancia bajo el nivel del agua
  points: [
    { x: -176, z: 18, level: -0.55, canyon: 0 },
    { x: -188, z: -2, level: -0.55, canyon: 0 },
    { x: -187, z: -30, level: -0.55, canyon: 0.15 },
    { x: -180, z: -50, level: -4, canyon: 0.8 },
    { x: -172, z: -65, level: -12.5, canyon: 1 },
    { x: -152, z: -98, level: -12.5, canyon: 1 },
    { x: -136, z: -122, level: -12.5, canyon: 1 },
    { x: -125, z: -135, level: -12.5, canyon: 1 },
  ],
};

// Bosque de niebla alrededor de la cascada (centro y radio de dispersión).
export const FOREST = { x: -200, z: 0, radius: 62 };

/**
 * Colisionadores de seguridad: impiden caer al cañón del río y a la laguna
 * baja (paredes casi verticales de las que no se podría salir).
 */
export function buildGuardColliders() {
  const guards = [];
  const pts = RIVER.points;
  for (let i = 2; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(len / 7));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      guards.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, r: RIVER.canyonRim + 1 });
    }
  }
  for (const lake of LAKES) {
    if (lake.wall) guards.push({ x: lake.x, z: lake.z, r: lake.R + 1.5 });
  }
  return guards;
}

// Canchas del complejo deportivo (centro, semiejes, puntos y nombre).
export const SPORT_ZONES = [
  { id: 'athletics', type: 'athletics', x: -30, z: 165, hw: 44, hd: 28, points: 60, name: 'Pista de Atletismo y Fútbol 11' },
  { id: 'futbol5a', type: 'futbol5', x: 62, z: 120, hw: 12, hd: 8, points: 30, name: 'Cancha de Fútbol 5' },
  { id: 'futbol5b', type: 'futbol5', x: 62, z: 160, hw: 12, hd: 8, points: 30, name: 'Cancha de Fútbol 5' },
  { id: 'basket1', type: 'basket', x: 50, z: 205, hw: 14, hd: 8, points: 40, name: 'Cancha de Baloncesto' },
  { id: 'basket2', type: 'basket', x: 98, z: 130, hw: 14, hd: 8, points: 40, name: 'Cancha de Baloncesto' },
  { id: 'voley1', type: 'voley', x: -12, z: 212, hw: 9, hd: 5, points: 35, name: 'Cancha de Voleibol' },
  { id: 'voley2', type: 'voley', x: -45, z: 210, hw: 9, hd: 5, points: 35, name: 'Cancha de Voleibol' },
  { id: 'tejo', type: 'tejo', x: -82, z: 125, hw: 12, hd: 7, points: 25, name: 'Canchas de Tejo' },
];
