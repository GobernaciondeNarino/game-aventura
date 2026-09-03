// Texturas de ez-tree (MIT, Daniel Greenheck) — versión recortada para este
// proyecto: solo se incluyen corteza de roble y pino y hojas de roble, fresno y
// pino (≈1.3 MB en lugar de 4 MB). Los tipos no incluidos se mapean al más
// parecido. Las texturas se cargan de forma perezosa la primera vez que se piden.
import * as THREE from 'three';

import oakColor from './assets/oak_color_1k.jpg';
import oakNormal from './assets/oak_normal_1k.jpg';
import pineColor from './assets/pine_color_1k.jpg';
import pineNormal from './assets/pine_normal_1k.jpg';
import oakLeaves from './assets/oak_color.png';
import ashLeaves from './assets/ash_color.png';
import pineLeaves from './assets/pine_color.png';

const textureLoader = new THREE.TextureLoader();
const cache = new Map();
const pending = [];

const BARK_ALIASES = { birch: 'oak', willow: 'oak', oak: 'oak', pine: 'pine' };
const LEAF_ALIASES = { aspen: 'ash', ash: 'ash', oak: 'oak', pine: 'pine' };

const BARK_URLS = {
  oak: { color: oakColor, normal: oakNormal },
  pine: { color: pineColor, normal: pineNormal },
};
const LEAF_URLS = { oak: oakLeaves, ash: ashLeaves, pine: pineLeaves };

function loadTexture(url, srgb) {
  const key = url + (srgb ? '|srgb' : '');
  let tex = cache.get(key);
  if (!tex) {
    let done;
    pending.push(new Promise((resolve) => { done = resolve; }));
    tex = textureLoader.load(url, done, undefined, done);
    tex.premultiplyAlpha = true;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    cache.set(key, tex);
  }
  return tex;
}

// Textura neutra (blanca / normal plana) para ao/roughness que no incluimos.
function flatTexture(rgb) {
  const key = 'flat|' + rgb.join(',');
  let tex = cache.get(key);
  if (!tex) {
    const data = new Uint8Array([rgb[0], rgb[1], rgb[2], 255]);
    tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    cache.set(key, tex);
  }
  return tex;
}

/** Promesa que se resuelve cuando todas las texturas solicitadas han cargado. */
export function whenTexturesReady() {
  return Promise.all(pending);
}

/**
 * @param {string} barkType
 * @param {'ao' | 'color' | 'normal' | 'roughness'} fileType
 * @param {{x:number,y:number}} scale
 */
export function getBarkTexture(barkType, fileType, scale = { x: 1, y: 1 }) {
  const type = BARK_ALIASES[barkType] || 'oak';
  let texture;
  if (fileType === 'color') texture = loadTexture(BARK_URLS[type].color, true);
  else if (fileType === 'normal') texture = loadTexture(BARK_URLS[type].normal, false);
  else if (fileType === 'roughness') texture = flatTexture([235, 235, 235]);
  else texture = flatTexture([255, 255, 255]);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.x = scale.x;
  texture.repeat.y = 1 / scale.y;
  return texture;
}

/** @param {string} leafType */
export function getLeafTexture(leafType) {
  const type = LEAF_ALIASES[leafType] || 'oak';
  return loadTexture(LEAF_URLS[type], true);
}
