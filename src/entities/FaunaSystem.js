// Sistema de fauna: osos de anteojos en el bosque, mariposas, cangrejos en la
// playa, una ballena jorobada que salta en el Pacífico y un águila andina que
// sobrevuela el mapa. Al acercarse a cada especie se "descubre" y se llama a
// onDiscover con sus datos (nombre, puntos, descripción).
import { Group, Mesh, MeshBasicMaterial, DoubleSide, PlaneGeometry, CanvasTexture } from 'three';
import { box, cyl, cone, sphere } from '../world/primitives.js';
import { Wanderer } from './Wanderer.js';

export const FAUNA_DATA = {
  oso: {
    id: 'oso',
    name: 'Oso de anteojos',
    points: 60,
    description: 'Único oso de Sudamérica. Habita los bosques andinos y de niebla de Nariño; las manchas claras alrededor de sus ojos parecen anteojos.',
  },
  mariposa: {
    id: 'mariposa',
    name: 'Mariposas',
    points: 30,
    description: 'Los bosques de niebla nariñenses albergan cientos de especies de mariposas de vivos colores, claves para polinizar la selva.',
  },
  ballena: {
    id: 'ballena',
    name: 'Ballena jorobada',
    points: 80,
    description: 'Cada año las ballenas jorobadas visitan el Pacífico nariñense (Tumaco) para reproducirse, y saltan fuera del agua (breaching).',
  },
  cangrejo: {
    id: 'cangrejo',
    name: 'Cangrejo de playa',
    points: 40,
    description: 'En las playas de Tumaco viven cangrejos que cavan túneles en la arena y se esconden rápidamente al sentir pasos cercanos.',
  },
  aguila: {
    id: 'aguila',
    name: 'Águila andina',
    points: 90,
    description: 'Habita los Andes de Nariño volando sobre páramos y bosques de altura. Caza desde el aire y planea entre las montañas.',
  },
};

export const FOREST_CENTER = { x: -200, z: 0 };
const WHALE_X = 380;
const BUTTERFLY_COLORS = [16740193, 16766282, 6267135, 16736160, 9323693];

// Colores de los modelos
const BEAR_FUR = 4863272;
const BEAR_SNOUT = 7033920;
const BEAR_DARK = 1052688;
const BEAR_CREAM = 15985878;
const BEAR_LEG = 3811872;
const BEAR_PAW = 2826008;
const WHITE = 16777215;
const BLACK = 1710618;
const CRAB_SHELL = 13650223;
const CRAB_CLAW = 12073510;
const WHALE_BODY = 2965072;
const WHALE_BELLY = 11057348;
const WHALE_BUMP = 3821667;
const WHALE_MOUTH = 1054752;
const WHALE_EYE = 657930;
const EAGLE_BODY = 5978656;
const EAGLE_BEAK = 15245344;
const EAGLE_TAIL = 4861724;
const EAGLE_WING_TIP = 15395562;

export class FaunaSystem {
  constructor(scene, { onDiscover, groundFn } = {}) {
    this.onDiscover = onDiscover || (() => {});
    this.groundFn = groundFn || (() => 0);
    this.group = new Group();
    scene.add(this.group);
    this.discovered = new Set();
    this._t = 0;
    this.bears = this._buildBears();
    this.butterflies = this._buildButterflies();
    this.crabs = this._buildCrabs();
    this._buildWhale();
    this._buildEagle();
  }

