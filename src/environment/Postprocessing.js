// Cadena de postprocesado (pmndrs/postprocessing + N8AO):
// oclusión ambiental, antialiasing SMAA, bloom sutil, viñeta y tone mapping
// ACES. En calidad baja se renderiza directo con el tone mapping del renderer.

import { ACESFilmicToneMapping, HalfFloatType, NoToneMapping } from 'three';
import {
  BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect,
  ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

const EXPOSURE = 0.55;

export class PostFX {
  constructor(renderer, scene, camera, quality, width, height) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = Boolean(quality.smaa || quality.bloom || quality.ambientOcclusion);
    renderer.toneMappingExposure = EXPOSURE;

    if (!this.enabled) {
      renderer.toneMapping = ACESFilmicToneMapping;
      return;
    }
    // El tone mapping lo aplica el último pase; el renderer entrega valores lineales.
    renderer.toneMapping = NoToneMapping;

    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
    this.composer.addPass(new RenderPass(scene, camera));

    if (quality.ambientOcclusion) {
      const ao = new N8AOPostPass(scene, camera, width, height);
      ao.configuration.aoRadius = 2.6;
      ao.configuration.distanceFalloff = 1.1;
      ao.configuration.intensity = 2.3;
      ao.configuration.halfRes = true;
      ao.configuration.screenSpaceRadius = false;
      ao.setQualityMode('Medium');
      this.composer.addPass(ao);
      this.ao = ao;
    }

    const effects = [];
    if (quality.smaa) effects.push(new SMAAEffect({ preset: SMAAPreset.HIGH }));
    if (quality.bloom) {
      effects.push(new BloomEffect({
        intensity: 0.38,
        luminanceThreshold: 0.82,
        luminanceSmoothing: 0.25,
        mipmapBlur: true,
        radius: 0.6,
      }));
    }
    effects.push(new VignetteEffect({ offset: 0.32, darkness: 0.4 }));
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    this.composer.addPass(new EffectPass(camera, ...effects));
  }

  render(dt) {
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  setSize(width, height) {
    if (this.composer) this.composer.setSize(width, height, false);
  }
}
