// Maquetas de los diez sitios turísticos de Nariño, rediseñadas a partir de la
// forma y estructura reales de cada lugar e integradas al relieve: cada builder
// recibe un contexto `ctx` con la cota local del terreno (`ctx.groundAt(lx, lz)`),
// el nivel del agua (`ctx.waterAt`), y listas donde registrar colisionadores
// locales (`ctx.colliders`) y animaciones (`ctx.tickers`). Marco local: +Z mira
// hacia la plaza central (salvo Las Lajas, cuyo puente corre a lo largo de X).
import { Group, Mesh, TorusGeometry, SphereGeometry, ConeGeometry, BoxGeometry, MeshBasicMaterial, DoubleSide } from 'three';
import { stdMat } from './primitives.js';
import {
  MATS, texMat, tileTexture, plasterTexture, woodTexture, slab, drum, spire, dome, gableRoof, hipRoof, archedWall,
  column, stairs, balustrade, windowPane, roseWindow, signBoard, fence, terrainSkin, craterRim, waterDisc, steam,
  frailejon, boat, pier, leafyTree, palm, boulder, lamppost, bench,
} from './siteParts.js';

const SLATE = stdMat(0x59616b, { roughness: 0.7 });
const ASH = stdMat(0x5a504a, { roughness: 1 });
const SULFUR = stdMat(0xd9c24a, { roughness: 0.9 });
const ICE = stdMat(0xcfe6f5, { roughness: 0.3, metalness: 0.05 });
const MOSS = stdMat(0x556b2f, { roughness: 1 });
const FERN = stdMat(0x3f8a3a, { roughness: 0.95, side: DoubleSide });
const BUSH = stdMat(0x2f6b34, { roughness: 0.95 });

function rand(min, max) { return min + Math.random() * (max - min); }

// ---- Santuario de Las Lajas -----------------------------------------------
// Puente de piedra de dos niveles sobre el cañón (que corre a lo largo de Z) y
// basílica neogótica gris apoyada contra la pared rocosa del lado lejano.
function buildLajas(ctx) {
  const g = new Group();
  const bridge = MATS.stoneDark;
  const wall = MATS.stone;

  // Nivel inferior: dos grandes arcos que bajan hasta el fondo del cañón.
  g.add(archedWall(26, 9.6, 8, [
    { x: -5.6, w: 7.6, h: 8.2 }, { x: 5.6, w: 7.6, h: 8.2 },
  ], bridge, { y: -14 }));
  // Nivel superior: arquería menor.
  g.add(archedWall(26, 4.4, 8, [-9, -4.5, 0, 4.5, 9].map((x) => ({ x, w: 2.6, h: 3.5 })), bridge, { y: -4.4 }));
  // Tablero y balaustradas.
  g.add(slab(26.4, 0.5, 8.6, wall, 0, 0.25, 0));
  g.add(balustrade(13, wall, { height: 1.05, x: -6.5, y: 0.5, z: 4.2 }));
  g.add(balustrade(13, wall, { height: 1.05, x: -6.5, y: 0.5, z: -4.2 }));
  g.add(balustrade(11, wall, { height: 1.05, x: 7.5, y: 0.5, z: 4.2 }));
  // Farolas del puente.
  for (const x of [-11, -6, -1]) for (const z of [3.9, -3.9]) g.add(lamppost({ x, y: 0.5, z, height: 2.6 }));

  // Basílica: nave con contrafuertes, ventanas apuntadas, torre central y dos laterales.
  const b = new Group();
  b.position.set(7.2, 0.5, 0);
  b.scale.set(1.12, 1.3, 1.12); // la basílica real es esbelta y domina el puente
  b.add(slab(10, 8, 6.6, wall, 0, 4, 0));
  b.add(gableRoof(10, 6.6, 2.6, SLATE, { y: 8, overhang: 0.2 }));
  for (const side of [-1, 1]) {
    for (const x of [-3.2, -1, 1.2, 3.4]) {
      b.add(windowPane(0.85, 3, { kind: 'pointed', x, y: 3.2, z: side * 3.3 - (side < 0 ? 0.06 : 0), frame: MATS.stoneDark }));
    }
    for (const x of [-4.4, -2.1, 0.1, 2.3, 4.5]) {
      b.add(slab(0.7, 7.2, 0.9, wall, x, 3.6, side * 3.7));
      b.add(spire(0.42, 1.4, SLATE, 4, x, 7.2, side * 3.7));
    }
  }
  // Fachada (mira a -X, hacia la plaza) con portal apuntado y rosetón.
  const facade = archedWall(6.6, 9, 0.7, [{ x: 0, w: 2.2, h: 4.4, kind: 'pointed' }], wall);
  facade.rotation.y = -Math.PI / 2;
  facade.position.set(-5.05, 0, 0);
  b.add(facade);
  b.add(roseWindow(1.15, { x: -5.45, y: 6.6, z: 0, rotY: -Math.PI / 2 }));
  // Torre central sobre la fachada.
  b.add(slab(3.4, 16, 3.4, wall, -3.4, 8, 0));
  b.add(spire(2.2, 6.5, SLATE, 8, -3.4, 16, 0));
  for (const z of [-1.1, 1.1]) b.add(windowPane(0.6, 2.4, { kind: 'pointed', x: -5.15, y: 11.5, z, rotY: -Math.PI / 2, frame: MATS.stoneDark }));
  for (const [dx, dz] of [[-1.7, -1.7], [-1.7, 1.7], [1.7, -1.7], [1.7, 1.7]]) b.add(spire(0.36, 1.6, SLATE, 4, -3.4 + dx, 16, dz));
  // Torres laterales.
  for (const z of [-2.7, 2.7]) {
    b.add(slab(1.9, 11.5, 1.9, wall, -4.4, 5.75, z));
    b.add(spire(1.25, 4, SLATE, 8, -4.4, 11.5, z));
    b.add(windowPane(0.45, 1.8, { kind: 'pointed', x: -5.4, y: 8.4, z, rotY: -Math.PI / 2, frame: MATS.stoneDark }));
  }
  // Ábside pegado a la roca (la peña donde apareció la imagen).
  b.add(drum(3.2, 8, wall, 18, 5, 4, 0));
  b.add(spire(3.3, 2.4, SLATE, 18, 5, 8, 0));
  g.add(b);

  // Pared rocosa del lado lejano y vegetación.
  for (let i = 0; i < 12; i++) {
    const z = -9 + i * 1.6 + rand(-0.3, 0.3);
    const x = 14.5 + rand(0, 3) + Math.abs(z) * 0.12;
    const size = rand(1.3, 2.4);
    g.add(boulder(size, i % 3 ? MATS.rock : MATS.rockDark, { x, y: ctx.groundAt(x, z) - size * 0.45, z, sy: rand(0.8, 1.3) }));
  }
  for (const [x, z] of [[17, -7], [18, 6], [19.5, -1], [21, 4]]) g.add(leafyTree(rand(4, 6), { x, y: ctx.groundAt(x, z), z }));
  ctx.colliders.push({ x: 15.5, z: 0, r: 4.5 }, { x: 17, z: -7, r: 2.6 }, { x: 18, z: 6, r: 2.6 }, { x: 21, z: 0, r: 2.2 });

  // Explanada de los peregrinos (lado de la plaza): mirador con balaustrada.
  const mirador = balustrade(22, wall, { height: 1.05 });
  mirador.rotation.y = Math.PI / 2;
  mirador.position.set(-12.9, 0.05, 0);
  g.add(mirador);
  for (const z of [-8, 0, 8]) g.add(lamppost({ x: -14.2, y: 0, z, height: 3 }));
  g.add(bench({ x: -16, y: 0, z: -6, rotY: Math.PI / 2 }), bench({ x: -16, y: 0, z: 6, rotY: Math.PI / 2 }));
  g.add(signBoard('Santuario de Las Lajas', { x: -17, y: 0, z: -10, rotY: Math.PI / 2 }));
  ctx.colliders.push({ x: -16, z: -6, r: 0.8 }, { x: -16, z: 6, r: 0.8 }, { x: -17, z: -10, r: 0.6 });
  return g;
}

