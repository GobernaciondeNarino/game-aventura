// Jugador: figura articulada estilo bloques (torso, cabeza, brazos, piernas),
// con física de movimiento/salto (`simulateStep`, pura y estática), animaciones
// de caminar/correr/saltar, capa de tela, sombrero opcional, "brillo neón" para
// el laberinto y cambio de colores (skin) desde la tienda.

import {
    Group,
    Vector3,
    Matrix4,
    Mesh,
    BoxGeometry,
    CylinderGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    CanvasTexture,
    MathUtils,
} from 'three';
import { Cape } from './Cape.js';

const WALK_SPEED = 4;
const SPRINT_SPEED = 9;
// Velocidad angular con la que el personaje se orienta hacia donde camina (rad/s).
const FACE_TURN_SPEED = 11;
const JUMP_VELOCITY = 8;
const GRAVITY = -25;
const AIR_CONTROL = .5;

const NINO_BLUE = 1015172; // 0x0f7d84
const HEAD_COLOR = NINO_BLUE;
const TORSO_COLOR = 16777215; // 0xffffff
const BELT_COLOR = 16777215;
const HAND_COLOR = NINO_BLUE;
const LEG_COLOR = NINO_BLUE;
const UPPER_ARM_COLOR = 16777215;
const FOREARM_COLOR = NINO_BLUE;
const CAPE_COLOR = 16777215;

const CAPE_WIDTH = .62;
const CAPE_ANCHOR_Y = 1.46;
const CAPE_ANCHOR_Z = -.24;
const CAPE_ANCHOR_COUNT = 8;
const CAPE_BODY_RADIUS = .26;
const RIDE_LIFT = .4;

const NEON_COLOR = 61695; // 0x00f0ff
const NEON_EMISSIVE = 58879; // 0x00e5ff
const DEFAULT_HAT_COLOR = 2236962; // 0x222222

export class Player {
    constructor() {
        this.group = new Group();
        this.state = {
            x: 0,
            y: 0,
            z: 0,
            rotationY: 0,
            vy: 0,
            isGrounded: true,
            isMoving: false,
            isSprinting: false,
        };
        this._animTime = 0;
        this._walkPhase = 0;
        this._sprintBlend = 0;
        this._squashAmount = 0;
        this._prevX = 0;
        this._prevZ = 0;
        this.speedMultiplier = 1;
        this.riding = false;
        this.facingOffset = 0;
        this._handMeshes = [];
        this._footMeshes = [];
        this._mazeGlow = false;

        // Anclajes de la capa: fila superior en espacio local del cuerpo y en mundo.
        this._anchorWorld = [];
        for (let i = 0; i < CAPE_ANCHOR_COUNT; i++) this._anchorWorld.push(new Vector3());
        this._anchorLocal = [];
        for (let i = 0; i < CAPE_ANCHOR_COUNT; i++) {
            const x = -CAPE_WIDTH / 2 + CAPE_WIDTH * i / (CAPE_ANCHOR_COUNT - 1);
            this._anchorLocal.push(new Vector3(x, CAPE_ANCHOR_Y, CAPE_ANCHOR_Z));
        }
        this._wind = new Vector3();
        this._bodyWorld = new Matrix4();
        this._hatGroup = null;

        this._buildRig();
        this.cape = new Cape({ width: CAPE_WIDTH, height: 1, color: CAPE_COLOR });
        this.cape.mesh.visible = false;
    }

    setCapeVisible(visible) {
        this.cape.mesh.visible = !!visible;
    }

