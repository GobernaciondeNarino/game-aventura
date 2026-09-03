// Entorno básico de la escena: niebla, cúpula de cielo con degradado (shader) y
// suelo de hierba con textura procedural repetida.
import {
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  BackSide,
  Color,
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  CanvasTexture,
  Fog,
} from 'three';

const GROUND_SIZE = 600;
const HORIZON = 14479359;
const SKY_TOP = 4166632;
const GROUND_TINT = 16777215;

// Configura niebla, cielo y suelo en la escena.
export function setupEnvironment(scene) {
  scene.fog = new Fog(HORIZON, 80, 420);
  const sky = buildSkyDome();
  scene.add(sky);
  const ground = buildGround();
  scene.add(ground);
  return { sky, ground };
}

// Cúpula de cielo: esfera vista desde dentro con degradado horizonte → cénit.
export function buildSkyDome() {
  const geometry = new SphereGeometry(700, 32, 16);
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new Color(SKY_TOP) },
      horizonColor: { value: new Color(HORIZON) },
      offset: { value: 30 },
      exponent: { value: .7 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float t = pow(max(h, 0.0), exponent);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }
    `,
  });
  const sky = new Mesh(geometry, material);
  sky.name = 'sky';
  return sky;
}

// Suelo plano con textura de hierba repetida.
export function buildGround() {
  const texture = makeGrassTexture();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(GROUND_SIZE / .5, GROUND_SIZE / .5);
  texture.anisotropy = 16;
  const geometry = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const material = new MeshStandardMaterial({
    color: GROUND_TINT,
    map: texture,
    roughness: .9,
    metalness: 0,
  });
  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  return ground;
}

// Textura de hierba: baldosa verde con un "tetón" circular sombreado (estilo bloque).
export function makeGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8fd884';
  ctx.fillRect(0, 0, 128, 128);
  const centerX = 128 / 2;
  const centerY = 128 / 2;
  const radius = 128 * .28;
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.arc(centerX + 3, centerY + 4, radius, 0, Math.PI * 2);
  ctx.fill();
  const gradient = ctx.createRadialGradient(
    centerX - radius * .3, centerY - radius * .3, radius * .2,
    centerX, centerY, radius,
  );
  gradient.addColorStop(0, '#aee8a3');
  gradient.addColorStop(1, '#79cc6e');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  return new CanvasTexture(canvas);
}