// ---- Laguna de La Cocha ----------------------------------------------------
// Caserío de El Encano: casas de techos altos y coloridos, muelle, lanchas con
// toldo, totoras y, dentro del lago, la Isla La Corota con su bosque y capilla.
function buildCocha(ctx) {
  const g = new Group();
  const roofs = [0xa63a2a, 0x2f6b4a, 0x2a5d8a, 0x8a3a6b, 0xc0662a];
  const alpineHouse = (x, z, rotY, roofColor, wide = 4) => {
    const h = new Group();
    h.add(slab(wide, 3, 4.6, MATS.plaster, 0, 1.5, 0));
    h.add(slab(wide + 0.1, 0.5, 4.7, MATS.woodDark, 0, 0.25, 0)); // zócalo de madera
    h.add(gableRoof(wide, 4.6, 3.8, texMat(tileTexture(cssOf(roofColor)), { repeat: 0.6 }), { y: 3, overhang: 0.35, ridge: 'z' }));
    // frontón de madera y ventanas con macetas
    h.add(windowPane(0.7, 0.8, { x: -1, y: 1.3, z: 2.31, frame: MATS.woodDark }), windowPane(0.7, 0.8, { x: 1, y: 1.3, z: 2.31, frame: MATS.woodDark }));
    h.add(windowPane(0.6, 0.7, { x: 0, y: 4.2, z: 2.31 + 0.001, frame: MATS.woodDark }));
    h.add(slab(0.9, 1.9, 0.12, MATS.woodDark, 0, 0.95, 2.34));
    for (const fx of [-1, 1]) h.add(slab(0.8, 0.2, 0.25, stdMat(0xd9483b, { roughness: 0.9 }), fx, 1.2, 2.45));
    h.add(drum(0.18, 1.6, MATS.stoneDark, 8, wide / 2 - 0.5, 4.6, -1));
    h.position.set(x, 0, z);
    h.rotation.y = rotY;
    return h;
  };
  const spots = [[-9, 3, Math.PI / 2], [-9.5, -3, Math.PI / 2], [9, 3, -Math.PI / 2], [9.5, -3, -Math.PI / 2], [-3.5, -7, 0], [3.5, -7, 0]];
  spots.forEach(([x, z, r], i) => {
    g.add(alpineHouse(x, z, r, roofs[i % roofs.length], i > 3 ? 3.6 : 4));
    ctx.colliders.push({ x, z, r: 3 });
  });
  // Capilla pequeña del caserío.
  const chapel = new Group();
  chapel.add(slab(3.4, 3.2, 4.4, MATS.plaster, 0, 1.6, 0));
  const chapelRoof = gableRoof(3.4, 4.4, 2.2, MATS.tile, { y: 3.2, ridge: 'z' });
  chapel.add(chapelRoof, slab(1.1, 4.8, 1.1, MATS.plaster, 0, 2.4, -1.3), spire(0.8, 1.6, MATS.tile, 4, 0, 4.8, -1.3));
  chapel.add(slab(0.06, 0.7, 0.06, MATS.gold, 0, 6.7, -1.3), slab(0.4, 0.06, 0.06, MATS.gold, 0, 6.85, -1.3));
  chapel.position.set(0, 0, 4);
  chapel.rotation.y = Math.PI;
  g.add(chapel);
  ctx.colliders.push({ x: 0, z: 4, r: 2.6 });

  // Paseo de madera en la orilla, muelle y lanchas.
  g.add(slab(24, 0.12, 2.2, MATS.wood, 0, 0.12, -10.6));
  g.add(pier(12, 2.2, { deckY: 0.45, pileDepth: 5, x: 0, y: 0, z: -11.5 }));
  const water = ctx.waterAt(0, -16) ?? -0.5;
  g.add(boat(3.4, { color: 0x2f6fb3, x: 1.9, y: water, z: -17, rotY: Math.PI / 2 }));
  g.add(boat(3.2, { color: 0xd94a3a, x: -1.9, y: water, z: -19.5, rotY: Math.PI / 2 }));
  g.add(boat(3, { color: 0xf2c94c, roof: false, x: -6, y: water, z: -15, rotY: 0.4 }));
  // Totoras (juncos) a lo largo de la orilla.
  for (let i = 0; i < 40; i++) {
    const x = rand(-14, 14);
    const z = -12.2 - rand(0, 2.2);
    if (Math.abs(x) < 1.6) continue;
    const reed = drum(0.04, rand(1, 1.7), stdMat(0x6b8f3a, { roughness: 1 }), 5, x, 0, z);
    reed.position.y = (ctx.waterAt(x, z) ?? -0.5) + reed.geometry.parameters.height / 2 - 0.2;
    reed.rotation.z = rand(-0.15, 0.15);
    g.add(reed);
  }

  // Isla La Corota, dentro del lago: monte boscoso con capilla.
  const island = new Group();
  island.position.set(0, water, -40);
  island.add(drum(6.5, 7, stdMat(0x6b5a44, { roughness: 1 }), 20, 0, -3.5 + 0.3, 0));
  const mound = new Mesh(new SphereGeometry(6.8, 20, 12), stdMat(0x3d6b2f, { roughness: 1 }));
  mound.scale.set(1, 0.42, 1);
  mound.receiveShadow = true;
  island.add(mound);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const d = 1.5 + (i % 3) * 1.6;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const y = 2.85 * Math.sqrt(Math.max(0, 1 - (d * d) / (6.8 * 6.8))) - 0.2;
    island.add(leafyTree(rand(4, 6.5), { x, y, z }));
  }
  const corota = new Group();
  corota.add(slab(2.2, 2, 2.6, MATS.plaster, 0, 1, 0), spire(0.4, 1.5, MATS.tile, 4, 0, 3.2, -0.8), slab(0.7, 1.4, 0.7, MATS.plaster, 0, 2.6, -0.8));
  corota.add(gableRoof(2.2, 2.6, 1.2, MATS.tile, { y: 2, ridge: 'z' }));
  corota.position.set(0, 2.6, 0);
  island.add(corota);
  g.add(island);
  g.add(signBoard('Laguna de La Cocha · El Encano', { x: -6, y: 0, z: 9, rotY: 0 }));
  ctx.colliders.push({ x: -6, z: 9, r: 0.6 });
  return g;
}