  // Tres osos de anteojos repartidos en círculo alrededor del bosque.
  _buildBears() {
    const bears = [];
    for (let i = 0; i < 3; i++) {
      const bear = new Group();

      const body = box(1.7, 1, 1.1, BEAR_FUR);
      body.position.y = .95;
      bear.add(body);

      const head = sphere(.5, BEAR_FUR, { seg: 12 });
      head.position.set(0, 1.25, .85);
      bear.add(head);

      const snout = box(.34, .3, .32, BEAR_SNOUT);
      snout.position.set(0, 1.13, 1.2);
      bear.add(snout);

      const nose = sphere(.07, BEAR_DARK, { seg: 6 });
      nose.position.set(0, 1.18, 1.36);
      bear.add(nose);

      // "Anteojos": anillos claros alrededor de los ojos.
      for (const eyeX of [-.2, .2]) {
        const ring = cyl(.17, .17, .04, BEAR_CREAM, { seg: 14 });
        ring.rotation.x = Math.PI / 2;
        ring.position.set(eyeX, 1.36, 1.18);
        bear.add(ring);
        const eye = sphere(.07, BEAR_DARK, { seg: 6 });
        eye.position.set(eyeX, 1.36, 1.22);
        bear.add(eye);
        const glint = sphere(.025, WHITE, { seg: 5 });
        glint.position.set(eyeX + .015, 1.38, 1.24);
        bear.add(glint);
      }

      const chestPatch = sphere(.32, BEAR_CREAM, { seg: 10 });
      chestPatch.scale.set(.7, .45, .25);
      chestPatch.position.set(0, 1.05, .6);
      bear.add(chestPatch);

      for (const earX of [-.32, .32]) {
        const ear = sphere(.14, BEAR_FUR, { seg: 8 });
        ear.position.set(earX, 1.62, .78);
        bear.add(ear);
        const innerEar = sphere(.08, BEAR_SNOUT, { seg: 6 });
        innerEar.scale.z = .4;
        innerEar.position.set(earX, 1.62, .86);
        bear.add(innerEar);
      }

      const tail = sphere(.14, BEAR_FUR, { seg: 8 });
      tail.position.set(0, .95, -.62);
      bear.add(tail);

      // Patas articuladas (pivote en la cadera/hombro).
      const legs = [];
      for (const [legX, legZ] of [
        [-.55, .7],
        [.55, .7],
        [-.55, -.7],
        [.55, -.7],
      ]) {
        const leg = new Group();
        leg.position.set(legX, .6, legZ);
        const upperLeg = cyl(.22, .17, .55, BEAR_LEG, { seg: 10 });
        upperLeg.position.y = -.27;
        leg.add(upperLeg);
        const paw = box(.36, .13, .42, BEAR_PAW);
        paw.position.set(0, -.6, .05);
        leg.add(paw);
        for (const clawX of [-.12, 0, .12]) {
          const claw = sphere(.04, BEAR_CREAM, { seg: 5 });
          claw.position.set(clawX, -.62, .24);
          leg.add(claw);
        }
        bear.add(leg);
        legs.push(leg);
      }

      const angle = i / 3 * Math.PI * 2;
      const x = FOREST_CENTER.x + Math.cos(angle) * 28;
      const z = FOREST_CENTER.z + Math.sin(angle) * 28;
      bear.position.set(x, this.groundFn(x, z), z);
      this.group.add(bear);
      bears.push({
        group: bear,
        legs,
        phase: Math.random() * 10,
        state: {
          x,
          z,
          heading: Math.random() * Math.PI * 2,
          timer: 2 + Math.random() * 3,
        },
      });
    }
    return bears;
  }

