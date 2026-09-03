// Constructores de las maquetas de los diez sitios turísticos de Nariño.
// Cada función devuelve un Group centrado en el origen; SiteManager lo coloca,
// escala y rota según los datos de world/sitesData.js. Algunos grupos exponen
// `userData.tick(dt)` para animarse (humo del Galeras, nube de La Planada).
import { Group } from 'three';
import { box, cyl, cone, sphere, torus, disc, block, PALETTE } from './primitives.js';

// Santuario de Las Lajas: puente sobre pilares y basílica con torres
function buildLajas() {
  const group = new Group();

  const bridge = block(9, 1.2, 6, PALETTE.stoneDark);
  bridge.position.y = .6;
  group.add(bridge);

  for (let i = -1; i <= 1; i++) {
    const pillar = cyl(.5, .6, 3, PALETTE.stoneDark, { seg: 10 });
    pillar.position.set(i * 3, -1.5, 0);
    group.add(pillar);
  }

  const nave = block(5, 5, 4, PALETTE.cream);
  nave.position.y = 3.7;
  group.add(nave);

  const door = box(1.6, 2.6, .4, PALETTE.stone);
  door.position.set(0, 2.5, 2.05);
  group.add(door);

  const mainTower = block(2.2, 4, 2.2, PALETTE.cream);
  mainTower.position.y = 7.6;
  group.add(mainTower);

  const mainSpire = cone(1.6, 3, PALETTE.stone, { seg: 8 });
  mainSpire.position.y = 11.1;
  group.add(mainSpire);

  for (const side of [-1, 1]) {
    const tower = block(1.4, 3, 1.4, PALETTE.cream);
    tower.position.set(side * 2.6, 6.7, 1);
    group.add(tower);
    const spire = cone(1, 2.2, PALETTE.stone, { seg: 8 });
    spire.position.set(side * 2.6, 9.3, 1);
    group.add(spire);
  }

  return group;
}

// Laguna de La Cocha: espejo de agua, isla de La Corota y casitas
function buildCocha() {
  const group = new Group();

  const water = disc(8, PALETTE.waterBlue, { opacity: .9 });
  water.position.y = .06;
  group.add(water);

  const island = sphere(1.8, PALETTE.greenDark, { seg: 16 });
  island.scale.y = .5;
  island.position.set(-1.5, .2, -1);
  group.add(island);

  for (let i = 0; i < 3; i++) {
    const tree = cone(.5, 1.2, PALETTE.green, { seg: 8 });
    tree.position.set(-1.5 + (i - 1) * .7, .9, -1 + i % 2 * .5);
    group.add(tree);
  }

  const houseSpots = [
    [6.8, 0, 4],
    [8, 0, .2],
    [6.4, 0, -4.2],
  ];
  for (const [x, , z] of houseSpots) {
    const house = block(2.8, 2.8, 2.8, PALETTE.white);
    house.position.set(x, 1.4, z);
    group.add(house);
    const roof = cone(2.4, 3.2, PALETTE.redRoof, { seg: 4 });
    roof.rotation.y = Math.PI / 4;
    roof.position.set(x, 4.4, z);
    group.add(roof);
  }

  return group;
}

// Volcán Galeras con columna de humo animada
function buildGaleras() {
  const group = new Group();

  const mountain = cone(6, 9, PALETTE.rockBrown, { seg: 24 });
  mountain.position.y = 4.5;
  group.add(mountain);

  const crater = cyl(1.4, 1.6, 1, 3813158, { seg: 16 });
  crater.position.y = 8.8;
  group.add(crater);

  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const puff = sphere(.8 + Math.random() * .4, PALETTE.smoke, {
      opacity: .5,
      roughness: 1,
      shadow: false,
      seg: 10,
    });
    puff.material = puff.material.clone();
    puff.position.set(0, 9.5 + i * 1.2, 0);
    puff.userData.baseY = 9.5;
    puff.userData.phase = i * 1;
    group.add(puff);
    puffs.push(puff);
  }

  group.userData.tick = (dt) => {
    for (const puff of puffs) {
      puff.userData.phase += dt * .5;
      const t = puff.userData.phase % 4;
      puff.position.y = puff.userData.baseY + t * 1.4;
      puff.position.x = Math.sin(t * 1.5) * .6;
      puff.material.opacity = Math.max(0, .5 * (1 - t / 4));
      const scale = 1 + t * .4;
      puff.scale.set(scale, scale, scale);
    }
  };

  return group;
}