// ---- Volcán Galeras --------------------------------------------------------
// Cumbre de ceniza con cráter humeante, fumarolas y la caseta de vigilancia.
function buildGaleras(ctx) {
  const g = new Group();
  g.add(terrainSkin(ctx, 13, ASH, { lift: 0.14, wobble: 0.5, seed: 3 }));
  g.add(craterRim(ctx, 6.4, { count: 26, size: 1.5 }));
  const floor = drum(5.2, 0.4, MATS.lava, 24, 0, -0.1, 0);
  g.add(floor);
  const glow = new Mesh(new SphereGeometry(1.1, 12, 8), new MeshBasicMaterial({ color: 0xff5a1a }));
  glow.scale.y = 0.35;
  glow.position.y = 0.25;
  g.add(glow);
  const smoke = steam(8, { radius: 1.2, rise: 20, size: 3, color: 0xe2dedb, opacity: 0.16, speed: 0.16, drift: 2.4, y: 0.6 });
  const fumarole = steam(8, { radius: 0.8, rise: 5, size: 1.6, color: 0xf0f0f0, opacity: 0.32, speed: 0.4, x: 5.5, y: ctx.groundAt(5.5, -3) + 0.2, z: -3 });
  g.add(smoke.group, fumarole.group);
  ctx.tickers.push(smoke.tick, fumarole.tick, (dt) => { glow.material.color.setHSL(0.05, 1, 0.5 + 0.12 * Math.sin(performance.now() * 0.004)); });
  // Rocas volcánicas por la ladera.
  for (let i = 0; i < 18; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(8, 24);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const size = rand(0.7, 1.8);
    g.add(boulder(size, i % 2 ? MATS.rockDark : MATS.rock, { x, y: ctx.groundAt(x, z) - size * 0.15, z }));
    if (size > 1.2) ctx.colliders.push({ x, z, r: size * 0.9 });
  }
  // Caseta de monitoreo con antena y panel solar.
  const hut = new Group();
  const hx = 9.5, hz = 9;
  hut.add(slab(2.6, 2.2, 2.2, stdMat(0xe8e2d2, { roughness: 0.9 }), 0, 1.1, 0));
  hut.add(hipRoof(2.6, 2.2, 0.7, MATS.metal, { y: 2.2, overhang: 0.25 }));
  hut.add(drum(0.04, 5.5, MATS.metal, 6, -0.8, 2.2 + 2.75, -0.6));
  hut.add(slab(0.7, 0.05, 0.7, MATS.metal, -0.8, 7.9, -0.6));
  const panel = slab(1.4, 0.06, 1, stdMat(0x1c2a44, { roughness: 0.3, metalness: 0.4 }), 1.9, 1.2, 0);
  panel.rotation.x = -0.5;
  hut.add(panel, slab(0.1, 1, 0.1, MATS.metal, 1.9, 0.5, 0));
  hut.add(windowPane(0.7, 0.6, { x: 0, y: 1.1, z: 1.11 }));
  hut.position.set(hx, ctx.groundAt(hx, hz), hz);
  hut.rotation.y = -0.6;
  g.add(hut);
  ctx.colliders.push({ x: hx, z: hz, r: 2.1 });
  g.add(signBoard('Volcán Galeras · 4.276 m', { x: 3, y: ctx.groundAt(3, 8.5), z: 8.5 }));
  ctx.colliders.push({ x: 3, z: 8.5, r: 0.6 });
  return g;
}

// ---- Volcán Cumbal ---------------------------------------------------------
// Casquete glaciar irregular sobre la cumbre, bloques de hielo, fumarola de
// azufre y refugio de piedra en la ladera.
function buildCumbal(ctx) {
  const g = new Group();
  g.add(terrainSkin(ctx, 21, MATS.snow, { lift: 0.32, wobble: 0.55, seed: 5, rings: 12, spokes: 48 }));
  g.add(terrainSkin(ctx, 12, stdMat(0xffffff, { roughness: 0.45 }), { lift: 0.55, wobble: 0.4, seed: 9 }));
  for (const [cx, cz, r] of [[-9, 14, 4], [12, -10, 3.5], [-14, -6, 3]]) {
    g.add(terrainSkin(ctx, r, MATS.snow, { lift: 0.25, wobble: 0.6, seed: 11 + cx, cx, cz, rings: 5, spokes: 20 }));
  }
  // Grietas y bloques de hielo cerca de la cumbre.
  for (let i = 0; i < 12; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(2, 9);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const block = slab(rand(0.6, 1.6), rand(0.4, 1.2), rand(0.6, 1.4), ICE, x, ctx.groundAt(x, z) + 0.5, z);
    block.rotation.set(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3));
    g.add(block);
  }
  g.add(craterRim(ctx, 4.2, { count: 14, size: 1, material: stdMat(0xe4ecf2, { roughness: 0.6 }) }));
  // Fumarola de azufre en la ladera oeste.
  g.add(terrainSkin(ctx, 3.2, SULFUR, { lift: 0.4, wobble: 0.5, seed: 21, cx: -9, cz: -9, rings: 4, spokes: 16 }));
  const vent = steam(9, { radius: 0.9, rise: 6, size: 2, color: 0xf7f2dc, opacity: 0.35, speed: 0.35, x: -9, y: ctx.groundAt(-9, -9) + 0.3, z: -9 });
  g.add(vent.group);
  ctx.tickers.push(vent.tick);
  // Refugio de piedra con techo rojo.
  const cabin = new Group();
  const cx = 11, cz = 13;
  cabin.add(slab(4, 2.4, 3.2, MATS.stoneWarm, 0, 1.2, 0));
  cabin.add(gableRoof(4, 3.2, 1.6, texMat(tileTexture('#8f2f2a'), { repeat: 0.6 }), { y: 2.4 }));
  cabin.add(slab(0.8, 1.7, 0.1, MATS.woodDark, 0, 0.85, 1.62), windowPane(0.6, 0.6, { x: 1.2, y: 1.2, z: 1.61 }), windowPane(0.6, 0.6, { x: -1.2, y: 1.2, z: 1.61 }));
  cabin.add(drum(0.2, 1.2, MATS.stoneDark, 8, 1.4, 3.4, -0.8));
  cabin.position.set(cx, ctx.groundAt(cx, cz), cz);
  cabin.rotation.y = -0.7;
  g.add(cabin);
  ctx.colliders.push({ x: cx, z: cz, r: 2.8 });
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(14, 26);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const size = rand(0.8, 1.7);
    g.add(boulder(size, MATS.rock, { x, y: ctx.groundAt(x, z) - size * 0.2, z }));
    if (size > 1.2) ctx.colliders.push({ x, z, r: size * 0.9 });
  }
  g.add(signBoard('Nevado de Cumbal · 4.764 m', { x: 4, y: ctx.groundAt(4, 10), z: 10 }));
  ctx.colliders.push({ x: 4, z: 10, r: 0.6 });
  return g;
}