  // Ocho mariposas con alas de textura compartida y color propio.
  _buildButterflies() {
    const butterflies = [];
    const wingTexture = makeWingTexture();
    for (let i = 0; i < 8; i++) {
      const butterfly = new Group();
      const color = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length];
      const wingMaterial = new MeshBasicMaterial({
        map: wingTexture,
        color,
        transparent: true,
        alphaTest: .4,
        side: DoubleSide,
      });
      const hingeL = new Group();
      const hingeR = new Group();
      butterfly.add(hingeL);
      butterfly.add(hingeR);

      const wingL = new Mesh(new PlaneGeometry(.32, .28), wingMaterial);
      wingL.rotation.x = -Math.PI / 2;
      wingL.position.set(-.18, 0, 0);
      hingeL.add(wingL);

      const wingR = new Mesh(new PlaneGeometry(.32, .28), wingMaterial);
      wingR.rotation.x = -Math.PI / 2;
      wingR.position.set(.18, 0, 0);
      hingeR.add(wingR);

      const thorax = new Mesh(new PlaneGeometry(.05, .28), new MeshBasicMaterial({ color: BLACK, side: DoubleSide }));
      thorax.rotation.x = -Math.PI / 2;
      butterfly.add(thorax);

      const x = FOREST_CENTER.x + (Math.random() - .5) * 80;
      const z = FOREST_CENTER.z + (Math.random() - .5) * 80;
      butterfly.position.set(x, this.groundFn(x, z) + 2.5, z);
      this.group.add(butterfly);
      butterflies.push({
        group: butterfly,
        hingeL,
        hingeR,
        base: { x, z },
        phase: Math.random() * 10,
        r: 4 + Math.random() * 5,
      });
    }
    return butterflies;
  }

  // Seis cangrejos en la franja de playa.
  _buildCrabs() {
    const crabs = [];
    for (let i = 0; i < 6; i++) {
      const crab = new Group();
      const shell = sphere(.28, CRAB_SHELL, { seg: 8 });
      shell.scale.set(1.3, .6, 1);
      shell.position.y = .2;
      crab.add(shell);
      for (const clawX of [-.35, .35]) {
        const claw = sphere(.13, CRAB_CLAW, { seg: 6 });
        claw.position.set(clawX, .2, .18);
        crab.add(claw);
        const eye = sphere(.05, BEAR_DARK, { seg: 5 });
        eye.position.set(clawX * .4, .36, .12);
        crab.add(eye);
      }
      const x = 222 + Math.random() * 26;
      const z = -170 + Math.random() * 340;
      crab.position.set(x, this.groundFn(x, z), z);
      this.group.add(crab);
      crabs.push({
        group: crab,
        hidden: false,
        hideTimer: 0,
        base: { x, z },
      });
    }
    return crabs;
  }

  // Ballena jorobada oculta bajo el mar; emerge periódicamente.
  _buildWhale() {
    const whale = new Group();

    const body = sphere(2.6, WHALE_BODY, { seg: 22, seg2: 16 });
    body.scale.set(3, 1, 1.1);
    whale.add(body);

    const belly = sphere(2.3, WHALE_BELLY, { seg: 18 });
    belly.scale.set(2.8, .5, .95);
    belly.position.y = -.85;
    whale.add(belly);

    const head = sphere(1.4, WHALE_BODY, { seg: 12 });
    head.scale.set(1, .85, 1);
    head.position.set(5.6, .1, 0);
    whale.add(head);

    // Protuberancias de la cabeza
    for (const [bx, by, bz] of [
      [6.3, .55, .3],
      [6, .5, -.35],
      [6.4, .25, 0],
      [5.8, .7, 0],
    ]) {
      const bump = sphere(.16, WHALE_BUMP, { seg: 6 });
      bump.position.set(bx, by, bz);
      whale.add(bump);
    }

    const mouth = box(2.6, .08, 1.5, WHALE_MOUTH);
    mouth.position.set(5.7, -.45, 0);
    whale.add(mouth);

    for (const side of [-1, 1]) {
      const eye = sphere(.14, WHALE_EYE, { seg: 6 });
      eye.position.set(5.2, .2, side * 1.05);
      whale.add(eye);
    }

    const dorsalFin = box(.5, 1, 1.4, WHALE_BODY);
    dorsalFin.rotation.x = -.25;
    dorsalFin.position.set(-.4, 1.4, 0);
    whale.add(dorsalFin);

    // Aletas pectorales
    for (const side of [-1, 1]) {
      const flipper = box(1, .16, 2.8, WHALE_BODY);
      flipper.rotation.x = side * .25;
      flipper.position.set(2.2, -.3, side * 2.2);
      whale.add(flipper);
    }

    // Cola
    for (const side of [-1, 1]) {
      const fluke = box(1.6, .16, 1.8, WHALE_BODY);
      fluke.rotation.y = side * .3;
      fluke.position.set(-7, .3, side * 1.2);
      whale.add(fluke);
    }

    whale.visible = false;
    this.group.add(whale);
    this.whale = {
      group: whale,
      active: false,
      t: 0,
      dur: 2.8,
      next: 6 + Math.random() * 10,
      z: 0,
    };
  }

  update(dt, player) {
    this._t += dt;
    const playerX = player.state.x;
    const playerZ = player.state.z;
    this._updateBears(dt, playerX, playerZ);
    this._updateButterflies(dt, playerX, playerZ);
    this._updateCrabs(dt, playerX, playerZ);
    this._updateWhale(dt, playerX);
    this._updateEagle(dt, playerX, playerZ);
  }

  _discover(id) {
    if (!this.discovered.has(id)) {
      this.discovered.add(id);
      this.onDiscover(FAUNA_DATA[id]);
    }
  }

  // Los osos deambulan en el bosque con la misma lógica que los NPC errantes.
  _updateBears(dt, playerX, playerZ) {
    for (const bear of this.bears) {
      bear.state = Wanderer.stepWander(bear.state, dt, Math.random, 1.5, 42, FOREST_CENTER.x, FOREST_CENTER.z);
      bear.group.position.set(bear.state.x, this.groundFn(bear.state.x, bear.state.z), bear.state.z);
      bear.group.rotation.y = bear.state.heading;
      bear.phase += dt * 5;
      const swing = Math.sin(bear.phase) * .4;
      bear.legs[0].rotation.x = swing;
      bear.legs[3].rotation.x = swing;
      bear.legs[1].rotation.x = -swing;
      bear.legs[2].rotation.x = -swing;
      if (Math.hypot(bear.state.x - playerX, bear.state.z - playerZ) < 12) this._discover('oso');
    }
  }

  // Las mariposas describen órbitas suaves y baten las alas.
  _updateButterflies(dt, playerX, playerZ) {
    for (const butterfly of this.butterflies) {
      butterfly.phase += dt * 1.2;
      const x = butterfly.base.x + Math.cos(butterfly.phase) * butterfly.r;
      const z = butterfly.base.z + Math.sin(butterfly.phase * 1.3) * butterfly.r;
      const y = this.groundFn(x, z) + 2.2 + Math.sin(butterfly.phase * 2) * .8;
      butterfly.group.position.set(x, y, z);
      const flap = Math.sin(this._t * 22 + butterfly.phase) * .8;
      butterfly.hingeL.rotation.z = -flap;
      butterfly.hingeR.rotation.z = flap;
      if (Math.hypot(x - playerX, z - playerZ) < 7) this._discover('mariposa');
    }
  }

  // Los cangrejos se esconden al acercarse mucho y reaparecen en otro punto.
  _updateCrabs(dt, playerX, playerZ) {
    for (const crab of this.crabs) {
      if (crab.hidden) {
        crab.hideTimer -= dt;
        if (crab.hideTimer <= 0) {
          crab.base.x = 222 + Math.random() * 26;
          crab.base.z = -170 + Math.random() * 340;
          crab.group.position.set(crab.base.x, this.groundFn(crab.base.x, crab.base.z), crab.base.z);
          crab.group.visible = true;
          crab.hidden = false;
        }
        continue;
      }
      const distance = Math.hypot(crab.base.x - playerX, crab.base.z - playerZ);
      if (distance < 6) {
        this._discover('cangrejo');
        if (distance < 4) {
          crab.hidden = true;
          crab.hideTimer = 4 + Math.random() * 3;
          crab.group.visible = false;
        }
      }
    }
  }

  // La ballena emerge en un salto sinusoidal cada cierto tiempo.
  _updateWhale(dt, playerX) {
    const whale = this.whale;
    if (!whale.active) {
      whale.next -= dt;
      if (whale.next <= 0) {
        whale.active = true;
        whale.t = 0;
        whale.z = -120 + Math.random() * 240;
        whale.group.position.set(WHALE_X, -3, whale.z);
        whale.group.visible = true;
      }
      return;
    }
    whale.t += dt;
    const progress = whale.t / whale.dur;
    const lift = Math.sin(Math.min(progress, 1) * Math.PI);
    whale.group.position.y = -3 + lift * 3.5;
    whale.group.rotation.z = (progress - .5) * .5;
    if (playerX > 200) this._discover('ballena');
    if (whale.t >= whale.dur) {
      whale.active = false;
      whale.group.visible = false;
      whale.next = 8 + Math.random() * 14;
    }
  }

  // Águila con alas articuladas que planea en círculo sobre el mapa.
  _buildEagle() {
    const eagle = new Group();

    const body = sphere(.7, EAGLE_BODY, { seg: 12 });
    body.scale.set(1.8, .6, .6);
    eagle.add(body);

    const head = sphere(.4, BEAR_CREAM, { seg: 10 });
    head.position.set(1.3, .1, 0);
    eagle.add(head);

    const beak = cone(.15, .4, EAGLE_BEAK, { seg: 6 });
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(1.7, .05, 0);
    eagle.add(beak);

    const eye = sphere(.06, BEAR_DARK, { seg: 5 });
    eye.position.set(1.4, .18, .2);
    eagle.add(eye);

    const tail = box(.7, .06, .4, EAGLE_TAIL);
    tail.position.set(-1.5, 0, 0);
    eagle.add(tail);

    const wingMaterial = new MeshBasicMaterial({ color: EAGLE_BODY, side: DoubleSide });
    const wingTipMaterial = new MeshBasicMaterial({ color: EAGLE_WING_TIP, side: DoubleSide });
    const wingL = new Group();
    const wingR = new Group();
    eagle.add(wingL);
    eagle.add(wingR);

    const wingPanelL = new Mesh(new PlaneGeometry(2.6, .9), wingMaterial);
    wingPanelL.rotation.x = -Math.PI / 2;
    wingPanelL.position.set(-1.3, 0, 0);
    wingL.add(wingPanelL);

    const wingTipL = new Mesh(new PlaneGeometry(1, .7), wingTipMaterial);
    wingTipL.rotation.x = -Math.PI / 2;
    wingTipL.position.set(-2.3, .01, 0);
    wingL.add(wingTipL);

    const wingPanelR = new Mesh(new PlaneGeometry(2.6, .9), wingMaterial);
    wingPanelR.rotation.x = -Math.PI / 2;
    wingPanelR.position.set(1.3, 0, 0);
    wingR.add(wingPanelR);

    const wingTipR = new Mesh(new PlaneGeometry(1, .7), wingTipMaterial);
    wingTipR.rotation.x = -Math.PI / 2;
    wingTipR.position.set(2.3, .01, 0);
    wingR.add(wingTipR);

    this.group.add(eagle);
    this.eagle = {
      group: eagle,
      wingL,
      wingR,
      angle: Math.random() * Math.PI * 2,
      radius: 240,
      yBase: 40,
    };
  }

  _updateEagle(dt, playerX, playerZ) {
    const eagle = this.eagle;
    eagle.angle += dt * .18;
    const x = Math.cos(eagle.angle) * eagle.radius;
    const z = Math.sin(eagle.angle) * eagle.radius;
    const y = eagle.yBase + Math.sin(eagle.angle * 1.7) * 5;
    eagle.group.position.set(x, y, z);
    eagle.group.rotation.y = -eagle.angle + Math.PI / 2;
    const flap = Math.sin(this._t * 7) * .5;
    eagle.wingL.rotation.z = -flap;
    eagle.wingR.rotation.z = flap;
    if (Math.hypot(x - playerX, z - playerZ) < 90) this._discover('aguila');
  }
}

// Textura de ala de mariposa: dos elipses blancas con borde y un punto oscuro
// en cada una. El color se aplica con el `color` del material.
function makeWingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(72, 42, 50, 30, -.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(60, 92, 38, 27, .15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(72, 42, 50, 30, -.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(60, 92, 38, 27, .15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(80, 42, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(64, 95, 4.5, 0, Math.PI * 2);
  ctx.fill();
  return new CanvasTexture(canvas);
}
