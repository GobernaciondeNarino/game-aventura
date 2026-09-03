// Atmósfera: cielo físico (dispersión de Preetham), sol con sombras que siguen
// al jugador, mapa de entorno para los materiales PBR, niebla aérea y una capa
// de nubes que deriva lentamente.

import {
  DirectionalLight, Fog, HemisphereLight, Mesh, MeshBasicMaterial, Object3D, PMREMGenerator,
  PlaneGeometry, Scene, Vector3, DoubleSide,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { makeCloudTexture } from './proceduralTextures.js';

const SUN_DISTANCE = 190;

export class Atmosphere {
  /**
   * @param {Scene} scene
   * @param {import('three').WebGLRenderer} renderer
   * @param {{ shadowMapSize:number, shadowSpan:number, clouds:boolean }} quality
   */
  constructor(scene, renderer, quality) {
    this.scene = scene;
    this.quality = quality;
    this.time = 0;

    // Dirección hacia el sol (elevación ~40°, luz cálida de mañana desde el suroeste).
    this.sunDirection = new Vector3(-0.45, 0.68, -0.58).normalize();

    this._buildSky(renderer);
    this._buildLights();
    this._buildFog();
    if (quality.clouds) this._buildClouds();
  }

  _buildSky(renderer) {
    const sky = new Sky();
    sky.scale.setScalar(4500);
    const u = sky.material.uniforms;
    u.turbidity.value = 2.6;
    u.rayleigh.value = 1.7;
    u.mieCoefficient.value = 0.0045;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(this.sunDirection);
    this.sky = sky;

    // Mapa de entorno a partir del propio cielo (reflejos/iluminación ambiente PBR).
    // El disco solar es HDR extremo (desborda el half-float y genera NaN al
    // difuminar), así que se hornea el entorno sin él y con menos dispersión Mie.
    const sunDisc = u.showSunDisc || u.sunDisc || null;
    const prevMie = u.mieCoefficient.value;
    if (sunDisc) sunDisc.value = false;
    u.mieCoefficient.value = 0.002;
    const pmrem = new PMREMGenerator(renderer);
    const envScene = new Scene();
    envScene.add(sky);
    const envTarget = pmrem.fromScene(envScene, 0.04);
    envScene.remove(sky);
    pmrem.dispose();
    if (sunDisc) sunDisc.value = true;
    u.mieCoefficient.value = prevMie;
    this.scene.environment = envTarget.texture;
    this.scene.environmentIntensity = 0.35;
    this.scene.add(sky);
  }

  _buildLights() {
    // Luz de cielo (azulada) rebotando en suelo verde-pardo.
    this.hemi = new HemisphereLight(0xbcd3f0, 0x5c6a3a, 0.5);
    this.scene.add(this.hemi);

    const sun = new DirectionalLight(0xfff1dc, 2.3);
    sun.castShadow = true;
    const span = this.quality.shadowSpan;
    sun.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = SUN_DISTANCE + 160;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 2;
    this.sun = sun;
    this.sunTarget = new Object3D();
    sun.target = this.sunTarget;
    this.scene.add(sun, this.sunTarget);

    // Base ortonormal del plano de sombra, para "snapear" el frustum a texeles
    // y evitar el parpadeo de los bordes al mover la cámara.
    const up = Math.abs(this.sunDirection.y) > 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    this._shadowRight = new Vector3().crossVectors(up, this.sunDirection).normalize();
    this._shadowUp = new Vector3().crossVectors(this.sunDirection, this._shadowRight).normalize();
    this._texel = (span * 2) / this.quality.shadowMapSize;
    this._tmp = new Vector3();
  }

  _buildFog() {
    // El color de la niebla se aproxima al horizonte del cielo de Preetham
    // con los parámetros anteriores.
    this.scene.fog = new Fog(0xc4d6e8, 120, 900);
  }

  _buildClouds() {
    const texture = makeCloudTexture(1024, 0.46);
    this.clouds = [];
    const layers = [
      { y: 230, size: 4200, repeat: 3, opacity: 0.92, speed: 0.0022, tint: 0xffffff },
      { y: 330, size: 5200, repeat: 4.5, opacity: 0.55, speed: 0.0014, tint: 0xf4f7fb },
    ];
    for (const layer of layers) {
      const tex = texture.clone();
      tex.repeat.set(layer.repeat, layer.repeat);
      tex.offset.set(Math.random(), Math.random());
      tex.needsUpdate = true;
      const material = new MeshBasicMaterial({
        map: tex,
        color: layer.tint,
        transparent: true,
        opacity: layer.opacity,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      });
      const mesh = new Mesh(new PlaneGeometry(layer.size, layer.size), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = layer.y;
      mesh.renderOrder = -1;
      mesh.frustumCulled = false;
      mesh.userData.speed = layer.speed;
      this.scene.add(mesh);
      this.clouds.push(mesh);
    }
  }

  /**
   * Actualiza sombras (siguen al jugador) y deriva de nubes.
   * @param {number} dt
   * @param {{x:number,y:number,z:number}} focus posición del jugador
   */
  update(dt, focus) {
    this.time += dt;

    // Snap del objetivo de sombra a la rejilla de texeles del mapa de sombras.
    const t = this._tmp.set(focus.x, focus.y, focus.z);
    const r = Math.round(t.dot(this._shadowRight) / this._texel) * this._texel;
    const u = Math.round(t.dot(this._shadowUp) / this._texel) * this._texel;
    const d = t.dot(this.sunDirection);
    this.sunTarget.position.set(0, 0, 0)
      .addScaledVector(this._shadowRight, r)
      .addScaledVector(this._shadowUp, u)
      .addScaledVector(this.sunDirection, d);
    this.sun.position.copy(this.sunTarget.position).addScaledVector(this.sunDirection, SUN_DISTANCE);

    // Nubes: el cielo sigue a la cámara en XZ para que nunca se acabe.
    if (this.clouds) {
      for (const cloud of this.clouds) {
        cloud.position.x = focus.x;
        cloud.position.z = focus.z;
        const tex = cloud.material.map;
        tex.offset.x += dt * cloud.userData.speed;
        tex.offset.y += dt * cloud.userData.speed * 0.35;
        // compensar el desplazamiento de la malla para que las nubes no "viajen" con el jugador
        tex.offset.x -= 0; // (la textura se repite; el arrastre visual es despreciable)
      }
    }
    this.sky.position.set(focus.x, 0, focus.z);
  }
}
