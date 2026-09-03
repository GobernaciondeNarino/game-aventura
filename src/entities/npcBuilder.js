// Constructor de figuras de NPC estilo bloques: torso, abrigo opcional, cabeza,
// ojos, boca, sombrero/pelo, brazos y piernas articulados. Devuelve el grupo
// y las articulaciones (caderas y hombros) para animarlas desde fuera.
// Usa el PRNG determinista (rand/pick) para que la población sea reproducible.
import { Group } from 'three';
import { box, cyl, sphere } from '../world/primitives.js';
import { rand, pick } from '../core/prng.js';

export const SKIN_TONES = [16769154, 16638145, 15909515, 14262374, 13010498, 9262372, 6964259];
export const CLOTHES_COLORS = [1725046, 12597547, 2600544, 9323693, 15105570, 2899536, 1482885, 13937677];
export const HAT_TYPES = ['straw', 'cap', 'top', 'beanie', 'none', 'none'];
export const HAIR_COLORS = [3875864, 7027231, 1710618, 12094010, 9058853];

const BLACK = 1710618;
const STRAW_COLOR = 15255648;
const DEFAULT_SKIN = 16769154;

/**
 * Construye una figura de NPC. Todas las opciones son opcionales; las que
 * falten se eligen con el PRNG determinista (en el mismo orden que el original).
 * @returns {{ group: Group, hipL: Group, hipR: Group, shoulderL: Group, shoulderR: Group }}
 */
export function buildNpcFigure(options = {}) {
  const skinColor = options.head ?? pick(SKIN_TONES);
  const torsoColor = options.torso ?? pick(CLOTHES_COLORS);
  const legsColor = options.legs ?? pick(CLOTHES_COLORS);
  const hatType = options.hat ?? pick(HAT_TYPES);
  const hatColor = options.hatColor ?? pick(CLOTHES_COLORS);
  const hasCoat = options.coat ?? rand() < .4;
  const coatColor = options.coatColor ?? pick(CLOTHES_COLORS);

  const group = new Group();

  // Torso
  const torso = box(.7, .55, .42, torsoColor);
  torso.position.y = 1.175;
  group.add(torso);

  // Abrigo (opcional)
  if (hasCoat) {
    const coat = box(.78, .62, .5, coatColor);
    coat.position.y = 1.1;
    group.add(coat);
  }

  // Cadera
  const hips = box(.7, .22, .42, legsColor);
  hips.position.y = .79;
  group.add(hips);

  // Cuello y cabeza
  const neck = cyl(.12, .13, .1, skinColor, { seg: 10 });
  neck.position.y = 1.5;
  group.add(neck);

  const head = cyl(.27, .27, .48, skinColor, { seg: 18 });
  head.position.y = 1.77;
  group.add(head);

  // Ojos
  for (const eyeX of [-.1, .1]) {
    const eye = sphere(.04, BLACK, { seg: 6 });
    eye.position.set(eyeX, 1.84, .255);
    group.add(eye);
  }

  // Boca
  const mouth = box(.16, .03, .02, BLACK);
  mouth.position.set(0, 1.7, .265);
  group.add(mouth);

  addNpcHat(group, hatType, hatColor);

  // Brazos (pivotan en el hombro)
  const shoulderL = buildNpcArm(torsoColor, 1, skinColor);
  const shoulderR = buildNpcArm(torsoColor, -1, skinColor);
  group.add(shoulderL);
  group.add(shoulderR);

  // Piernas (pivotan en la cadera)
  const hipL = buildNpcLeg(legsColor, 1);
  const hipR = buildNpcLeg(legsColor, -1);
  group.add(hipL);
  group.add(hipR);

  return { group, hipL, hipR, shoulderL, shoulderR };
}

// Añade sombrero o peinado según el tipo elegido.
function addNpcHat(group, hatType, hatColor) {
  if (hatType === 'straw') {
    const brim = cyl(.42, .42, .06, STRAW_COLOR, { seg: 16 });
    brim.position.y = 2.02;
    group.add(brim);
    const crown = cyl(.24, .26, .22, STRAW_COLOR, { seg: 14 });
    crown.position.y = 2.14;
    group.add(crown);
  } else if (hatType === 'cap') {
    const dome = sphere(.29, hatColor, { seg: 12 });
    dome.scale.y = .6;
    dome.position.y = 2.02;
    group.add(dome);
    const visor = box(.34, .05, .28, hatColor);
    visor.position.set(0, 1.98, .28);
    group.add(visor);
  } else if (hatType === 'top') {
    const brim = cyl(.36, .36, .05, BLACK, { seg: 16 });
    brim.position.y = 2.02;
    group.add(brim);
    const crown = cyl(.24, .24, .4, BLACK, { seg: 14 });
    crown.position.y = 2.24;
    group.add(crown);
  } else if (hatType === 'beanie') {
    const dome = sphere(.3, hatColor, { seg: 12 });
    dome.scale.y = .7;
    dome.position.y = 2.04;
    group.add(dome);
  } else if (hatType === 'hairLong') {
    // Pelo largo: casquete, melena trasera, mechones laterales y flequillo.
    const cap = sphere(.3, hatColor, { seg: 14 });
    cap.scale.y = .7;
    cap.position.y = 2.04;
    group.add(cap);
    const backHair = box(.5, .85, .18, hatColor);
    backHair.position.set(0, 1.55, -.22);
    group.add(backHair);
    for (const sideX of [-.22, .22]) {
      const sideLock = box(.14, .55, .12, hatColor);
      sideLock.position.set(sideX, 1.65, .1);
      group.add(sideLock);
    }
    const bangs = box(.45, .15, .1, hatColor);
    bangs.position.set(0, 1.98, .22);
    group.add(bangs);
  }
}

// Brazo articulado en el hombro: brazo superior, antebrazo y mano.
function buildNpcArm(sleeveColor, side, skinColor = DEFAULT_SKIN) {
  const shoulder = new Group();
  shoulder.position.set(side * .4, 1.4, 0);
  const upperArm = cyl(.085, .08, .32, sleeveColor, { seg: 8 });
  upperArm.position.set(side * .04, -.15, 0);
  upperArm.rotation.z = side * -.12;
  shoulder.add(upperArm);
  const forearm = cyl(.08, .075, .3, sleeveColor, { seg: 8 });
  forearm.position.set(side * .085, -.4, .05);
  shoulder.add(forearm);
  const hand = sphere(.09, skinColor, { seg: 8 });
  hand.position.set(side * .085, -.55, .06);
  shoulder.add(hand);
  return shoulder;
}

// Pierna articulada en la cadera: muslo y pie.
function buildNpcLeg(pantsColor, side) {
  const hip = new Group();
  hip.position.set(side * .18, .68, 0);
  const thigh = box(.32, .68, .4, pantsColor);
  thigh.position.y = -.34;
  hip.add(thigh);
  const foot = box(.34, .08, .46, pantsColor);
  foot.position.set(0, -.66, .03);
  hip.add(foot);
  return hip;
}
