import Phaser from 'phaser';
import { P2D } from '../renderer/theme';
import { renderBlobAvatar, renderAura, statusColor } from './blobAvatar';
import type { Agent2D } from '../types';

/** World-locked display sizes (world units — Phaser Images default to raw
 *  texture px, which would render a 152 px glyph as 152 world units). Glyph =
 *  the 0.94 u avatar sheet; aura = the 1.9 u ring sheet (0.85 u ring radius,
 *  mirrors the canvas seatedAura). The name pill is screen-space instead —
 *  see sync() for the 1/zoom compensation. */
const GLYPH_WORLD = 0.94;
const AURA_WORLD = 1.9;

/** One employee on the Phaser floor: glyph image (texture re-rendered on
 *  status change — statuses are rare events, positions are per-frame),
 *  seated aura ring (rotating shimmer / pulse / blink), and a name pill
 *  (Phaser Text — crisp at any zoom, gated like the canvas version). */
export class AgentSprite {
  readonly id: string;
  readonly glyph: Phaser.GameObjects.Image;
  readonly pill: Phaser.GameObjects.Text;
  aura: Phaser.GameObjects.Image;
  status: string | null = null;
  /** Explicit field — tsconfig `erasableSyntaxOnly` forbids constructor
   *  parameter properties (`private scene` in the signature). */
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, a: Agent2D) {
    this.scene = scene;
    this.id = a.id;
    this.ensureTexture(a);
    this.glyph = scene.add.image(a.x, a.z, AgentSprite.texKey(a)).setDepth(5)
      .setDisplaySize(GLYPH_WORLD, GLYPH_WORLD);
    this.aura = scene.add.image(a.x, a.z, AgentSprite.auraKey(a)).setDepth(4).setVisible(false)
      .setDisplaySize(AURA_WORLD, AURA_WORLD);
    this.pill = scene.add.text(a.x, a.z, '', {
      fontFamily: 'Archivo, sans-serif', fontSize: '10px', color: P2D.label,
      align: 'center', resolution: 2,
    }).setOrigin(0.5, 0).setDepth(6);
    this.retex(a);
  }

  private static texKey(a: Agent2D): string {
    return `ag:${a.id}:${a.status ?? 'idle'}`;
  }

  /** Aura textures are keyed by status colour (few, shared); glyphs by agent. */
  private static auraKey(a: Agent2D): string {
    return `aura:${statusColor(a)}`;
  }

  private ensureTexture(a: Agent2D): void {
    const key = AgentSprite.texKey(a);
    if (!this.scene.textures.exists(key)) {
      this.scene.textures.addCanvas(key, renderBlobAvatar(a));
    }
  }

  private retex(a: Agent2D): void {
    this.status = a.status ?? 'idle';
    this.ensureTexture(a);
    this.glyph.setTexture(AgentSprite.texKey(a));
    this.pill.setText(`${a.name}\n${this.status.toUpperCase()}`);
    const auraKey = AgentSprite.auraKey(a);
    if (!this.scene.textures.exists(auraKey)) {
      this.scene.textures.addCanvas(auraKey, renderAura(statusColor(a)));
    }
    this.aura.setTexture(auraKey).setVisible(a.seated);
  }

  /** Per-frame sync. World position IS the engine snapshot — no tweening,
   *  no interpolation: the 2D view can never disagree with the 3D truth. */
  sync(a: Agent2D, zoom: number, t: number): void {
    this.glyph.setPosition(a.x, a.z);
    this.aura.setPosition(a.x, a.z);
    // Screen-space pill (mirrors the canvas drawNamePill): constant px size
    // at any zoom via 1/zoom compensation, anchored 0.52 u below the avatar
    // centre (canvas: py = sy + 0.52·k) so it tracks instead of floating.
    this.pill.setPosition(a.x, a.z + 0.52).setScale(1 / zoom);
    this.pill.setVisible(zoom >= 6);
    if ((a.status ?? 'idle') !== this.status) this.retex(a);
    this.aura.setVisible(a.seated);

    // status aura behavior (mirrors the canvas painter's animations)
    if (a.seated) {
      const st = a.status ?? 'idle';
      if (st === 'working') { this.aura.rotation = -t * 1.2; this.aura.setAlpha(0.75); }
      else if (st === 'waiting') { this.aura.setAlpha(0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.2))); }
      else if (st === 'error') { this.aura.setAlpha(Math.sin(t * 7) > 0 ? 0.9 : 0); }
      else { this.aura.setAlpha(0.45); }
    }
  }

  destroy(): void { this.glyph.destroy(); this.aura.destroy(); this.pill.destroy(); }
}