    _buildRig() {
        const headMat = new MeshStandardMaterial({ color: HEAD_COLOR, roughness: .5, metalness: 0 });
        const torsoMat = new MeshStandardMaterial({ color: TORSO_COLOR, roughness: .45, metalness: .05 });
        const beltMat = new MeshStandardMaterial({ color: BELT_COLOR, roughness: .45, metalness: .05 });
        const handMat = new MeshStandardMaterial({ color: HAND_COLOR, roughness: .5, metalness: 0 });
        const upperArmMat = new MeshStandardMaterial({ color: UPPER_ARM_COLOR, roughness: .45, metalness: .05 });
        const forearmMat = new MeshStandardMaterial({ color: FOREARM_COLOR, roughness: .45, metalness: .05 });
        const legMat = new MeshStandardMaterial({ color: LEG_COLOR, roughness: .45, metalness: .05 });
        this._torsoMat = torsoMat;
        this._legMat = legMat;
        this._headMat = headMat;

        this.body = new Group();
        this.group.add(this.body);

        const torso = new Mesh(new BoxGeometry(.7, .55, .42), torsoMat);
        torso.position.y = 1.175;
        torso.castShadow = true;
        this.body.add(torso);

        const belt = new Mesh(new BoxGeometry(.7, .22, .42), beltMat);
        belt.position.y = .79;
        belt.castShadow = true;
        this.body.add(belt);

        const neck = new Mesh(new CylinderGeometry(.12, .13, .1, 12), headMat);
        neck.position.y = 1.5;
        this.body.add(neck);

        const head = new Mesh(new CylinderGeometry(.27, .27, .48, 24), headMat);
        head.position.y = 1.77;
        head.castShadow = true;
        this.body.add(head);
        this.head = head;

        const topStud = new Mesh(new CylinderGeometry(.13, .13, .09, 16), headMat);
        topStud.position.y = 2.05;
        this.body.add(topStud);

        // Cara pintada sobre un plano fino frente a la cabeza.
        const faceTexture = makeFaceTexture();
        const faceMat = new MeshBasicMaterial({ map: faceTexture, transparent: true, alphaTest: .4 });
        const face = new Mesh(new BoxGeometry(.46, .34, .01), faceMat);
        face.position.set(0, 1.79, .272);
        this.body.add(face);

        this.shoulderL = this._buildArm(upperArmMat, forearmMat, handMat, 1);
        this.shoulderR = this._buildArm(upperArmMat, forearmMat, handMat, -1);
        this.body.add(this.shoulderL);
        this.body.add(this.shoulderR);

        this.hipL = this._buildLeg(legMat, 1);
        this.hipR = this._buildLeg(legMat, -1);
        this.body.add(this.hipL);
        this.body.add(this.hipR);
    }

    // side: 1 izquierda, -1 derecha. Devuelve el pivote del hombro.
    _buildArm(upperArmMat, forearmMat, handMat, side) {
        const shoulder = new Group();
        shoulder.position.set(side * .4, 1.4, 0);

        const upperArm = new Mesh(new CylinderGeometry(.085, .08, .32, 10), upperArmMat);
        upperArm.position.set(side * .04, -.15, 0);
        upperArm.rotation.z = side * -.12;
        upperArm.castShadow = true;
        shoulder.add(upperArm);

        const forearm = new Mesh(new CylinderGeometry(.08, .075, .3, 10), forearmMat);
        forearm.position.set(side * .085, -.4, .12);
        forearm.rotation.set(-.45, 0, side * .05);
        forearm.castShadow = true;
        shoulder.add(forearm);

        const hand = new Mesh(new CylinderGeometry(.075, .075, .11, 14), handMat);
        hand.position.set(side * .085, -.55, .26);
        hand.rotation.x = Math.PI / 2;
        hand.castShadow = true;
        shoulder.add(hand);
        this._handMeshes.push(hand);
        return shoulder;
    }

    // Devuelve el pivote de la cadera; el pie usa un material propio del mismo color.
    _buildLeg(legMat, side) {
        const hip = new Group();
        hip.position.set(side * .175, .68, 0);

        const leg = new Mesh(new BoxGeometry(.32, .68, .4), legMat);
        leg.position.y = -.34;
        leg.castShadow = true;
        hip.add(leg);

        const footMat = new MeshStandardMaterial({
            color: legMat.color.getHex(),
            roughness: .45,
            metalness: .05,
        });
        const foot = new Mesh(new BoxGeometry(.34, .08, .46), footMat);
        foot.position.set(0, -.66, .03);
        foot.castShadow = true;
        hip.add(foot);
        this._footMeshes.push(foot);
        return hip;
    }

    // Manos y pies neón mientras el jugador está dentro del laberinto.
    setMazeGlow(enabled) {
        if (enabled === this._mazeGlow) return;
        this._mazeGlow = enabled;
        if (enabled) {
            if (!this._neonMat) {
                this._neonMat = new MeshStandardMaterial({
                    color: NEON_COLOR,
                    emissive: NEON_EMISSIVE,
                    emissiveIntensity: 1.4,
                    roughness: .3,
                    metalness: 0,
                });
            }
            for (const mesh of this._handMeshes) {
                if (!mesh.userData._origMat) mesh.userData._origMat = mesh.material;
                mesh.material = this._neonMat;
            }
            for (const mesh of this._footMeshes) {
                if (!mesh.userData._origMat) mesh.userData._origMat = mesh.material;
                mesh.material = this._neonMat;
            }
        } else {
            for (const mesh of this._handMeshes) {
                if (mesh.userData._origMat) mesh.material = mesh.userData._origMat;
            }
            for (const mesh of this._footMeshes) {
                if (mesh.userData._origMat) mesh.material = mesh.userData._origMat;
            }
        }
    }

