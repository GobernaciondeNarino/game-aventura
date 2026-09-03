// Perfiles de calidad gráfica. Se elige automáticamente según el dispositivo
// o de forma explícita con `?calidad=alta|media|baja` en la URL.

export const QUALITY_PROFILES = {
  alta: {
    id: 'alta',
    terrainSegments: 640,
    mapSize: 1024,
    shadowMapSize: 4096,
    shadowSpan: 70,
    grassTileRadius: 4,      // tiles de 16 m alrededor del jugador (9×9)
    grassDensity: 1,
    treeNearRadius: 110,
    ambientOcclusion: true,
    bloom: true,
    smaa: true,
    seaReflection: 512,      // 0 desactiva el reflejo del mar
    maxPixelRatio: 2,
    clouds: true,
    leafParticles: 420,
    anisotropy: 8,
  },
  media: {
    id: 'media',
    terrainSegments: 448,
    mapSize: 768,
    shadowMapSize: 2048,
    shadowSpan: 60,
    grassTileRadius: 3,
    grassDensity: 0.6,
    treeNearRadius: 80,
    ambientOcclusion: false,
    bloom: true,
    smaa: true,
    seaReflection: 256,
    maxPixelRatio: 1.5,
    clouds: true,
    leafParticles: 250,
    anisotropy: 4,
  },
  baja: {
    id: 'baja',
    terrainSegments: 320,
    mapSize: 512,
    shadowMapSize: 1024,
    shadowSpan: 50,
    grassTileRadius: 2,
    grassDensity: 0.35,
    treeNearRadius: 50,
    ambientOcclusion: false,
    bloom: false,
    smaa: false,
    seaReflection: 0,
    maxPixelRatio: 1,
    clouds: true,
    leafParticles: 120,
    anisotropy: 2,
  },
};

function isTouchDevice() {
  return (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0)
    || (typeof window !== 'undefined' && 'ontouchstart' in window);
}

/** Devuelve el perfil de calidad a usar. */
export function detectQuality() {
  let requested = null;
  try {
    requested = new URLSearchParams(window.location.search).get('calidad');
  } catch {
    requested = null;
  }
  if (requested && QUALITY_PROFILES[requested]) return QUALITY_PROFILES[requested];

  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  const memory = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 8;
  const touch = isTouchDevice();
  const smallScreen = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600;

  if (touch && smallScreen) return QUALITY_PROFILES.baja;
  if (touch || cores <= 4 || memory <= 4) return QUALITY_PROFILES.media;
  return QUALITY_PROFILES.alta;
}

/** Número de workers para hornear el terreno. */
export function bakeWorkerCount() {
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  return Math.max(2, Math.min(6, cores - 1));
}
