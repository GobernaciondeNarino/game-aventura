// Hojas arrastradas por el viento: partículas instanciadas animadas por
// completo en el vertex shader (caída, deriva, volteo), en un volumen que
// acompaña al jugador. Sin actualizaciones de CPU por partícula.

import {
  BufferAttribute, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  MeshBasicMaterial, Vector2, Vector3,
} from 'three';
import { makeLeafParticleTexture } from './proceduralTextures.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERTEX = /* glsl */ `
attribute vec4 aSeed;
attribute vec4 aSeed2;
uniform sampler2D uHeightMap;
uniform float uMapHalf;
uniform float uTime;
uniform vec3 uPlayerPos;
uniform vec2 uWindDir;
uniform float uRadius;
uniform float uHeight;
varying vec3 vTint;
varying float vAlpha;
vec3 gLeafPos;

mat3 rotationMatrix( vec3 axis, float angle ) {
  axis = normalize( axis );
  float s = sin( angle ); float c = cos( angle ); float oc = 1.0 - c;
  return mat3( oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
               oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
               oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c );
}
`;

const VERTEX_BODY = /* glsl */ `
// Cada hoja vive en una celda del volumen que rodea al jugador; cuando el
// jugador se mueve, la celda "envuelve" (mod) para que el volumen lo acompañe.
float cycle = 9.0 + aSeed.w * 7.0;                 // duración de la caída (s)
float phase = fract( uTime / cycle + aSeed.z );    // 0 arriba → 1 suelo
vec2 cell = ( aSeed.xy - 0.5 ) * 2.0 * uRadius;
vec2 drift = uWindDir * phase * cycle * ( 0.9 + aSeed2.x * 0.8 );
vec2 sway = vec2( sin( uTime * 0.9 + aSeed2.y * 6.28 ), cos( uTime * 0.7 + aSeed2.z * 6.28 ) ) * 0.6;
vec2 rel = mod( cell + drift + sway - uPlayerPos.xz + uRadius, 2.0 * uRadius ) - uRadius;
vec2 worldXZ = uPlayerPos.xz + rel;
vec2 mapUV = worldXZ / ( 2.0 * uMapHalf ) + 0.5;
float ground = texture2D( uHeightMap, mapUV ).r;
float y = ground + 0.15 + ( 1.0 - phase ) * uHeight * ( 0.6 + aSeed2.w * 0.4 );

// volteo/tumbling
float spin = uTime * ( 1.5 + aSeed2.x * 2.5 ) + aSeed.z * 6.28;
mat3 rot = rotationMatrix( normalize( vec3( aSeed2.y - 0.5, 1.0, aSeed2.z - 0.5 ) ), spin ) * rotationMatrix( vec3( 1.0, 0.0, 0.0 ), 1.2 + aSeed2.w );
float size = 0.14 + aSeed.w * 0.12;
vec3 local = rot * ( position * size );
gLeafPos = vec3( worldXZ.x, y, worldXZ.y ) + local;

// desvanecer al borde del volumen y al tocar el suelo
float edge = 1.0 - smoothstep( uRadius * 0.7, uRadius * 0.98, length( rel ) );
float landing = 1.0 - smoothstep( 0.9, 1.0, phase );
vAlpha = edge * landing * smoothstep( 0.0, 0.08, phase );

// paleta: verdes, ocres y rojizos
vec3 green = vec3( 0.35, 0.5, 0.16 );
vec3 ochre = vec3( 0.72, 0.5, 0.16 );
vec3 rust = vec3( 0.58, 0.28, 0.1 );
vTint = mix( mix( green, ochre, smoothstep( 0.25, 0.6, aSeed2.x ) ), rust, smoothstep( 0.75, 1.0, aSeed2.x ) );
`;

export class Leaves {
  /**
   * @param {import('three').Scene} scene
   * @param {{heightTexture, mapHalf:number, count:number}} opts
   */
  constructor(scene, { heightTexture, mapHalf, count = 300 }) {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const seed = new Float32Array(count * 4);
    const seed2 = new Float32Array(count * 4);
    const rand = mulberry32(3151);
    for (let i = 0; i < count * 4; i++) {
      seed[i] = rand();
      seed2[i] = rand();
    }
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    geometry.setAttribute('aSeed2', new InstancedBufferAttribute(seed2, 4));
    geometry.instanceCount = count;

    this.uniforms = {
      uHeightMap: { value: heightTexture },
      uMapHalf: { value: mapHalf },
      uTime: { value: 0 },
      uPlayerPos: { value: new Vector3() },
      uWindDir: { value: new Vector2(0.8, 0.6).normalize() },
      uRadius: { value: 26 },
      uHeight: { value: 11 },
    };
    const uniforms = this.uniforms;
    const material = new MeshBasicMaterial({
      map: makeLeafParticleTexture(),
      transparent: true,
      alphaTest: 0.4,
      side: DoubleSide,
      depthWrite: false,
      fog: true,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      // MeshBasicMaterial solo incluye <beginnormal_vertex> con envMap/skinning,
      // así que todo el cálculo va en <begin_vertex>.
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + VERTEX)
        .replace('#include <begin_vertex>', VERTEX_BODY + '\nvec3 transformed = gLeafPos;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTint;\nvarying float vAlpha;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vTint * 1.6;\ndiffuseColor.a *= vAlpha;');
    };
    material.customProgramCacheKey = () => 'narino-leaves';

    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'leaves';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }

  update(dt, player) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uPlayerPos.value.set(player.x, player.y, player.z);
  }
}