    // Aplica colores/sombrero comprados en la tienda.
    setSkin({ shirt, pants, cape, hat } = {}) {
        if (typeof shirt === 'number') this._torsoMat.color.setHex(shirt);
        if (typeof pants === 'number') {
            this._legMat.color.setHex(pants);
            for (const foot of this._footMeshes) {
                if (foot.userData._origMat) foot.userData._origMat.color.setHex(pants);
                else foot.material.color.setHex(pants);
            }
        }
        if (typeof cape === 'number' && this.cape && this.cape.mesh) {
            this.cape.mesh.material.color.setHex(cape);
        }
        if (hat !== undefined) this._setHat(hat);
    }

    _setHat(hat) {
        if (this._hatGroup) {
            this.body.remove(this._hatGroup);
            this._hatGroup = null;
        }
        if (!hat || hat.type === 'none') return;

        const hatGroup = new Group();
        const hatMat = new MeshStandardMaterial({ color: hat.color || DEFAULT_HAT_COLOR, roughness: .5 });
        if (hat.type === 'straw') {
            const brim = new Mesh(new CylinderGeometry(.42, .42, .05, 18), hatMat);
            brim.position.y = 2.03;
            const crown = new Mesh(new CylinderGeometry(.24, .26, .22, 16), hatMat);
            crown.position.y = 2.16;
            hatGroup.add(brim, crown);
        } else if (hat.type === 'cap') {
            const crown = new Mesh(new BoxGeometry(.56, .18, .5), hatMat);
            crown.position.y = 2.05;
            const visor = new Mesh(new BoxGeometry(.5, .05, .28), hatMat);
            visor.position.set(0, 2, .32);
            hatGroup.add(crown, visor);
        } else if (hat.type === 'beanie') {
            const crown = new Mesh(new CylinderGeometry(.3, .32, .26, 18), hatMat);
            crown.position.y = 2.1;
            const band = new Mesh(new CylinderGeometry(.33, .33, .06, 18), hatMat);
            band.position.y = 1.98;
            hatGroup.add(crown, band);
        } else if (hat.type === 'top') {
            const brim = new Mesh(new CylinderGeometry(.38, .38, .05, 20), hatMat);
            brim.position.y = 2.02;
            const crown = new Mesh(new CylinderGeometry(.24, .24, .42, 18), hatMat);
            crown.position.y = 2.25;
            hatGroup.add(brim, crown);
        }
        this._hatGroup = hatGroup;
        this.body.add(hatGroup);
    }

    /**
     * Paso de física puro: devuelve el nuevo estado sin tocar la escena.
     * `cmd` describe la intención del jugador relativa a la cámara:
     *   moveZ (adelante/atrás −1..1), moveX (lateral −1..1), yaw (orientación de
     *   la cámara), faceYaw (orientación forzada del cuerpo o null), snap
     *   (orientar de inmediato), sprint y jump.
     */
    static simulateStep(state, cmd, dt, speedMultiplier = 1, groundFn = null) {
        const groundHere = groundFn ? groundFn(state.x, state.z) : 0;
        const moveX = clampUnit(cmd.moveX || 0);
        const moveZ = clampUnit(cmd.moveZ || 0);
        const yaw = cmd.yaw != null ? cmd.yaw : state.rotationY;
        const sprint = !!cmd.sprint;
        const jump = !!cmd.jump;

        // Dirección de avance en el mundo (relativa a la cámara).
        const sinY = Math.sin(yaw);
        const cosY = Math.cos(yaw);
        let dirX = sinY * moveZ - cosY * moveX;
        let dirZ = cosY * moveZ + sinY * moveX;
        const length = Math.hypot(dirX, dirZ);
        const moving = length > 1e-3;
        if (length > 1) {
            dirX /= length;
            dirZ /= length;
        }

        // Orientación del cuerpo: hacia donde camina, o la forzada (patear, primera persona).
        let rotationY = state.rotationY;
        const targetYaw = cmd.faceYaw != null ? cmd.faceYaw : moving ? Math.atan2(dirX, dirZ) : null;
        if (targetYaw != null) {
            const delta = wrapAngle(targetYaw - rotationY);
            const maxStep = FACE_TURN_SPEED * dt;
            rotationY += cmd.snap || Math.abs(delta) <= maxStep ? delta : Math.sign(delta) * maxStep;
            rotationY = wrapAngle(rotationY);
        }

        let vy = state.vy;
        let isGrounded = state.isGrounded;
        if (jump && isGrounded) {
            vy = JUMP_VELOCITY;
            isGrounded = false;
        }
        vy += GRAVITY * dt;
        let y = state.y + vy * dt;
        if (y <= groundHere) {
            y = groundHere;
            vy = 0;
            isGrounded = true;
        }

        const speed = (sprint ? SPRINT_SPEED : WALK_SPEED) * speedMultiplier;
        const control = isGrounded ? 1 : AIR_CONTROL;
        const x = state.x + dirX * speed * control * dt;
        const z = state.z + dirZ * speed * control * dt;
        // Seguir el relieve: pegado al suelo al caminar, aterrizar si cae bajo él.
        if (groundFn) {
            const groundThere = groundFn(x, z);
            if (isGrounded) {
                y = groundThere;
            } else if (y < groundThere) {
                y = groundThere;
                vy = 0;
                isGrounded = true;
            }
        }
        return {
            x,
            y,
            z,
            rotationY,
            vy,
            isGrounded,
            isMoving: moving,
            isSprinting: sprint && moving,
        };
    }

