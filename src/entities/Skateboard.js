// Patineta: objeto desbloqueable que el jugador puede montar. Al montarla el
// jugador va más rápido (más aún sobre las vías) y su figura gira -90° para
// ir de lado. Empieza oculta hasta que se desbloquea.
import { Shape, ExtrudeGeometry, Mesh, MeshStandardMaterial, CylinderGeometry, Group } from 'three';

const SPEED_GRASS = 2;
const SPEED_ROAD = 3.4;
const MOUNT_DISTANCE = 1.4;
const FACING_OFFSET = -Math.PI / 2;

const DECK_COLOR = 1118481;
const BORDER_COLOR = 16743209;
const WHEEL_COLOR = 2236962;

// Forma rectangular con esquinas redondeadas, centrada en el origen.
function roundedRectShape(width, height, radius) {
  const halfW = width / 2;
  const halfH = height / 2;
  const shape = new Shape();
  shape.moveTo(-halfW + radius, -halfH);
  shape.lineTo(halfW - radius, -halfH);
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + radius);
  shape.lineTo(halfW, halfH - radius);
  shape.quadraticCurveTo(halfW, halfH, halfW - radius, halfH);
  shape.lineTo(-halfW + radius, halfH);
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - radius);
  shape.lineTo(-halfW, -halfH + radius);
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + radius, -halfH);
  return shape;
}

// Detecta si (x, z) está sobre una vía: rotonda interior, vía circular
// exterior o los ejes viales rectos.
function isOnRoad(x, z) {
  const distance = Math.hypot(x, z);
  return (distance > 17 && distance < 24)
    || (distance > 88 && distance < 96)
    || (Math.abs(z) < 8 && Math.abs(x) > 95 && Math.abs(x) < 210)
    || (Math.abs(x) < 8 && Math.abs(z) > 95 && Math.abs(z) < 210);
}

export class Skateboard {
  constructor(scene, { x = 5, z = -140 } = {}) {
    this.group = new Group();

    // Tabla
    const deckShape = roundedRectShape(.55, 1.7, .18);
    const deckGeometry = new ExtrudeGeometry(deckShape, {
      depth: .12,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: .03,
      bevelThickness: .02,
      steps: 1,
    });
    deckGeometry.translate(0, 0, -.06);
    deckGeometry.rotateX(-Math.PI / 2);
    const deck = new Mesh(deckGeometry, new MeshStandardMaterial({
      color: DECK_COLOR,
      roughness: .5,
      metalness: .3,
    }));
    deck.position.y = .34;
    deck.castShadow = true;
    this.group.add(deck);

    // Borde de color (marco con hueco interior)
    const borderMaterial = new MeshStandardMaterial({ color: BORDER_COLOR, roughness: .45 });
    this._borderMat = borderMaterial;
    const outerShape = roundedRectShape(.59, 1.74, .2);
    const innerShape = roundedRectShape(.49, 1.64, .16);
    outerShape.holes.push(innerShape);
    const borderGeometry = new ExtrudeGeometry(outerShape, {
      depth: .05,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: .012,
      bevelThickness: .012,
      steps: 1,
    });
    borderGeometry.translate(0, 0, -.025);
    borderGeometry.rotateX(-Math.PI / 2);
    const border = new Mesh(borderGeometry, borderMaterial);
    border.position.y = .42;
    this.group.add(border);

    // Ruedas
    for (const wheelX of [-.22, .22]) {
      for (const wheelZ of [-.6, .6]) {
        const wheel = new Mesh(
          new CylinderGeometry(.13, .13, .1, 12),
          new MeshStandardMaterial({ color: WHEEL_COLOR, roughness: .55 }),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wheelX, .15, wheelZ);
        this.group.add(wheel);
      }
    }

    this.group.position.set(x, 0, z);
    this.group.visible = false;
    scene.add(this.group);
    this.spawn = { x, z };
    this.unlocked = false;
    this.mounted = false;
  }

  // Devuelve true solo la primera vez que se desbloquea.
  unlock() {
    if (this.unlocked) return false;
    this.unlocked = true;
    this.group.visible = true;
    return true;
  }

  setBorderColor(hex) {
    if (typeof hex === 'number' && this._borderMat) this._borderMat.color.setHex(hex);
  }

  // `interactPressed`: flanco de la tecla de interacción en este fotograma.
  update(dt, player, interactPressed = false) {
    if (!this.unlocked) return;
    const playerX = player.state.x;
    const playerZ = player.state.z;
    if (this.mounted) {
      this.group.position.set(playerX, 0, playerZ);
      this.group.rotation.y = player.state.rotationY;
      player.facingOffset = FACING_OFFSET;
      player.riding = true;
      player.speedMultiplier = isOnRoad(playerX, playerZ) ? SPEED_ROAD : SPEED_GRASS;
      if (interactPressed) this._dismount(player);
    } else {
      const distance = Math.hypot(playerX - this.group.position.x, playerZ - this.group.position.z);
      if (interactPressed && distance < MOUNT_DISTANCE) {
        this.mounted = true;
        player.speedMultiplier = SPEED_GRASS;
      }
    }
  }

  // Deja la patineta justo delante del jugador.
  _dismount(player) {
    this.mounted = false;
    player.speedMultiplier = 1;
    player.riding = false;
    player.facingOffset = 0;
    const sinY = Math.sin(player.state.rotationY);
    const cosY = Math.cos(player.state.rotationY);
    this.group.position.set(player.state.x + sinY * .8, 0, player.state.z + cosY * .8);
  }
}