// ---- Laguna Verde de Azufral ----------------------------------------------
// El cráter del volcán (excavado en el terreno) con la laguna turquesa, playas
// de azufre amarillo, fumarolas y el borde rocoso.
function buildAzufral(ctx) {
  const g = new Group();
  const level = 1.5;
  g.add(waterDisc(8.6, { color: 0x2fb39c, opacity: 0.9, y: level, normalScale: 0.14 }));
  for (const [cx, cz, r] of [[6.2, 2.5, 2.4], [-5.5, 4.5, 2], [1.5, -7, 2.6]]) {
    g.add(terrainSkin(ctx, r, SULFUR, { lift: 0.3, wobble: 0.6, seed: 31 + cx, cx, cz, rings: 4, spokes: 18 }));
  }
  const vents = [[7.5, 1.5], [-6.5, 5.5]];
  for (const [vx, vz] of vents) {
    const vent = steam(7, { radius: 0.6, rise: 4.5, size: 1.6, color: 0xf3efe0, opacity: 0.34, speed: 0.4, x: vx, y: ctx.groundAt(vx, vz) + 0.25, z: vz });
    g.add(vent.group);
    ctx.tickers.push(vent.tick);
  }
  g.add(craterRim(ctx, 12.6, { count: 30, size: 1.15, material: MATS.rock }));
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(14.5, 24);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const size = rand(0.6, 1.5);
    g.add(boulder(size, i % 2 ? MATS.rock : MATS.rockDark, { x, y: ctx.groundAt(x, z) - size * 0.2, z }));
    if (size > 1.2) ctx.colliders.push({ x, z, r: size * 0.9 });
  }
  // Mirador de madera en el borde, del lado del sendero.
  const deck = new Group();
  deck.add(slab(4, 0.14, 2.4, MATS.wood, 0, 0.5, 0));
  for (const [px, pz] of [[-1.8, -1], [1.8, -1], [-1.8, 1], [1.8, 1]]) deck.add(drum(0.1, 1.2, MATS.woodDark, 6, px, 0, pz));
  deck.add(balustrade(4, MATS.woodDark, { height: 0.9, y: 0.55, z: -1.1, thick: 0.08 }));
  deck.position.set(0, ctx.groundAt(0, 14), 14);
  g.add(deck);
  g.add(signBoard('Laguna Verde · Azufral · 3.970 m', { x: 4.5, y: ctx.groundAt(4.5, 15), z: 15 }));
  ctx.colliders.push({ x: 4.5, z: 15, r: 0.6 });
  return g;
}

// ---- Catedral de Pasto -----------------------------------------------------
// Templo republicano: pórtico de columnas con frontón, dos torres campanario
// con cúpulas, gran cúpula sobre el crucero y atrio con fuente y farolas.
function buildCatedral(ctx) {
  const g = new Group();
  const cream = MATS.plasterCream;
  const white = MATS.plaster;
  // Nave, crucero y ábside.
  g.add(slab(9, 10, 18, cream, 0, 5, 0));
  g.add(gableRoof(9, 18, 2.4, MATS.tile, { y: 10, overhang: 0.25, ridge: 'z' }));
  g.add(slab(15, 9.5, 5, cream, 0, 4.75, -3));
  g.add(gableRoof(15, 5, 2.2, MATS.tile, { y: 9.5, overhang: 0.25 }));
  g.add(drum(4, 9, cream, 20, 0, 4.5, -9.5));
  g.add(spire(4.2, 2, MATS.tile, 20, 0, 9, -9.5));
  // Cúpula sobre el crucero.
  g.add(drum(3.3, 3.2, white, 20, 0, 12.1, -3));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(windowPane(0.6, 1.6, { kind: 'round', x: Math.sin(a) * 3.3, y: 11.2, z: -3 + Math.cos(a) * 3.3, rotY: a }));
  }
  g.add(dome(3.4, MATS.tile, { squash: 0.85, lantern: true, y: 13.7, z: -3 }));
  // Ventanas laterales de medio punto y pilastras.
  for (const side of [-1, 1]) {
    for (const z of [-6.5, -0.5, 2.5, 5.5]) {
      g.add(windowPane(1, 3, { kind: 'round', x: side * 4.5 + (side > 0 ? 0 : -0.06), y: 4.6, z, rotY: side * Math.PI / 2 }));
    }
    for (const z of [-8, -4.5, 1, 4, 7.5]) g.add(slab(0.5, 9.6, 0.7, white, side * 4.6, 4.8, z));
  }
  // Fachada con tres puertas, pórtico de columnas y frontón.
  const facade = archedWall(9, 12, 0.8, [{ x: 0, w: 2.6, h: 5.2 }, { x: -3, w: 1.6, h: 3.8 }, { x: 3, w: 1.6, h: 3.8 }], white, { z: 8.9 });
  g.add(facade);
  g.add(slab(9.4, 0.5, 0.9, white, 0, 6.6, 8.95));
  for (const x of [-3.2, -1.1, 1.1, 3.2]) g.add(column(0.36, 6.1, white, { x, y: 0.5, z: 11 }));
  g.add(slab(9.4, 0.7, 2.6, white, 0, 6.95, 10.4));
  g.add(gableRoof(9.4, 2.6, 1.8, MATS.tile, { y: 7.3, z: 10.4, overhang: 0.15 }));
  const pediment = gableRoof(9, 0.3, 1.7, white, { y: 7.3, z: 11.6, overhang: 0 });
  g.add(pediment);
  g.add(roseWindow(0.9, { y: 9.6, z: 9.32 }));
  const steps = stairs(11, 4, 0.13, 0.4, MATS.stoneWarm);
  steps.rotation.y = Math.PI;
  steps.position.set(0, 0, 12.4);
  g.add(steps);
  // Torres campanario.
  for (const x of [-4.6, 4.6]) {
    g.add(slab(3, 14, 3, cream, x, 7, 8));
    g.add(slab(2.6, 3.4, 2.6, white, x, 15.7, 8));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      g.add(windowPane(0.9, 2.4, { kind: 'round', x: x + Math.sin(a) * 1.31, y: 14.2, z: 8 + Math.cos(a) * 1.31, rotY: a }));
      g.add(windowPane(0.7, 1.8, { kind: 'round', x: x + Math.sin(a) * 1.51, y: 9.4, z: 8 + Math.cos(a) * 1.51, rotY: a }));
    }
    g.add(slab(3.2, 0.4, 3.2, white, x, 17.5, 8));
    g.add(dome(1.5, MATS.tile, { squash: 1, lantern: true, x, y: 17.7, z: 8 }));
  }
  // Atrio: fuente, farolas, bancas y árboles.
  const fountain = new Group();
  fountain.add(drum(2.4, 0.7, MATS.stoneWarm, 24, 0, 0.35, 0));
  fountain.add(waterDisc(2.2, { color: 0x3a8fb0, opacity: 0.8, y: 0.62, normalScale: 0.25 }));
  fountain.add(drum(0.35, 1.6, MATS.stoneWarm, 12, 0, 0.8, 0), drum(0.9, 0.2, MATS.stoneWarm, 16, 0, 1.7, 0));
  const spray = steam(6, { radius: 0.3, rise: 1.6, size: 0.8, color: 0xdff4ff, opacity: 0.45, speed: 0.9, drift: 0.2, y: 1.8, additive: true });
  fountain.add(spray.group);
  ctx.tickers.push(spray.tick);
  fountain.position.set(7.5, 0, 13);
  g.add(fountain);
  ctx.colliders.push({ x: 7.5, z: 13, r: 2.7 });
  for (const [x, z] of [[-6, 16], [6, 18], [-12, 8], [12, 8], [-12, -4], [12, -4]]) g.add(lamppost({ x, y: 0, z, height: 3.2 }));
  for (const [x, z, r] of [[-9, 14, 0.3], [9.5, 8, -Math.PI / 2 + 0.2], [-10, 2, Math.PI / 2], [11, 0, -Math.PI / 2]]) {
    g.add(bench({ x, y: 0, z, rotY: r }));
    ctx.colliders.push({ x, z, r: 0.8 });
  }
  for (const [x, z] of [[-13, 12], [13, 14], [-14, -8], [14, -9], [-9, -14], [9, -14]]) {
    g.add(palm(rand(5, 6.5), { x, y: ctx.groundAt(x, z), z }));
    ctx.colliders.push({ x, z, r: 0.5 });
  }
  return g;
}