    update(dt, cmd, groundFn = null) {
        const wasGrounded = this.state.isGrounded;
        this.state = Player.simulateStep(this.state, cmd, dt, this.speedMultiplier, groundFn);
        const lift = this.riding ? RIDE_LIFT : 0;
        this.group.position.set(this.state.x, this.state.y + lift, this.state.z);
        this.group.rotation.y = this.state.rotationY + this.facingOffset;
        if (!wasGrounded && this.state.isGrounded) this._squashAmount = 1;
        this._updateAnimations(dt);

        // Actualizar anclajes de la capa en espacio mundo.
        this.group.updateMatrixWorld(true);
        this._bodyWorld.copy(this.body.matrixWorld);
        for (let i = 0; i < CAPE_ANCHOR_COUNT; i++) {
            this._anchorWorld[i].copy(this._anchorLocal[i]).applyMatrix4(this._bodyWorld);
        }
        this.cape.update(dt, this._anchorWorld, this._computeWind(dt), {
            x: this.state.x,
            z: this.state.z,
            r: CAPE_BODY_RADIUS,
        });
    }

    /**
     * Aplica un estado recibido por red (avatar remoto): posiciona el rig,
     * anima extremidades y capa sin simular física local.
     */
    applyRemoteState(dt, remote) {
        const wasGrounded = this.state.isGrounded;
        this.state = {
            x: remote.x,
            y: remote.y,
            z: remote.z,
            rotationY: remote.rotationY,
            vy: remote.vy || 0,
            isGrounded: remote.isGrounded !== false,
            isMoving: !!remote.isMoving,
            isSprinting: !!remote.isSprinting,
        };
        this.riding = !!remote.riding;
        this.facingOffset = this.riding ? -Math.PI / 2 : 0;
        const lift = this.riding ? RIDE_LIFT : 0;
        this.group.position.set(this.state.x, this.state.y + lift, this.state.z);
        this.group.rotation.y = this.state.rotationY + this.facingOffset;
        if (!wasGrounded && this.state.isGrounded) this._squashAmount = 1;
        this._updateAnimations(dt);
        this.group.updateMatrixWorld(true);
        this._bodyWorld.copy(this.body.matrixWorld);
        for (let i = 0; i < CAPE_ANCHOR_COUNT; i++) {
            this._anchorWorld[i].copy(this._anchorLocal[i]).applyMatrix4(this._bodyWorld);
        }
        this.cape.update(dt, this._anchorWorld, this._computeWind(dt), {
            x: this.state.x,
            z: this.state.z,
            r: CAPE_BODY_RADIUS,
        });
    }

    // Viento = ráfagas suaves + arrastre por velocidad + empuje vertical al saltar.
    _computeWind(dt) {
        const time = this._animTime;
        const invDt = 1 / Math.max(dt, 1e-4);
        const velX = clamp((this.state.x - this._prevX) * invDt, 10);
        const velZ = clamp((this.state.z - this._prevZ) * invDt, 10);
        this._prevX = this.state.x;
        this._prevZ = this.state.z;
        const gustX = Math.sin(time * 1.3 + .7) * .4 + Math.sin(time * .5) * .2;
        const gustZ = Math.cos(time * 1.1 + 2.1) * .4 + Math.cos(time * .6) * .2;
        const dragX = -velX * 1.2;
        const dragZ = -velZ * 1.2;
        const lift = this.state.vy > 3 ? this.state.vy * 1.2 : 0;
        this._wind.set(gustX + dragX, lift, gustZ + dragZ);
        return this._wind;
    }

