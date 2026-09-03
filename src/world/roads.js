// Red de carreteras: anillo perimetral de radio RING_ROAD_RADIUS, ramales curvos
// (cintas) hacia el exterior y rotondas con monumento en los cruces.
import {
  Group,
  Mesh,
  RingGeometry,
  MeshStandardMaterial,
  DoubleSide,
  RepeatWrapping,
  CanvasTexture,
} from 'three';
import { cyl, sphere, cone, PALETTE } from './primitives.js';
import { ribbonMesh } from './ribbon.js';

export const RING_ROAD_RADIUS = 92;

// Construye carreteras y rotondas. Devuelve el grupo y los colisionadores de las rotondas.
export function buildRoads(scene) {
  const group = new Group();
  group.name = 'roads';
  const colliders = [];
  const roadMaterial = new MeshStandardMaterial({
    map: makeRoadTexture(),
    color: 16777215,
    roughness: .85,
    side: DoubleSide,
  });
  const pavementMaterial = new MeshStandardMaterial({
    color: 15922165,
    roughness: .9,
    side: DoubleSide,
  });
  // Anillo perimetral.
  const ringRoad = new Mesh(new RingGeometry(RING_ROAD_RADIUS - 2, RING_ROAD_RADIUS + 2, 72), pavementMaterial);
  ringRoad.rotation.x = -Math.PI / 2;
  ringRoad.position.y = .05;
  ringRoad.receiveShadow = true;
  group.add(ringRoad);
  // Ramales que salen del anillo hacia la playa, el bosque, el sur y el norte.
  const spurs = [
    [
      { x: RING_ROAD_RADIUS, z: 0 },
      { x: 108, z: 10 },
      { x: 120, z: 0 },
      { x: 150, z: -8 },
      { x: 206, z: 0 },
    ],
    [
      { x: -RING_ROAD_RADIUS, z: 0 },
      { x: -118, z: -10 },
      { x: -150, z: 0 },
      { x: -176, z: 0 },
    ],
    [
      { x: 0, z: -RING_ROAD_RADIUS },
      { x: 10, z: -116 },
      { x: 0, z: -138 },
    ],
    [
      { x: 0, z: RING_ROAD_RADIUS },
      { x: 0, z: 100 },
    ],
  ];
  for (const points of spurs) group.add(ribbonMesh(points, 4, roadMaterial));
  // Rotondas en los cuatro cruces del anillo y en dos puntos de los ramales.
  const roundabouts = [
    [RING_ROAD_RADIUS, 0],
    [-RING_ROAD_RADIUS, 0],
    [0, -RING_ROAD_RADIUS],
    [0, RING_ROAD_RADIUS],
    [120, 0],
    [-150, 0],
  ];
  for (const [x, z] of roundabouts) addRoundabout(group, colliders, x, z, pavementMaterial);
  scene.add(group);
  return { group, colliders };
}

// Rotonda: anillo pavimentado, isleta verde y monumento (pilar, esfera dorada y aguja).
function addRoundabout(parent, colliders, x, z, material) {
  const ring = new Mesh(new RingGeometry(4.5, 8.5, 36), material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, .06, z);
  ring.receiveShadow = true;
  parent.add(ring);
  const island = cyl(4.4, 4.7, .5, PALETTE.green, { seg: 24 });
  island.position.set(x, .25, z);
  parent.add(island);
  const pillar = cyl(.5, .7, 3, PALETTE.ninoBlue, { seg: 8 });
  pillar.position.set(x, 2, z);
  parent.add(pillar);
  const orb = sphere(.7, PALETTE.gold, { seg: 12, metalness: .5, roughness: .3 });
  orb.position.set(x, 3.7, z);
  parent.add(orb);
  const spire = cone(.5, 1, 58879, { seg: 10 });
  spire.position.set(x, 4.4, z);
  parent.add(spire);
  colliders.push({ x, z, r: 4.8 });
}

// Textura de carretera: asfalto claro con bordes cian y línea central discontinua.
function makeRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f6f9';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0, 200, 235, 0.5)';
  ctx.fillRect(5, 0, 4, 128);
  ctx.fillRect(119, 0, 4, 128);
  ctx.fillStyle = 'rgba(150,160,175,0.5)';
  ctx.fillRect(128 / 2 - 3, 16, 6, 48);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