// Volcán Cumbal con cumbre nevada
function buildCumbal() {
  const group = new Group();

  const mountain = cone(6.5, 11, PALETTE.rockGray, { seg: 24 });
  mountain.position.y = 5.5;
  group.add(mountain);

  const snowCap = cone(2.6, 4, PALETTE.snow, { seg: 24, roughness: .5 });
  snowCap.position.y = 9;
  group.add(snowCap);

  for (const side of [-1, 1]) {
    const snowPatch = cone(1.4, 2.4, PALETTE.snow, { seg: 12, roughness: .5 });
    snowPatch.position.set(side * 2.2, 6.5, .5);
    snowPatch.scale.set(.8, 1, .5);
    group.add(snowPatch);
  }

  return group;
}

// Volcán Azufral con laguna verde en el cráter
function buildAzufral() {
  const group = new Group();

  const rim = torus(6, 1.6, PALETTE.rockGray, { radial: 12, tubular: 28 });
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.2;
  group.add(rim);

  const base = cyl(5.2, 6, 2.4, PALETTE.rockBrown, { seg: 28 });
  base.position.y = 1.2;
  group.add(base);

  const lagoon = disc(5.6, 3523690, { opacity: .95 });
  lagoon.position.y = 1;
  group.add(lagoon);

  return group;
}

// Catedral de Ipiales con cúpulas doradas
function buildCatedral() {
  const group = new Group();

  const nave = block(7, 5, 5, PALETTE.cream);
  nave.position.y = 2.5;
  group.add(nave);

  const door = box(2, 3.2, .5, PALETTE.stone);
  door.position.set(0, 1.6, 2.55);
  group.add(door);

  const drum = cyl(1.4, 1.4, 1.2, PALETTE.cream, { seg: 18 });
  drum.position.y = 5.6;
  group.add(drum);

  const dome = sphere(1.5, PALETTE.gold, { seg: 18, metalness: .4, roughness: .4 });
  dome.scale.y = .8;
  dome.position.y = 6.6;
  group.add(dome);

  for (const side of [-1, 1]) {
    const tower = block(1.6, 6.5, 1.6, PALETTE.cream);
    tower.position.set(side * 2.7, 3.25, 1.6);
    group.add(tower);
    const towerTop = block(1.3, 1.2, 1.3, PALETTE.stone);
    towerTop.position.set(side * 2.7, 6.9, 1.6);
    group.add(towerTop);
    const towerDome = sphere(.9, PALETTE.gold, { seg: 14, metalness: .4, roughness: .4 });
    towerDome.scale.y = 1.1;
    towerDome.position.set(side * 2.7, 7.8, 1.6);
    group.add(towerDome);
  }

  return group;
}

// Reserva La Planada: bosque con nube flotante animada
function buildPlanada() {
  const group = new Group();

  const base = cyl(7, 7.5, 1, PALETTE.greenDark, { seg: 20 });
  base.position.y = .5;
  group.add(base);

  const trees = [
    [-3, 0, -2, 4],
    [2, 0, -3, 5],
    [3.5, 0, 1, 3.5],
    [-2, 0, 3, 4.5],
    [0, 0, 0, 6],
    [-4, 0, 1.5, 3],
    [4, 0, -1, 3.8],
    [1, 0, 3.5, 4.2],
  ];
  for (const [x, , z, height] of trees) {
    const trunk = cyl(.25, .3, height * .4, PALETTE.rockBrown, { seg: 8 });
    trunk.position.set(x, 1 + height * .2, z);
    group.add(trunk);
    const crown = cone(1.3, height, PALETTE.green, { seg: 10 });
    crown.position.set(x, 1 + height * .4 + height * .5, z);
    group.add(crown);
  }

  const cloud = sphere(5, PALETTE.white, { opacity: .18, shadow: false, seg: 16 });
  cloud.scale.set(1.4, .4, 1.4);
  cloud.position.y = 4.5;
  group.add(cloud);

  group.userData.tick = (dt) => {
    cloud.position.y = 4.5 + Math.sin(Date.now() * 5e-4) * .3;
  };

  return group;
}

