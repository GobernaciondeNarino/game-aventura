// Disposición general del mundo (datos puros, sin Three.js).
//
// Reúne en un solo lugar las coordenadas que comparten varios sistemas:
// las vías, las glorietas, los senderos del complejo deportivo, el laberinto,
// la tienda y los nuevos cuerpos de agua del entorno realista. El terreno usa
// estas formas para dejar planas las zonas jugables y para decidir dónde crece
// el césped, dónde hay arena y dónde hay agua.

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

// ---- Agua del entorno realista ----------------------------------------------

// Nivel del mar (y) y perfil de la playa: la arena baja hacia el Pacífico.
export const SEA_LEVEL = -0.45;
export const BEACH = { sandStart: 190, sandFull: 235, shoreline: 252, slope: 0.09 };

// Lagos naturales en las colinas (cuencas excavadas en el terreno).
export const LAKES = [
  { id: 'laguna-alta', x: 140, z: 75, R: 22, depth: 4.2, level: -0.5 },
  { id: 'laguna-baja', x: -125, z: -135, R: 18, depth: 3.6, level: -0.5 },
];

// Cascada: colina rocosa al oeste y poza a sus pies.
export const WATERFALL = {
  hill: { x: -214, z: 22, sx: 15, sz: 24, height: 34 },
  top: { x: -207, z: 22 },
  pool: { x: -176, z: 18, R: 10, depth: 2.6, level: -0.5 },
};

// Río: nace en la poza de la cascada y desemboca en la laguna baja.
export const RIVER = {
  level: -0.55,
  halfWidth: 6,
  depth: 1.7,
  points: [
    { x: -176, z: 18 }, { x: -188, z: -2 }, { x: -187, z: -30 }, { x: -172, z: -65 },
    { x: -152, z: -98 }, { x: -136, z: -122 }, { x: -125, z: -135 },
  ],
};

// Bosque de niebla alrededor de la cascada (centro y radio de dispersión).
export const FOREST = { x: -200, z: 0, radius: 62 };

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
