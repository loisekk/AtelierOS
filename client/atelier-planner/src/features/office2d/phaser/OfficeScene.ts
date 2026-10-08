import Phaser from 'phaser';
import { ROOM_ZONES, BOUNDS, BRAIN_ANCHOR, MEETING_ANCHOR } from '../../canvas/architecture/SpatialConfig';
import { ITEM_CATALOG } from '../../furniture/catalog';
import { P2D } from '../renderer/theme';
import { hitTestWorldPoint } from '../renderer/hitTest';
import type { HitTarget } from '../renderer/hitTest';
import { bakeStaticPlan, PLAN_WORLD } from './bakeStaticPlan';
import { AgentSprite } from './AgentSprite';
import { persist } from './persist';
import type { Agent2D } from '../types';
import type { PlacedItemMeta } from '../../ai-agents/types';

export interface OfficeSceneDeps {
  getAgents: () => Agent2D[];
  onSelect: (id: string | null) => void;
  onHover: (hit: HitTarget | null, at: { x: number; y: number }) => void;
}

/** React-pushed presentation state (the live runtime stays in the engine). */
export interface Office2DAppState {
  items: PlacedItemMeta[];
  selectedId: string | null;
  labelsVisible: boolean;
  zonesVisible: boolean;
  brainActive: boolean;
}

const TAU = Math.PI * 2;
const ROTUNDA_R = 6.1;
const ZOOM_MIN = 3, ZOOM_MAX = 60;

/** Sheet-content signature — exactly what the static bake paints (items
 *  geometry + the [Labels] flag). Agent STATUS is deliberately excluded:
 *  the engine clones `placedItems` on every status change, but a status
 *  never reaches the baked sheet (agents live in the sprite layer), so a
 *  blind ref-comparison would fire a pointless ~100 ms rebake per status
 *  event. Selection/brain/zones are live layers — never in the signature. */
function bakeSigOf(items: PlacedItemMeta[], labelsVisible: boolean): string {
  return (labelsVisible ? 'L1|' : 'L0|') + items.map(i =>
    `${i.id},${i.type},${i.name},${i.role ?? ''},${i.ws ? 1 : 0},` +
    `${i.position.x},${i.position.z},${i.y ?? ''},${i.rotation}`).join(';');
}

export class OfficeScene extends Phaser.Scene {
  private deps: OfficeSceneDeps;
  private state: Office2DAppState = {
    items: [], selectedId: null, labelsVisible: true, zonesVisible: false, brainActive: false,
  };
  private planImage: Phaser.GameObjects.Image | null = null;
  private planKey = '';
  private bakeSeq = 0;
  /** create() finished? setAppState can arrive BEFORE Phaser boots the scene
   *  (the React effect fires right after `new Phaser.Game`) — pre-boot pushes
   *  only store state; create() then bakes from it. */
  private created = false;
  /** Signature of the last actual bake — see bakeSigOf(). */
  private bakeSig = '';
  private zoneFx!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private brainCore!: Phaser.GameObjects.Image;
  private brainGlow!: Phaser.GameObjects.Image;
  private brainDots: Phaser.GameObjects.Image[] = [];
  private sprites = new Map<string, AgentSprite>();
  private panning = false;
  private moved = false;
  private downX = 0; private downY = 0;
  private lastPersist = 0;
  /** Camera size seen last frame — used to keep the world centre fixed when
   *  the RESIZE scale mode settles (e.g. the host div changes width between
   *  scene create() and the first layout pass; scroll is defined relative to
   *  the half-viewport — `scroll = centre − w/2` — so a size change would
   *  otherwise drag the view off-centre). */
  private lastCamW = 0;
  private lastCamH = 0;

  constructor(deps: OfficeSceneDeps) {
    super('office');
    this.deps = deps;
  }

