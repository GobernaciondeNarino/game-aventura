// Tienda Ñaño: edificio con paredes colisionables, letrero, NPC vendedor con
// burbuja de diálogo, árboles alrededor y camino de acceso. El juego consulta
// isNearNpc() para abrir la interfaz de compra y greet()/farewell() para
// las frases del vendedor.
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three';
import { buildNpcFigure } from '../entities/npcBuilder.js';
import { SpeechBubble } from '../entities/SpeechBubble.js';
import { resolveAABBs } from '../core/collision.js';

export const SHOP_POSITION = { x: 140, z: -130 };

const SHOP_SIZE = 14;
const WALL_HEIGHT = 4.5;
const WALL_THICKNESS = .4;

const GREETINGS = [
  '¡Bienvenido a la tienda Ñaño!',
  '¡Hola viajero! ¿Qué tal Nariño?',
  '¡Buenas! Tenemos cosas lindas hoy.',
  'Pásele, mire lo que hay para usted.',
  '¡Saludos! Lo estaba esperando.',
];

const FAREWELLS = [
  'Hasta luego, ¡siga explorando!',
  'Aquí lo espero. Conozca más lugares.',
  'Vuelva pronto, hay mucho por descubrir.',
  '¡Buen viaje! Nariño es enorme.',
  'Visite otros sitios y regrese ¿oyó?',
];

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class Shop {
  constructor(scene, position = SHOP_POSITION) {
    this.position = position;
    this.group = new Group();
    this.wallAABBs = [];
    this.colliders = [];
    this.npcWorldPos = null;
    this.npc = null;
    this.bubble = null;
    this._buildBuilding();
    this._buildNpc();
    this._buildTrees();
    this._buildAccessRoad();
    this.group.position.set(position.x, 0, position.z);
    scene.add(this.group);
  }

  // Piso, cuatro paredes con zócalo, techo, puerta, ventanas y letrero
  _buildBuilding() {
    const { x: originX, z: originZ } = this.position;
    const half = SHOP_SIZE / 2;

    const floor = new Mesh(
      new BoxGeometry(SHOP_SIZE, .2, SHOP_SIZE),
      new MeshStandardMaterial({ color: 14069882, roughness: .85 }),
    );
    floor.position.y = .1;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallMaterial = new MeshStandardMaterial({ color: 16115400, roughness: .7 });
    const skirtingMaterial = new MeshStandardMaterial({ color: 1725046, roughness: .6 });

    const addWall = (offsetX, offsetZ, width, depth) => {
      const wall = new Mesh(new BoxGeometry(width, WALL_HEIGHT, depth), wallMaterial);
      wall.position.set(offsetX, WALL_HEIGHT / 2 + .2, offsetZ);
      wall.castShadow = true;
      this.group.add(wall);

      const skirting = new Mesh(new BoxGeometry(width * 1.02, .35, depth * 1.02), skirtingMaterial);
      skirting.position.set(offsetX, .375, offsetZ);
      this.group.add(skirting);

      this.wallAABBs.push({
        minX: originX + offsetX - width / 2,
        maxX: originX + offsetX + width / 2,
        minZ: originZ + offsetZ - depth / 2,
        maxZ: originZ + offsetZ + depth / 2,
      });
    };
    addWall(0, +half, SHOP_SIZE, WALL_THICKNESS);
    addWall(0, -half, SHOP_SIZE, WALL_THICKNESS);
    addWall(+half, 0, WALL_THICKNESS, SHOP_SIZE);
    addWall(-half, 0, WALL_THICKNESS, SHOP_SIZE);

    const roof = new Mesh(
      new BoxGeometry(SHOP_SIZE + 1.4, .5, SHOP_SIZE + 1.4),
      new MeshStandardMaterial({ color: 11093034, roughness: .6 }),
    );
    roof.position.y = WALL_HEIGHT + .45;
    roof.castShadow = true;
    this.group.add(roof);

    const door = new Mesh(
      new BoxGeometry(2.6, 3.4, .05),
      new MeshStandardMaterial({ color: 7162945, roughness: .7 }),
    );
    door.position.set(0, 1.9, half + WALL_THICKNESS / 2 + .03);
    this.group.add(door);

    const trimMaterial = new MeshStandardMaterial({ color: 15245344, roughness: .5 });
    for (const [width, height, x, y] of [
      [2.8, .18, 0, 3.7],
      [.18, 3.7, -1.4, 1.85],
      [.18, 3.7, 1.4, 1.85],
    ]) {
      const trim = new Mesh(new BoxGeometry(width, height, .07), trimMaterial);
      trim.position.set(x, y, half + WALL_THICKNESS / 2 + .05);
      this.group.add(trim);
    }

    const glassMaterial = new MeshStandardMaterial({ color: 5227511, roughness: .2, metalness: .4 });
    for (const x of [-4.2, 4.2]) {
      const window = new Mesh(new BoxGeometry(1.8, 1.4, .05), glassMaterial);
      window.position.set(x, 2.6, half + WALL_THICKNESS / 2 + .03);
      this.group.add(window);
    }

    const sign = new Sprite(new SpriteMaterial({ map: makeShopSignTexture(), transparent: true }));
    sign.scale.set(5.6, 1.5, 1);
    sign.position.set(0, WALL_HEIGHT + 1.6, half + .7);
    this.group.add(sign);
  }

  // Vendedor frente a la puerta con burbuja de diálogo
  _buildNpc() {
    const figure = buildNpcFigure({
      torso: 12986408,
      legs: 2236962,
      hat: 'cap',
      hatColor: 16635957,
      head: 15909515,
      coat: false,
    });
    figure.group.position.set(0, 0, SHOP_SIZE / 2 + 3);
    figure.group.rotation.y = 0;
    this.group.add(figure.group);
    this.npc = figure.group;
    this.npcWorldPos = {
      x: this.position.x,
      z: this.position.z + SHOP_SIZE / 2 + 3,
    };
    this.bubble = new SpeechBubble();
    figure.group.add(this.bubble.sprite);
  }

  // Árboles alrededor de la tienda (con colisionador cada uno)
  _buildTrees() {
    const spots = [
      [-12, -10],
      [0, -12],
      [12, -10],
      [-13, -2],
      [13, -2],
      [-13, 4],
      [13, 4],
      [0, 12],
    ];
    // El último punto se reemplaza por dos árboles a los lados del camino
    spots[spots.length - 1] = [-9, 14];
    spots.push([9, 14]);
    for (const [x, z] of spots) {
      const scale = .85 + Math.random() * .4;
      const tree = this._buildTree(scale);
      tree.position.set(x, 0, z);
      this.group.add(tree);
      this.colliders.push({
        x: this.position.x + x,
        z: this.position.z + z,
        r: .6,
      });
    }
  }

  _buildTree(scale = 1) {
    const tree = new Group();
    const trunk = new Mesh(
      new CylinderGeometry(.22 * scale, .28 * scale, 1.4 * scale, 8),
      new MeshStandardMaterial({ color: 7162945, roughness: .85 }),
    );
    trunk.position.y = .7 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new Mesh(
      new ConeGeometry(1.1 * scale, 2 * scale, 8),
      new MeshStandardMaterial({ color: 3046706, roughness: .75 }),
    );
    crown.position.y = 2.4 * scale;
    crown.castShadow = true;
    tree.add(crown);
    return tree;
  }

  // Camino de acceso y plazoleta con bordes dorados frente a la puerta
  _buildAccessRoad() {
    const pavementMaterial = new MeshStandardMaterial({ color: 15724527, roughness: .9 });

    const road = new Mesh(new BoxGeometry(5, .04, 122), pavementMaterial);
    road.position.set(0, .02, 69);
    road.receiveShadow = true;
    this.group.add(road);

    const plaza = new Mesh(new BoxGeometry(11, .05, 7), pavementMaterial);
    plaza.position.set(0, .025, 11);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const edgeMaterial = new MeshStandardMaterial({ color: 15245344, roughness: .6 });
    for (const [width, height, depth, x, z] of [
      [11.4, .06, .2, 0, 14.6],
      [11.4, .06, .2, 0, 7.4],
      [.2, .06, 7.6, -5.7, 11],
      [.2, .06, 7.6, 5.7, 11],
    ]) {
      const edge = new Mesh(new BoxGeometry(width, height, depth), edgeMaterial);
      edge.position.set(x, .06, z);
      this.group.add(edge);
    }
  }

  isNearNpc(x, z, radius = 4) {
    return this.npcWorldPos ? Math.hypot(x - this.npcWorldPos.x, z - this.npcWorldPos.z) < radius : false;
  }

  collide(x, z, radius = .5) {
    return this.wallAABBs.length ? resolveAABBs(this.wallAABBs, x, z, radius) : { x, z };
  }

  greet() {
    if (this.bubble) this.bubble.show(randomOf(GREETINGS), 4);
  }

  farewell() {
    if (this.bubble) this.bubble.show(randomOf(FAREWELLS), 4);
  }

  update(dt) {
    if (this.bubble) this.bubble.update(dt);
  }
}

// Textura del letrero de madera "TIENDA"
function makeShopSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6d4c41';
  roundRect(ctx, 10, 10, 1004, 236, 30);
  ctx.fill();
  ctx.strokeStyle = '#e8a020';
  ctx.lineWidth = 8;
  roundRect(ctx, 24, 24, 976, 208, 24);
  ctx.stroke();
  ctx.fillStyle = '#fff8e6';
  ctx.font = '900 130px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛍️  TIENDA  🛍️', 512, 128);
  return new CanvasTexture(canvas);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