// El Morro de Tumaco: mar, playa, roca y palmeras
function buildMorro() {
  const group = new Group();

  const sea = disc(10, PALETTE.sea, { opacity: .88 });
  sea.position.y = .05;
  group.add(sea);

  const sand = cyl(6, 6.5, .5, PALETTE.sand, { seg: 22 });
  sand.position.y = .25;
  group.add(sand);

  const rockBase = cyl(3.6, 4.2, 2.2, PALETTE.rockGray, { seg: 16 });
  rockBase.position.y = 1.5;
  group.add(rockBase);

  const rockMid = cone(3.2, 3.5, PALETTE.rockBrown, { seg: 16 });
  rockMid.position.y = 3.6;
  group.add(rockMid);

  const rockTop = cone(1.8, 2.6, PALETTE.rockGray, { seg: 14 });
  rockTop.position.y = 5.6;
  group.add(rockTop);

  const topBush = sphere(1.2, PALETTE.greenDark, { seg: 12 });
  topBush.scale.y = .6;
  topBush.position.y = 6.7;
  group.add(topBush);

  for (const [x, z, radius] of [
    [3.5, 2.5, .8],
    [-3.8, 1.5, 1],
    [2.5, -3.2, .7],
  ]) {
    const boulder = sphere(radius, PALETTE.rockGray, { seg: 8 });
    boulder.scale.y = .7;
    boulder.position.set(x, .5, z);
    group.add(boulder);
  }

  const palmSpots = [
    [4.2, 0, 2.8],
    [-4.4, 0, 2],
    [3, 0, -3.6],
  ];
  for (const [x, , z] of palmSpots) {
    const trunk = cyl(.18, .25, 2.4, PALETTE.rockBrown, { seg: 8 });
    trunk.position.set(x, 1.4, z);
    trunk.rotation.z = (x > 0 ? -1 : 1) * .12;
    group.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = cone(.3, 1.4, PALETTE.green, { seg: 6 });
      leaf.position.set(x, 2.6, z);
      leaf.rotation.z = Math.cos(i / 5 * Math.PI * 2) * 1;
      leaf.rotation.x = Math.sin(i / 5 * Math.PI * 2) * 1;
      group.add(leaf);
    }
  }

  return group;
}

// Volcán Chiles con cumbre nevada y cerro lateral
function buildChiles() {
  const group = new Group();

  const base = cyl(7.5, 8, .8, PALETTE.greenDark, { seg: 20 });
  base.position.y = .4;
  group.add(base);

  const mountain = cone(5.5, 10, PALETTE.rockGray, { seg: 24 });
  mountain.position.y = 5;
  group.add(mountain);

  const snowCap = cone(1.8, 2.6, PALETTE.snow, { seg: 16, roughness: .5 });
  snowCap.position.y = 9;
  group.add(snowCap);

  const sideHill = cone(3, 5.5, PALETTE.rockBrown, { seg: 18 });
  sideHill.position.set(4.5, 2.7, 1.5);
  group.add(sideHill);

  return group;
}

// Sandoná: casa con techo a dos aguas y sombrero de paja toquilla
function buildSandona() {
  const group = new Group();

  const house = block(6, 3, 4.5, PALETTE.white, { studs: false });
  house.position.y = 1.5;
  group.add(house);

  const roof = cyl(2.6, 2.6, 6.2, PALETTE.redRoof, { seg: 3 });
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 3.8;
  roof.scale.set(1, 1, .85);
  group.add(roof);

  const door = box(.9, 1.6, .2, PALETTE.rockBrown);
  door.position.set(0, .8, 2.3);
  group.add(door);

  for (const side of [-1, 1]) {
    const window = box(.8, .8, .2, PALETTE.ninoBlue);
    window.position.set(side * 1.8, 1.6, 2.3);
    group.add(window);
  }

  const hatBrim = cyl(2.2, 2.2, .2, PALETTE.sand, { seg: 20 });
  hatBrim.position.set(3.5, 3.3, -2.5);
  group.add(hatBrim);

  const hatCrown = cyl(1.1, 1.2, 1.1, PALETTE.sand, { seg: 18 });
  hatCrown.position.set(3.5, 3.9, -2.5);
  group.add(hatCrown);

  const hatBand = cyl(1.15, 1.25, .3, PALETTE.ninoBlue, { seg: 18 });
  hatBand.position.set(3.5, 3.5, -2.5);
  group.add(hatBand);

  return group;
}

// Mapa nombre de builder (campo `builderFn` en sitesData) → función
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