    _updateAnimations(dt) {
        this._animTime += dt;
        const time = this._animTime;
        const state = this.state;

        // Montado en la patineta: postura neutra.
        if (this.riding) {
            this.hipL.rotation.x = MathUtils.lerp(this.hipL.rotation.x, 0, .25);
            this.hipR.rotation.x = MathUtils.lerp(this.hipR.rotation.x, 0, .25);
            this.shoulderL.rotation.x = MathUtils.lerp(this.shoulderL.rotation.x, 0, .25);
            this.shoulderR.rotation.x = MathUtils.lerp(this.shoulderR.rotation.x, 0, .25);
            this.body.position.y = MathUtils.lerp(this.body.position.y, 0, .2);
            this.body.rotation.x = MathUtils.lerp(this.body.rotation.x, 0, .2);
            return;
        }

        const sprintTarget = state.isSprinting ? 1 : 0;
        this._sprintBlend = MathUtils.lerp(this._sprintBlend, sprintTarget, .12);
        const sprintBlend = this._sprintBlend;

        // Aplastamiento al aterrizar.
        this._squashAmount = Math.max(0, this._squashAmount - dt * 7);
        const squash = this._squashAmount * .08;
        this.body.scale.set(1 + squash * .5, 1 - squash, 1 + squash * .5);

        if (!state.isGrounded) {
            // En el aire: brazos arriba, piernas ligeramente atrás.
            this.hipL.rotation.x = MathUtils.lerp(this.hipL.rotation.x, -.15, .2);
            this.hipR.rotation.x = MathUtils.lerp(this.hipR.rotation.x, -.15, .2);
            this.shoulderL.rotation.x = MathUtils.lerp(this.shoulderL.rotation.x, -1.2, .2);
            this.shoulderR.rotation.x = MathUtils.lerp(this.shoulderR.rotation.x, -1.2, .2);
            this.body.position.y = MathUtils.lerp(this.body.position.y, 0, .15);
            this.body.rotation.x = MathUtils.lerp(this.body.rotation.x, 0, .15);
        } else if (state.isMoving) {
            // Caminar/correr: balanceo de piernas y brazos, inclinación del torso.
            const legSwing = MathUtils.lerp(MathUtils.degToRad(30), MathUtils.degToRad(60), sprintBlend);
            const cadence = MathUtils.lerp(6, 10.8, sprintBlend);
            const armSwing = MathUtils.lerp(MathUtils.degToRad(25), MathUtils.degToRad(50), sprintBlend);
            this._walkPhase += cadence * dt;
            const phase = Math.sin(this._walkPhase);
            this.hipL.rotation.x = phase * legSwing;
            this.hipR.rotation.x = -phase * legSwing;
            this.shoulderL.rotation.x = -phase * armSwing;
            this.shoulderR.rotation.x = phase * armSwing;
            const lean = MathUtils.lerp(0, MathUtils.degToRad(15), sprintBlend);
            this.body.rotation.x = MathUtils.lerp(this.body.rotation.x, lean, .15);
            this.body.position.y = Math.abs(Math.sin(this._walkPhase)) * .035 * (1 + sprintBlend * .4);
        } else {
            // Reposo: respiración suave.
            this.hipL.rotation.x = MathUtils.lerp(this.hipL.rotation.x, 0, .12);
            this.hipR.rotation.x = MathUtils.lerp(this.hipR.rotation.x, 0, .12);
            const sway = Math.sin(time * 1.5);
            this.shoulderL.rotation.x = sway * MathUtils.degToRad(3);
            this.shoulderR.rotation.x = -sway * MathUtils.degToRad(3);
            this.body.position.y = Math.sin(time * 2) * .035;
            this.body.rotation.x = MathUtils.lerp(this.body.rotation.x, 0, .12);
        }
    }
}

// Textura de la cara: dos ojos con brillo y una sonrisa.
function makeFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(96, 108, 15, 0, Math.PI * 2);
    ctx.arc(160, 108, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(101, 102, 4.5, 0, Math.PI * 2);
    ctx.arc(165, 102, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 150, 40, .16 * Math.PI, .84 * Math.PI);
    ctx.stroke();
    const texture = new CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
}

function clamp(value, limit) {
    return value > limit ? limit : value < -limit ? -limit : value;
}

function clampUnit(value) {
    return value > 1 ? 1 : value < -1 ? -1 : value;
}

// Normaliza un ángulo a (-π, π].
function wrapAngle(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    else if (a <= -Math.PI) a += Math.PI * 2;
    return a;
}