  create(): void {
    this.zoneFx = this.add.graphics().setDepth(2);
    this.fx = this.add.graphics().setDepth(4);
    this.buildBrain();
    this.rebake(false);           // bakes this.state (possibly pre-filled by setAppState)
    this.created = true;

    const cam = this.cameras.main;
    cam.setBackgroundColor(P2D.paper);
    // NO setBounds: when the fit view is wider than the plan (always true at
    // fit zoom — the sheet has margins), Phaser clamps scroll to bounds.minX
    // and pins the sheet to the TOP-LEFT instead of centering it, and it
    // would equally corrupt a persisted restore at low zoom. The 14.5 canvas
    // baseline camera is free/unbounded — parity means no bounds here too.
    if (persist.zoom > 0) {
      cam.zoom = Phaser.Math.Clamp(persist.zoom, ZOOM_MIN, ZOOM_MAX);
      cam.centerOn(persist.x, persist.z);
    } else {
      this.fitCamera();
    }
    this.lastCamW = cam.width;
    this.lastCamH = cam.height;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.panning = true; this.moved = false;
      this.downX = p.x; this.downY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.panning) {
        if (Math.abs(p.x - this.downX) + Math.abs(p.y - this.downY) > 4) this.moved = true;
        if (this.moved) {
          cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
          cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
          this.deps.onHover(null, { x: -1, y: -1 }); // no tooltip mid-pan
          return;
        }
      }
      const hit = hitTestWorldPoint(this.frameForHit(), ...this.pointerWorld(p));
      this.deps.onHover(hit, { x: p.x, y: p.y });
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const wasPan = this.panning && this.moved;
      this.panning = false;
      if (wasPan) return;
      const hit = hitTestWorldPoint(this.frameForHit(), ...this.pointerWorld(p));
      if (hit?.kind === 'agent' || hit?.kind === 'workstation') this.deps.onSelect(hit.id);
      else this.deps.onSelect(null); // empty-plan click clears — mirrors 3D
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      // World point under the cursor BEFORE the zoom changes.
      const wp = cam.getWorldPoint(p.x, p.y);
      cam.zoom = Phaser.Math.Clamp(cam.zoom * Math.exp(-dy * 0.0012), ZOOM_MIN, ZOOM_MAX);
      // Phaser ≥3.90 scroll semantics: `preRender` computes
      //   midPoint (= world centre) = scroll + halfViewport  and
      //   world = scroll + w/2 + (screen - w/2) / zoom
      // so scroll is a world centre with a FIXED pixel half-size offset — the
      // classic `wp - cursor/zoom` form (pre-3.90) would throw the view off the
      // plan by (w/2 - w/(2·zoom)) world units on every wheel tick. Invert the
      // actual identity instead:  scroll = world - w/2 - (cursor - w/2)/zoom.
      cam.scrollX = wp.x - cam.width / 2 - (p.x - cam.width / 2) / cam.zoom;
      cam.scrollY = wp.y - cam.height / 2 - (p.y - cam.height / 2) / cam.zoom;
    });

    this.events.once('shutdown', () => this.persistCamera());
    this.drawZones(); // apply a zones toggle that arrived pre-boot

    // Dev-only inspection hook (stripped from prod builds) — lets automated
    // verification read the camera/pointer/hit state without a rebuild.
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__office2d = this;
    }
  }

  /** React pushes presentation state — cheap, no re-init. Safe to call at
   *  ANY time: pre-create calls only store the state (create() bakes it);
   *  post-create the sheet rebakes only when its own content changed. */
  public setAppState(next: Office2DAppState): void {
    const sig = bakeSigOf(next.items, next.labelsVisible);
    this.state = next;
    if (!this.created) return; // create() bakes the stored state on boot
    if (sig !== this.bakeSig) this.rebake(true); // items geometry / labels changed
    this.drawZones(); // toggle-only redraw — never per frame
  }

  // ── static sheet ─────────────────────────────────────────────────────
  private rebake(replace: boolean): void {
    const canvas = bakeStaticPlan(this.state.items, this.state.labelsVisible);
    this.bakeSig = bakeSigOf(this.state.items, this.state.labelsVisible);
    const key = `office-plan-${++this.bakeSeq}`;
    this.textures.addCanvas(key, canvas);
    if (this.planImage && replace) {
      const old = this.planKey;
      this.planImage.setTexture(key).setDisplaySize(PLAN_WORLD.w, PLAN_WORLD.h);
      if (old && this.textures.exists(old)) this.textures.remove(old);
    } else if (this.planImage) {
      this.planImage.setTexture(key).setDisplaySize(PLAN_WORLD.w, PLAN_WORLD.h);
    } else {
      this.planImage = this.add.image(0, 0, key)
        .setDisplaySize(PLAN_WORLD.w, PLAN_WORLD.h).setDepth(1);
    }
    this.planKey = key;
  }

  // ── brain (dynamic — matches the 14.4 painter math exactly) ───────────
  private buildBrain(): void {
    const mk = (size: number, draw: (ctx: CanvasRenderingContext2D) => void): string => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      draw(c.getContext('2d')!);
      const key = `brain-${size}-${this.bakeSeq}`;
      this.textures.addCanvas(key, c);
      return key;
    };
    const glowKey = mk(256, ctx => {
      const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
      g.addColorStop(0, 'rgba(167, 95, 255, 0.45)');
      g.addColorStop(1, 'rgba(167, 95, 255, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    });
    const coreKey = mk(96, ctx => {
      ctx.fillStyle = P2D.brainCore;
      ctx.beginPath(); ctx.arc(48, 48, 42, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(241, 231, 216, 0.85)';
      ctx.beginPath(); ctx.arc(48, 48, 18, 0, TAU); ctx.fill();
    });
    const dotKey = mk(16, ctx => {
      ctx.fillStyle = '#C89BFF';
      ctx.beginPath(); ctx.arc(8, 8, 7, 0, TAU); ctx.fill();
    });
    this.brainGlow = this.add.image(BRAIN_ANCHOR.x, BRAIN_ANCHOR.z, glowKey).setDepth(3)
      .setDisplaySize(ROTUNDA_R * 1.24, ROTUNDA_R * 1.24);
    this.brainCore = this.add.image(BRAIN_ANCHOR.x, BRAIN_ANCHOR.z, coreKey).setDepth(4)
      .setDisplaySize(ROTUNDA_R * 0.44, ROTUNDA_R * 0.44);
    for (let i = 0; i < 3; i++) {
      this.brainDots.push(this.add.image(0, 0, dotKey).setDepth(4)
        .setDisplaySize(0.6, 0.6));
    }
  }

  // ── zones overlay (toggle-only redraw — never per frame) ──────────────
  private drawZones(): void {
    const g = this.zoneFx;
    g.clear();
    if (!this.state.zonesVisible) return;
    g.fillStyle(0xF1E7D8, 0.45);
    g.fillRect(BOUNDS.minX, BOUNDS.minZ, BOUNDS.maxX - BOUNDS.minX, BOUNDS.maxZ - BOUNDS.minZ);
    for (const z of ROOM_ZONES) {
      g.fillStyle(0xB96D3D, 0.06);
      g.fillRect(z.minX, z.minZ, z.maxX - z.minX, z.maxZ - z.minZ);
      this.dashRect(g, z.minX, z.minZ, z.maxX - z.minX, z.maxZ - z.minZ, 0.5, 0.35);
    }
  }

  private dashRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
                   dash: number, gap: number): void {
    g.lineStyle(0.03, 0xB96D3D, 1);
    this.dashLine(g, x, y, x + w, y, dash, gap);
    this.dashLine(g, x + w, y, x + w, y + h, dash, gap);
    this.dashLine(g, x + w, y + h, x, y + h, dash, gap);
    this.dashLine(g, x, y + h, x, y, dash, gap);
  }

  private dashLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number,
                   dash: number, gap: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    for (let s = 0; s < len; s += dash + gap) {
      const e = Math.min(s + dash, len);
      g.beginPath();
      g.moveTo(x1 + ux * s, y1 + uy * s);
      g.lineTo(x1 + ux * e, y1 + uy * e);
      g.strokePath();
    }
  }

  // ── per-frame live layer ──────────────────────────────────────────────
  update(time: number): void {
    this.fx.clear(); // live layer redraws every frame; the sheet never does
    const t = time / 1000;
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const agents = this.deps.getAgents();

    // Viewport settled to a new size (Scale.RESIZE): hold the world centre.
    // scroll = centre − halfViewport, so carry the old centre across.
    if (cam.width !== this.lastCamW || cam.height !== this.lastCamH) {
      const cx = cam.scrollX + this.lastCamW / 2;
      const cy = cam.scrollY + this.lastCamH / 2;
      cam.scrollX = cx - cam.width / 2;
      cam.scrollY = cy - cam.height / 2;
      this.lastCamW = cam.width;
      this.lastCamH = cam.height;
    }

    // sync agent sprites (create/destroy/prune)
    const live = new Set(agents.map(a => a.id));
    for (const [id, sp] of this.sprites) {
      if (!live.has(id)) { sp.destroy(); this.sprites.delete(id); }
    }
    for (const a of agents) {
      let sp = this.sprites.get(a.id);
      const ox = sp ? sp.glyph.x : a.x, oz = sp ? sp.glyph.y : a.z;
      if (!sp) { sp = new AgentSprite(this, a); this.sprites.set(a.id, sp); }
      sp.sync(a, zoom, t);

      // motion streak for walkers
      if (!a.seated && Math.hypot(a.x - ox, a.z - oz) > 0.02) {
        this.fx.lineStyle(0.09, 0x49D8EC, 0.35);
        this.fx.beginPath(); this.fx.moveTo(ox, oz); this.fx.lineTo(a.x, a.z); this.fx.strokePath();
      }
    }

    // hover/selection rings on agents (accent dashed — mirrors the 3D ring)
    for (const a of agents) {
      const sel = a.id === this.state.selectedId;
      if (!sel) continue;
      this.fx.lineStyle(0.05, 0xB96D3D, 1);
      for (let i = 0; i < 10; i++) {
        const a0 = (i / 10) * TAU, a1 = a0 + (TAU / 10) * 0.6;
        this.fx.beginPath();
        this.fx.arc(a.x, a.z, 0.52, a0, a1);
        this.fx.strokePath();
      }
    }

    // furniture selection — dashed accent rect, rotation honored
    const selItem = this.state.items.find(i => i.id === this.state.selectedId && !i.role);
    if (selItem) {
      const dim = ITEM_CATALOG[selItem.type]?.dim ?? [0.7, 0.7];
      const cos = Math.cos(-selItem.rotation), sin = Math.sin(-selItem.rotation);
      const pts = [[-dim[0] / 2, -dim[1] / 2], [dim[0] / 2, -dim[1] / 2],
                   [dim[0] / 2, dim[1] / 2], [-dim[0] / 2, dim[1] / 2]]
        .map(([lx, lz]) => [selItem.position.x + lx * cos - lz * sin,
                            selItem.position.z + lx * sin + lz * cos]);
      for (let i = 0; i < 4; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4];
        this.dashLine(this.fx, x1, y1, x2, y2, 0.4, 0.3);
      }
    }

    // meeting halo (§13) — ≥2 gathered at the table
    const meetN = agents.filter(a => Math.hypot(a.x - MEETING_ANCHOR.x, a.z - MEETING_ANCHOR.z) < 2.6).length;
    if (meetN >= 2) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      this.fx.fillStyle(0x7C3AED, 0.10 + 0.06 * pulse);
      this.fx.fillCircle(MEETING_ANCHOR.x, MEETING_ANCHOR.z, 2.3);
      this.fx.lineStyle(0.04, 0x7C3AED, 0.35 + 0.25 * pulse);
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * TAU, a1 = a0 + (TAU / 16) * 0.55;
        this.fx.beginPath();
        this.fx.arc(MEETING_ANCHOR.x, MEETING_ANCHOR.z, 2.3, a0, a1);
        this.fx.strokePath();
      }
    }

    // Brain — idle breath / active neural orbits + dispatch ring (14.4 math)
    const active = this.state.brainActive;
    const breathe = 1 + Math.sin(t * (active ? 4.2 : 1.2)) * (active ? 0.10 : 0.04);
    const base = ROTUNDA_R * 0.44;
    this.brainCore.setDisplaySize(base * breathe, base * breathe);
    this.brainGlow.setAlpha(active ? 0.9 + 0.1 * Math.sin(t * 4.2) : 0.45);
    if (active) {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.7 + (i * TAU) / 3;
        this.brainDots[i].setPosition(
          BRAIN_ANCHOR.x + Math.cos(a) * ROTUNDA_R * 0.40,
          BRAIN_ANCHOR.z + Math.sin(a) * ROTUNDA_R * 0.40,
        ).setVisible(true).setTint(i === 1 ? 0x5FE7F2 : 0xC89BFF);
      }
      const ph = (t * 0.9) % 1;
      this.fx.lineStyle(0.03, 0xA75FFF, 0.5 * (1 - ph));
      this.fx.beginPath();
      this.fx.arc(BRAIN_ANCHOR.x, BRAIN_ANCHOR.z, (base / 2) * breathe + ph * ROTUNDA_R * 0.35, 0, TAU);
      this.fx.strokePath();
    } else {
      this.brainDots.forEach(d => d.setVisible(false));
    }

    if (time - this.lastPersist > 500) this.persistCamera();
  }

  private frameForHit(): { items: PlacedItemMeta[]; agents: Agent2D[] } {
    return { items: this.state.items, agents: this.deps.getAgents() };
  }

  private pointerWorld(p: Phaser.Input.Pointer): [number, number] {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    return [wp.x, wp.y];
  }

  private fitCamera(): void {
    const cam = this.cameras.main;
    cam.zoom = Math.min(cam.width / PLAN_WORLD.w, cam.height / PLAN_WORLD.h) * 0.92;
    cam.centerOn(0, 0);
  }

  private persistCamera(): void {
    const cam = this.cameras.main;
    const mid = cam.getWorldPoint(cam.width / 2, cam.height / 2);
    persist.x = mid.x; persist.z = mid.y; persist.zoom = cam.zoom;
    this.lastPersist = this.time.now;
  }
}