// ---- Reserva La Planada ----------------------------------------------------
// Bosque de niebla: portal de troncos, cabaña de visitantes, torre de
// observación con pasarela de dosel, árboles gigantes con musgo, helechos y bruma.
function buildPlanada(ctx) {
  const g = new Group();
  // Portal.
  const gate = new Group();
  for (const x of [-2.4, 2.4]) gate.add(drum(0.22, 4.2, MATS.woodDark, 8, x, 2.1, 0));
  gate.add(drum(0.16, 5.6, MATS.woodDark, 8, 0, 4.3, 0)).rotation.z = Math.PI / 2;
  gate.add(signBoard('Reserva Natural La Planada', { width: 4.2, height: 0.8, y: 1.4, z: -0.05 }));
  gate.position.set(0, 0, 9);
  g.add(gate);
  ctx.colliders.push({ x: -2.4, z: 9, r: 0.4 }, { x: 2.4, z: 9, r: 0.4 });
  // Cabaña de visitantes con porche.
  const cabin = new Group();
  cabin.add(slab(5.2, 3, 4.2, MATS.wood, 0, 1.5 + 0.4, 0));
  cabin.add(slab(6, 0.4, 5, MATS.woodDark, 0, 0.2, 0.4));
  cabin.add(hipRoof(6.4, 5.2, 2.2, stdMat(0x8a7a4a, { roughness: 1 }), { y: 3.4, overhang: 0.2, z: 0.3 }));
  for (const x of [-2.6, 2.6]) cabin.add(drum(0.12, 3, MATS.woodDark, 7, x, 1.9, 2.5));
  cabin.add(slab(0.9, 2, 0.1, MATS.woodDark, 0, 1.4, 2.13), windowPane(0.8, 0.7, { x: -1.6, y: 1.5, z: 2.12 }), windowPane(0.8, 0.7, { x: 1.6, y: 1.5, z: 2.12 }));
  cabin.position.set(-7, 0, 2);
  cabin.rotation.y = 0.35;
  g.add(cabin);
  ctx.colliders.push({ x: -7, z: 2, r: 3.4 });
  // Torre de observación.
  const tower = new Group();
  const th = 9.5;
  for (const [px, pz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    const leg = drum(0.13, th, MATS.woodDark, 7, px * 1.25, th / 2, pz * 1.25);
    tower.add(leg);
  }
  for (const level of [4.6, th]) {
    tower.add(slab(3.4, 0.14, 3.4, MATS.wood, 0, level, 0));
    for (const [rx, rz, ry] of [[0, 1.7, 0], [0, -1.7, 0], [1.7, 0, Math.PI / 2], [-1.7, 0, Math.PI / 2]]) {
      const rail = balustrade(3.4, MATS.woodDark, { height: 1, spacing: 0.7, thick: 0.07 });
      rail.rotation.y = ry;
      rail.position.set(rx, level + 0.07, rz);
      tower.add(rail);
    }
  }
  tower.add(hipRoof(3.8, 3.8, 1.4, stdMat(0x8a7a4a, { roughness: 1 }), { y: th + 1.4 }));
  for (const [px, pz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) tower.add(drum(0.09, 1.4, MATS.woodDark, 6, px * 1.25, th + 0.7, pz * 1.25));
  for (let i = 0; i < 9; i++) tower.add(slab(0.5, 0.05, 0.05, MATS.wood, 1.7, 0.5 + i * 0.5, 0));
  tower.position.set(6, 0, -3);
  g.add(tower);
  ctx.colliders.push({ x: 6, z: -3, r: 2.3 });
  // Pasarela de dosel colgante desde la torre hasta un árbol gigante.
  const treeSpot = { x: -4, z: -10 };
  const dx = treeSpot.x - 6;
  const dz = treeSpot.z + 3;
  const len = Math.hypot(dx, dz);
  const walk = new Group();
  const planks = Math.round(len / 0.5);
  for (let i = 0; i <= planks; i++) {
    const t = i / planks;
    const sag = -Math.sin(t * Math.PI) * 0.9;
    walk.add(slab(0.5, 0.06, 1, MATS.wood, -len / 2 + t * len, th + sag, 0));
    if (i % 2 === 0) for (const z of [-0.5, 0.5]) walk.add(drum(0.03, 1, MATS.woodDark, 5, -len / 2 + t * len, th + sag + 0.5, z));
  }
  for (const z of [-0.5, 0.5]) walk.add(slab(len, 0.05, 0.05, MATS.woodDark, 0, th + 1 - 0.3, z));
  walk.position.set(6 + dx / 2, 0, -3 + dz / 2);
  walk.rotation.y = -Math.atan2(dz, dx);
  g.add(walk);
  // Árboles gigantes con musgo y orquídeas, helechos.
  const giants = [[-4, -10, 13], [9, -11, 12], [-11, -5, 11], [2, -14, 12.5], [11, 4, 10], [-12, 8, 9.5]];
  for (const [x, z, h] of giants) {
    const y = ctx.groundAt(x, z);
    const tree = leafyTree(h, { x, y, z, trunk: 0x4a3a2c, leaves: 0x2a5e2c });
    g.add(tree);
    for (let k = 0; k < 4; k++) {
      const moss = new Mesh(new SphereGeometry(0.28, 6, 5), MOSS);
      moss.scale.set(1, 0.5, 1);
      moss.position.set(x + Math.cos(k * 1.6) * 0.32, y + 1.2 + k * 1.1, z + Math.sin(k * 1.6) * 0.32);
      g.add(moss);
      const orchid = new Mesh(new SphereGeometry(0.1, 6, 5), new MeshBasicMaterial({ color: [0xe76bb2, 0xf2e36b, 0xffffff][k % 3] }));
      orchid.position.set(x + Math.cos(k * 2.3) * 0.4, y + 1.6 + k * 1.05, z + Math.sin(k * 2.3) * 0.4);
      g.add(orchid);
    }
    ctx.colliders.push({ x, z, r: 0.8 });
  }
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(3, 17);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (z > 6 && Math.abs(x) < 3) continue;
    const fern = new Group();
    for (let k = 0; k < 6; k++) {
      const frond = new Mesh(new ConeGeometry(0.16, 1.1, 4), FERN);
      const fa = (k / 6) * Math.PI * 2;
      frond.position.set(Math.cos(fa) * 0.35, 0.25, Math.sin(fa) * 0.35);
      frond.rotation.set(Math.sin(fa) * 1.25, 0, -Math.cos(fa) * 1.25);
      fern.add(frond);
    }
    fern.position.set(x, ctx.groundAt(x, z), z);
    fern.scale.setScalar(rand(0.7, 1.3));
    g.add(fern);
  }
  // Bruma que deriva entre los árboles.
  const mist = steam(14, { radius: 12, rise: 3.5, size: 7, color: 0xffffff, opacity: 0.16, speed: 0.08, drift: 1.5, y: 1.5 });
  g.add(mist.group);
  ctx.tickers.push(mist.tick);
  return g;
}

// ---- El Morro de Tumaco ----------------------------------------------------
// Peñón con arco natural metido en el mar, puente de madera desde la playa,
// palmeras, lanchas varadas y un kiosco de playa.
function buildMorro(ctx) {
  const g = new Group();
  const sea = ctx.waterAt(0, -12) ?? -0.45;
  // Masa rocosa principal (varios peñascos apilados) y pilares del arco.
  const rock = new Group();
  const pieces = [
    [0, 0.5, -11, 4.6, 0.7], [-3.6, 0.5, -9.5, 3.2, 0.9], [3.6, 0.6, -9.2, 3.1, 0.9], [0, 3.6, -11.5, 3.4, 0.6],
    [-2.2, 4.8, -12, 2.4, 0.6], [2.4, 4.6, -12.3, 2.2, 0.6], [0, 6.2, -12, 2.2, 0.5], [-5.5, 0.2, -12.5, 2.4, 0.7], [5.6, 0.2, -12.8, 2.6, 0.7],
  ];
  for (const [x, y, z, s, sy] of pieces) rock.add(boulder(s, Math.random() < 0.5 ? MATS.rock : MATS.rockDark, { x, y: sea + y, z, sy }));
  // Arco: dos pilares y un arco de toro.
  for (const x of [-3.1, 3.1]) {
    for (let i = 0; i < 4; i++) rock.add(boulder(1.6 - i * 0.12, MATS.rockDark, { x: x + rand(-0.2, 0.2), y: sea - 0.4 + i * 1.35, z: -6.6 + rand(-0.2, 0.2), sy: 0.9 }));
  }
  const arch = new Mesh(new TorusGeometry(3.1, 1.25, 10, 24, Math.PI), MATS.rock);
  arch.position.set(0, sea + 5.2, -6.6);
  arch.castShadow = true;
  rock.add(arch);
  rock.add(boulder(1.8, MATS.rock, { x: 0, y: sea + 6.4, z: -6.7, sy: 0.7 }));
  // Vegetación sobre la roca.
  for (const [x, y, z, r] of [[0, 7.4, -12, 1.5], [-2, 6.3, -12.6, 1.1], [2.4, 6.1, -12.8, 1]]) {
    const bush = new Mesh(new SphereGeometry(r, 9, 7), BUSH);
    bush.scale.y = 0.6;
    bush.position.set(x, sea + y, z);
    bush.castShadow = true;
    rock.add(bush);
  }
  rock.add(palm(3.8, { x: -1.2, y: sea + 7.2, z: -11.6, lean: 0.25 }), palm(3.2, { x: 2, y: sea + 6.9, z: -12.4, lean: -0.2 }));
  g.add(rock);
  ctx.colliders.push({ x: 0, z: -11, r: 7 }, { x: -3.1, z: -6.6, r: 2.2 }, { x: 3.1, z: -6.6, r: 2.2 });
  // Puente de madera playa → roca.
  const bridge = new Group();
  bridge.add(slab(2.2, 0.14, 9, MATS.wood, 0, 1.2, -1.5));
  for (const z of [1.5, -0.5, -2.5, -4.5]) for (const x of [-0.95, 0.95]) bridge.add(drum(0.09, 3, MATS.woodDark, 6, x, 0, z));
  for (const x of [-1.05, 1.05]) {
    const rail = balustrade(9, MATS.woodDark, { height: 0.95, spacing: 1, thick: 0.07 });
    rail.rotation.y = Math.PI / 2;
    rail.position.set(x, 1.27, -1.5);
    bridge.add(rail);
  }
  const ramp = stairs(2.4, 5, 0.24, 0.4, MATS.wood);
  ramp.rotation.y = Math.PI;
  ramp.position.set(0, ctx.groundAt(0, 3.2), 3.2);
  bridge.add(ramp);
  g.add(bridge);
  ctx.colliders.push({ x: 0, z: 1.5, r: 1.6 });
  // Playa: palmeras, lanchas varadas y kiosco de ceviche.
  for (const [x, z] of [[-8, 4], [-11, 9], [9, 6], [12, 11], [-4, 11], [5, 13], [-13, 2], [14, 3]]) {
    g.add(palm(rand(4.5, 6.5), { x, y: ctx.groundAt(x, z), z, lean: rand(-0.2, 0.2) }));
    ctx.colliders.push({ x, z, r: 0.5 });
  }
  g.add(boat(3.6, { color: 0xe0b24a, roof: false, x: -8.5, y: ctx.groundAt(-8.5, 1.5) + 0.1, z: 1.5, rotY: 1.2 }));
  g.add(boat(3.2, { color: 0x2f9fd0, roof: false, x: 8.5, y: ctx.groundAt(8.5, 1) + 0.1, z: 1, rotY: -1.4 }));
  ctx.colliders.push({ x: -8.5, z: 1.5, r: 1.5 }, { x: 8.5, z: 1, r: 1.4 });
  const kiosk = new Group();
  for (const [px, pz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) kiosk.add(drum(0.09, 2.6, MATS.woodDark, 6, px, 1.3, pz));
  kiosk.add(slab(3.6, 0.9, 1, MATS.wood, 0, 0.95, -0.6));
  const kroof = hipRoof(3.8, 3, 1.3, stdMat(0xd94a3a, { roughness: 0.9 }), { y: 2.6 });
  kiosk.add(kroof);
  kiosk.add(signBoard('Ceviche', { width: 1.8, height: 0.5, y: 0.6, z: 1.3, bg: '#f2c94c', fg: '#0c2439' }));
  kiosk.position.set(9, ctx.groundAt(9, 9), 9);
  kiosk.rotation.y = -0.5;
  g.add(kiosk);
  ctx.colliders.push({ x: 9, z: 9, r: 2.2 });
  g.add(signBoard('El Morro · Tumaco', { x: -6, y: ctx.groundAt(-6, 12), z: 12 }));
  ctx.colliders.push({ x: -6, z: 12, r: 0.6 });
  return g;
}

// ---- Volcán Chiles ---------------------------------------------------------
// Cumbre con cráter y manchas de nieve, páramo de frailejones, pozas termales
// humeantes en la ladera y el hito de la frontera Colombia–Ecuador.
function buildChiles(ctx) {
  const g = new Group();
  g.add(terrainSkin(ctx, 9.5, MATS.snow, { lift: 0.28, wobble: 0.65, seed: 41, rings: 8, spokes: 36 }));
  for (const [cx, cz, r] of [[-8, 10, 3.2], [10, -8, 2.8], [4, 12, 2.4]]) g.add(terrainSkin(ctx, r, MATS.snow, { lift: 0.22, wobble: 0.6, seed: 43 + cx, cx, cz, rings: 4, spokes: 18 }));
  g.add(craterRim(ctx, 5, { count: 20, size: 1.2 }));
  g.add(drum(4, 0.3, ASH, 20, 0, 0, 0));
  const fum = steam(7, { radius: 1, rise: 6, size: 2, color: 0xeeeeee, opacity: 0.28, speed: 0.3, y: 0.3 });
  g.add(fum.group);
  ctx.tickers.push(fum.tick);
  // Páramo de frailejones (ladera media).
  for (let i = 0; i < 46; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(9, 26);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.abs(x) < 3.5 && z > 6) continue; // deja libre el sendero
    g.add(frailejon(rand(1.1, 2.2), { x, y: ctx.groundAt(x, z), z }));
  }
  // Pozas termales.
  for (const [px, pz, color] of [[13, 14, 0x7fd0c8], [16.5, 10, 0x9ad7b8]]) {
    const y = ctx.groundAt(px, pz);
    const ring = new Mesh(new TorusGeometry(2.1, 0.45, 8, 20), MATS.rock);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px, y + 0.3, pz);
    ring.castShadow = true;
    g.add(ring);
    g.add(waterDisc(2, { color, opacity: 0.85, x: px, y: y + 0.42, z: pz, normalScale: 0.2 }));
    const vap = steam(8, { radius: 1.2, rise: 3.2, size: 2.2, color: 0xffffff, opacity: 0.3, speed: 0.4, x: px, y: y + 0.5, z: pz });
    g.add(vap.group);
    ctx.tickers.push(vap.tick);
    ctx.colliders.push({ x: px, z: pz, r: 2.6 });
  }
  g.add(signBoard('Aguas termales', { width: 2.4, height: 0.6, x: 10.5, y: ctx.groundAt(10.5, 16.5), z: 16.5, rotY: -0.4 }));
  // Hito fronterizo.
  const hito = new Group();
  hito.add(slab(1.2, 0.4, 1.2, MATS.stoneWarm, 0, 0.2, 0), slab(0.8, 2.6, 0.8, MATS.plaster, 0, 1.7, 0), spire(0.62, 0.7, MATS.plaster, 4, 0, 3, 0));
  hito.add(slab(0.5, 0.5, 0.05, stdMat(0xf2c94c, { roughness: 0.6 }), 0, 2.2, 0.41), slab(0.5, 0.25, 0.05, stdMat(0x1f4fa3, { roughness: 0.6 }), 0, 1.7, 0.41), slab(0.5, 0.25, 0.05, stdMat(0xd42d2d, { roughness: 0.6 }), 0, 1.45, 0.41));
  hito.add(signBoard('COLOMBIA · ECUADOR', { width: 2.6, height: 0.55, x: 0, y: 0, z: -0.9, bg: '#f4f4f4', fg: '#0c2439' }));
  hito.position.set(-9, ctx.groundAt(-9, 9), 9);
  hito.rotation.y = 0.5;
  g.add(hito);
  ctx.colliders.push({ x: -9, z: 9, r: 1 });
  g.add(signBoard('Volcán Chiles · 4.748 m', { x: 4, y: ctx.groundAt(4, 9), z: 9 }));
  ctx.colliders.push({ x: 4, z: 9, r: 0.6 });
  return g;
}

