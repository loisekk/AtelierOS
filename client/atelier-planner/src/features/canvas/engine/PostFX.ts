import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * PostFX — Phase 13 "Cinematic Upgrade" (H1).
 *
 * One EffectComposer pipeline replaces the raw renderer.render() call:
 *   RenderPass → UnrealBloomPass (subtle warm glow) → OutputPass
 * (OutputPass = the modern r150+ pattern: it applies the renderer's
 * tone mapping + sRGB color space at the END of the chain, so the
 * intermediate render targets stay linear-HDR and the bloom math is
 * physically correct.)
 *
 * Only true emissives bloom (threshold 0.82): agent screens, the CEO
 * brain core, pendant bulbs, DAG projectors, new accent lighting.
 * Strength 0.32 = premium soft glow, not sci-fi bloom.
 * Half-resolution bloom mips internally = negligible GPU cost.
 */
export class PostFX {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
      0.32,  // strength — subtle premium glow
      0.65,  // radius — wide soft falloff
      0.82,  // threshold — only true emissives bloom
    );
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass()); // tone mapping + color space (r150+ pattern)
  }

  /** Replace in animate(): composer.render() uses the internally bound camera. */
  public render(): void {
    this.composer.render();
  }

  /** View-switch hook — keep RenderPass in sync with the active camera. */
  public setCamera(camera: THREE.Camera): void {
    (this.composer.passes[0] as RenderPass).camera = camera;
  }

  public resize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  public dispose(): void {
    this.bloom.dispose();
    this.composer.dispose();
  }
}