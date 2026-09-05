// Sitios turísticos de Nariño: datos, ubicación en el mundo y relieve asociado.
//
// Cada sitio está integrado al entorno realista:
//   - `elevation`: cota (m) de la terraza plana sobre la que se asienta el sitio;
//     el sendero desde la plaza sube en rampa hasta ella ("niveles del terreno").
//   - `padRadius`: radio de la terraza (por defecto solidRadius + 12).
//   - `terrain.cone`: para los volcanes, el propio terreno forma el cono
//     (altura y radio) y el sitio (cráter, nieve, humo) se coloca en la cumbre.
//   - `terrain.crater`: hundimiento en la cumbre (laguna cratérica).
// La rotación base de la maqueta mira hacia la plaza; `rotation` la ajusta.

export const SITES = [
  {
    id: 'lajas',
    name: 'Santuario de Las Lajas',
    municipio: 'Ipiales',
    // Sobre el cañón del río (el río baja al cañón unos metros antes).
    position: { x: -162, z: -81.5 },
    rotation: Math.PI / 2, // el puente cruza el cañón (perpendicular al río)
    scale: 1,
    elevation: 0,
    padRadius: 26,
    proximityRadius: 30,
    solidRadius: 13,
    description:
      'Basílica neogótica levantada sobre un puente de piedra de unos 50 metros de altura, en el cañón del río Guáitara. Construida entre 1916 y 1949 en el lugar donde, según la tradición, la Virgen apareció sobre una roca.',
    builderFn: 'buildLajas',
  },
  {
    id: 'cocha',
    name: 'Laguna de La Cocha',
    municipio: 'El Encano (Pasto)',
    // En la orilla del gran lago del nordeste; la Isla La Corota queda dentro del agua.
    position: { x: 99, z: 53 },
    rotation: 0,
    scale: 1,
    elevation: 0,
    padRadius: 22,
    proximityRadius: 28,
    solidRadius: 11,
    description:
      'Segundo lago natural más grande de Colombia, a unos 2.760 m de altitud. En su interior está la Isla La Corota, Santuario de Flora y Fauna. En la orilla destacan las casas de techos altos de estilo alpino del corregimiento de El Encano.',
    builderFn: 'buildCocha',
  },
  {
    id: 'galeras',
    name: 'Volcán Galeras',
    municipio: 'Pasto',
    // Cono volcánico real en el terreno, al suroeste de la ciudad.
    position: { x: -110, z: -190 },
    rotation: 0,
    scale: 1,
    elevation: 14,
    padRadius: 48,
    terrain: { cone: { height: 34, radius: 48 } },
    proximityRadius: 26,
    solidRadius: 7,
    description:
      'Volcán activo de unos 4.276 m que domina la ciudad de San Juan de Pasto. Es uno de los volcanes más vigilados de Colombia y un símbolo del paisaje nariñense.',
    builderFn: 'buildGaleras',
  },
  {
    id: 'cumbal',
    name: 'Volcán Cumbal',
    municipio: 'Cumbal',
    // El nevado más alto: el cono más grande, con casquete de nieve.
    position: { x: 95, z: -220 },
    rotation: 0,
    scale: 1,
    elevation: 16,
    padRadius: 52,
    terrain: { cone: { height: 42, radius: 52 } },
    proximityRadius: 28,
    solidRadius: 8,
    description:
      'El nevado más alto de Nariño, con unos 4.764 m de altitud. Su cima cubierta de hielo es un referente del resguardo indígena de los Pastos en el suroccidente del departamento.',
    builderFn: 'buildCumbal',
  },
  {
    id: 'azufral',
    name: 'Laguna Verde de Azufral',
    municipio: 'Túquerres',
    // Volcán bajo y ancho con laguna en el cráter.
    position: { x: 150, z: -195 },
    rotation: 0,
    scale: 1,
    elevation: 10,
    padRadius: 26,
    terrain: { cone: { height: 12, radius: 26 }, crater: { depth: 5, radius: 13 } },
    proximityRadius: 22,
    solidRadius: 9,
    description:
      'Laguna que ocupa el cráter del volcán Azufral, a unos 3.970 m. Su característico color verde turquesa se debe a los minerales de azufre disueltos en el agua.',
    builderFn: 'buildAzufral',
  },
  {
    id: 'catedral',
    name: 'Catedral de Pasto',
    municipio: 'Pasto',
    // En la "ciudad": dentro de la circunvalar, al sur de la plaza.
    position: { x: 0, z: -56 },
    rotation: 0,
    scale: 1,
    elevation: 0,
    padRadius: 24,
    proximityRadius: 24,
    solidRadius: 12,
    description:
      'Templo del centro histórico de San Juan de Pasto, de fachada republicana con dos torres. Forma parte del rico patrimonio religioso de la ciudad, conocida por sus iglesias y su Carnaval de Negros y Blancos.',
    builderFn: 'buildCatedral',
  },
  {
    id: 'planada',
    name: 'Reserva La Planada',
    municipio: 'Ricaurte',
    // Bosque de niebla del noroeste, en una terraza baja.
    position: { x: -140, z: 105 },
    rotation: 0,
    scale: 1,
    elevation: 4,
    padRadius: 22,
    proximityRadius: 24,
    solidRadius: 9,
    description:
      'Reserva natural de bosque de niebla en territorio del pueblo Awá, reconocida por su enorme biodiversidad de aves, orquídeas y anfibios. Un refugio del piedemonte costero nariñense.',
    builderFn: 'buildPlanada',
  },
  {
    id: 'morro',
    name: 'El Morro de Tumaco',
    municipio: 'Tumaco',
    // En la playa, con el arco natural metido en el mar.
    position: { x: 252, z: -85 },
    rotation: 0,
    scale: 1,
    elevation: 0,
    padRadius: 18,
    proximityRadius: 24,
    solidRadius: 9,
    description:
      'Formación rocosa con un arco natural en la costa pacífica de San Andrés de Tumaco. Es el emblema de la ciudad, rodeado de playas, palmeras y el mar abierto.',
    builderFn: 'buildMorro',
  },
  {
    id: 'chiles',
    name: 'Volcán Chiles',
    municipio: 'Cumbal',
    // Cono del noroeste, con páramo de frailejones y aguas termales en la ladera.
    position: { x: -215, z: 100 },
    rotation: 0,
    scale: 1,
    elevation: 12,
    padRadius: 48,
    terrain: { cone: { height: 36, radius: 48 } },
    proximityRadius: 26,
    solidRadius: 7,
    description:
      'Volcán de unos 4.748 m situado en la frontera entre Colombia y Ecuador. Sus páramos y aguas termales lo rodean de un paisaje altoandino único.',
    builderFn: 'buildChiles',
  },
  {
    id: 'sandona',
    name: 'Sandoná — Paja Toquilla',
    municipio: 'Sandoná',
    // Pueblo colonial en una terraza de la región del Guáitara.
    position: { x: -170, z: 160 },
    rotation: 0,
    scale: 1,
    elevation: 6,
    padRadius: 24,
    proximityRadius: 24,
    solidRadius: 10,
    description:
      'Municipio de la región del Guáitara famoso por la artesanía en paja toquilla: sombreros y tejidos elaborados a mano. Sus casas coloniales blancas con techo de teja son parte de su encanto.',
    builderFn: 'buildSandona',
  },
];

/** Rotación (rad, eje Y) de la maqueta de un sitio: mira a la plaza más `rotation`. */
export function siteRotation(site) {
  return Math.atan2(-site.position.x, -site.position.z) + (site.rotation || 0);
}

/**
 * Distancia radial (desde la plaza) donde termina el sendero de un sitio: en
 * el borde del cráter para las lagunas volcánicas, junto al radio sólido en
 * los demás.
 */
export function sitePathEnd(site) {
  const len = Math.hypot(site.position.x, site.position.z);
  if (site.terrain?.crater) return len - site.terrain.crater.radius - 1;
  return len - (site.solidRadius || 8) - 1;
}