// ---- Sandoná — Paja Toquilla ----------------------------------------------
// Plaza de pueblo colonial: iglesia de piedra gris con dos agujas, casas
// blancas de teja con balcones de madera, mercado de sombreros y el monumento
// al sombrero de paja toquilla.
function buildSandona(ctx) {
  const g = new Group();
  // Iglesia.
  const church = new Group();
  church.add(slab(8, 7, 12, MATS.stone, 0, 3.5, 0));
  church.add(gableRoof(8, 12, 2.6, SLATE, { y: 7, overhang: 0.25, ridge: 'z' }));
  const facade = archedWall(8.2, 8, 0.7, [{ x: 0, w: 2, h: 4, kind: 'pointed' }, { x: -2.6, w: 1, h: 2.6, kind: 'pointed' }, { x: 2.6, w: 1, h: 2.6, kind: 'pointed' }], MATS.stone, { z: 6.1 });
  church.add(facade);
  church.add(roseWindow(0.85, { y: 6, z: 6.5 }));
  church.add(gableRoof(8.2, 0.3, 1.6, MATS.stone, { y: 8, z: 6.1, overhang: 0 }));
  for (const x of [-3.2, 3.2]) {
    church.add(slab(2.4, 12, 2.4, MATS.stone, x, 6, 5.4));
    church.add(spire(1.55, 6.5, SLATE, 8, x, 12, 5.4));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      church.add(windowPane(0.6, 2, { kind: 'pointed', x: x + Math.sin(a) * 1.21, y: 9.2, z: 5.4 + Math.cos(a) * 1.21, rotY: a, frame: MATS.stoneDark }));
    }
  }
  for (const side of [-1, 1]) for (const z of [-3.5, -0.5, 2.5]) church.add(windowPane(0.8, 2.6, { kind: 'pointed', x: side * 4 + (side > 0 ? 0 : -0.06), y: 3, z, rotY: side * Math.PI / 2, frame: MATS.stoneDark }));
  const steps = stairs(9, 3, 0.15, 0.4, MATS.stoneWarm);
  steps.rotation.y = Math.PI;
  steps.position.set(0, 0, 7.6);
  church.add(steps);
  church.position.set(0, 0, -9);
  g.add(church);
  ctx.colliders.push({ x: 0, z: -9, r: 7 });
  // Casas coloniales.
  const colonialHouse = (x, z, rotY, balcony) => {
    const h = new Group();
    h.add(slab(6, 3.4, 4.6, MATS.plaster, 0, 1.7, 0));
    h.add(slab(6.1, 0.9, 4.7, stdMat(0x8a3a2a, { roughness: 0.9 }), 0, 0.45, 0));
    const r = gableRoof(6, 4.6, 1.5, MATS.tile, { y: 3.4, overhang: 0.4 });
    h.add(r);
    h.add(slab(1, 2.2, 0.12, MATS.woodDark, -1.6, 1.1, 2.34));
    for (const wx of [0.4, 1.9]) h.add(windowPane(0.8, 1, { x: wx, y: 1.3, z: 2.31, frame: stdMat(0x1f6f8a, { roughness: 0.7 }) }));
    if (balcony) {
      h.add(slab(3, 0.12, 0.9, MATS.wood, 0.9, 2.55, 2.75));
      h.add(balustrade(3, MATS.woodDark, { height: 0.9, spacing: 0.35, x: 0.9, y: 2.6, z: 3.15, thick: 0.06 }));
      for (const wx of [0.2, 1.7]) h.add(slab(0.7, 1.6, 0.1, MATS.woodDark, wx, 3.45, 2.34));
    }
    h.position.set(x, 0, z);
    h.rotation.y = rotY;
    return h;
  };
  const houses = [[-12, -3, Math.PI / 2, true], [-12, 3.5, Math.PI / 2, false], [12, -3, -Math.PI / 2, false], [12, 3.5, -Math.PI / 2, true], [-8, 11, Math.PI, false], [8, 11, Math.PI, true]];
  for (const [x, z, r, b] of houses) {
    if (Math.abs(x) < 4 && z > 8) continue;
    g.add(colonialHouse(x, z, r, b));
    ctx.colliders.push({ x, z, r: 3.4 });
  }
  // Monumento al sombrero.
  const monument = new Group();
  monument.add(drum(1.6, 0.6, MATS.stoneWarm, 20, 0, 0.3, 0), drum(0.5, 1.6, MATS.stoneWarm, 12, 0, 1.4, 0));
  const straw = stdMat(0xe6d3a3, { roughness: 0.95 });
  monument.add(drum(2.1, 0.14, straw, 28, 0, 2.3, 0), drum(1.05, 0.9, straw, 24, 0, 2.8, 0), drum(1.1, 0.24, stdMat(0x0f7d84, { roughness: 0.6 }), 24, 0, 2.5, 0));
  monument.position.set(0, 0, 1.5);
  g.add(monument);
  ctx.colliders.push({ x: 0, z: 1.5, r: 1.8 });
  // Mercado de sombreros (toldos a rayas y expositores).
  const stall = (x, z, rotY, color) => {
    const s = new Group();
    for (const [px, pz] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) s.add(drum(0.06, 2.3, MATS.woodDark, 6, px, 1.15, pz));
    s.add(slab(2.8, 0.7, 1.2, MATS.wood, 0, 0.85, 0));
    s.add(hipRoof(3, 2, 0.8, stdMat(color, { roughness: 0.9 }), { y: 2.3 }));
    for (let i = 0; i < 4; i++) {
      s.add(drum(0.42, 0.08, straw, 14, -1 + i * 0.66, 1.25, 0), drum(0.22, 0.32, straw, 12, -1 + i * 0.66, 1.42, 0));
    }
    s.position.set(x, 0, z);
    s.rotation.y = rotY;
    return s;
  };
  g.add(stall(-5.5, 5, 0.3, 0xd94a3a), stall(5.5, 5, -0.3, 0x2a5d8a), stall(-6, -1, Math.PI / 2, 0xf2c94c));
  ctx.colliders.push({ x: -5.5, z: 5, r: 1.7 }, { x: 5.5, z: 5, r: 1.7 }, { x: -6, z: -1, r: 1.7 });
  for (const [x, z] of [[-4, -4], [4, -4], [-3, 8], [3, 8]]) g.add(lamppost({ x, y: 0, z, height: 3 }));
  for (const [x, z, r] of [[5, -1, Math.PI / 2], [-3, 4.5, 0], [3, 4.5, 0]]) {
    g.add(bench({ x, y: 0, z, rotY: r }));
    ctx.colliders.push({ x, z, r: 0.8 });
  }
  for (const [x, z] of [[-9, 8], [9, 8]]) {
    g.add(palm(5.5, { x, y: ctx.groundAt(x, z), z }));
    ctx.colliders.push({ x, z, r: 0.5 });
  }
  g.add(signBoard('Sandoná · Paja Toquilla', { x: -5, y: 0, z: 13, rotY: 0 }));
  ctx.colliders.push({ x: -5, z: 13, r: 0.6 });
  return g;
}

function cssOf(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// Mapa nombre de builder (campo `builderFn` en sitesData) → función(ctx)
export const SITE_BUILDERS = {
  buildLajas,
  buildCocha,
  buildGaleras,
  buildCumbal,
  buildAzufral,
  buildCatedral,
  buildPlanada,
  buildMorro,
  buildChiles,
  buildSandona,
};
