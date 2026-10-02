import type { Office2DFrame } from '../types';
import { Camera2D } from './Camera2D';
import { paintArchitecture } from './painters/architecture';
import { hitTest } from './hitTest';
import type { HitTarget } from './hitTest';

export interface Office2DRendererOptions {
  onSelect: (id: string | null) => void;
  /** Per-frame live agent positions — straight from the engine. */
  getAgents: () => Office2DFrame['agents'];
  /** Phase 14.5 — hover updates (drives the DOM tooltip via React). `at` is
   *  the pointer position in CSS px inside the canvas, so the caller needs no
   *  second mousemove listener to place the tooltip. */
  onHover: (target: HitTarget, at: { x: number; y: number }) => void;
}

/** Static slice of the frame owned by React — agents + t arrive live
 *  instead (polled/clocked inside the rAF loop, never stored). */
type Office2DStaticFrame = Omit<Office2DFrame, 'agents' | 't'>;

/**
 * Phase 14 — Canvas-2D architectural renderer. Mirrors AtelierEngine's
 * vanilla-class pattern (no R3F, no second scene graph): a self-contained
 * rAF loop that reads live state via callbacks and owns ZERO application
 * state. Destroying/recreating it can never reset the company — it is a
 * projection, not a simulation.
 *
 * 14.5 adds: hit-testing on pointer events (agent > workstation > room
 * priority), hover state (drives the glyph highlight + the DOM tooltip via
 * onHover), and the [Zones] overlay toggle (frame.zonesVisible).
 */
export class Office2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Office2DRendererOptions;
  private cam = new Camera2D();
  private raf = 0;
  private cssW = 0; private cssH = 0;
  private frame: Office2DStaticFrame;

  // pointer state — pan-vs-click discrimination (same feel as the 3D orbit)
  private dragging = false;
  private moved = false;
  private lastX = 0; private lastY = 0;
  private downX = 0; private downY = 0;

  // Phase 14.5 — hover state (updated on pointer move, read by draw)
  private hoveredId: string | null = null;
  private mouseSX = -1; private mouseSY = -1;
  private mouseInside = false;

  constructor(canvas: HTMLCanvasElement, opts: Office2DRendererOptions) {
    this.canvas = canvas;
    this.opts = opts;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Office2DRenderer: 2D context unavailable');
    this.ctx = ctx;
    this.frame = { items: [], selectedId: null, labelsVisible: true, zonesVisible: false, hoveredId: null, brainActive: false };

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** React pushes the latest app state here — cheap update, no re-init. */
  public setFrame(f: Office2DStaticFrame) { this.frame = f; }

  /** [Zones] toggle — visual layer only. */
  public setZonesVisible(v: boolean) { this.frame.zonesVisible = v; }

  public start() { this.raf = requestAnimationFrame(this.loop); }
  public stop() { cancelAnimationFrame(this.raf); }

  public dispose() {
    this.stop();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private loop = () => {
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    // DPR-aware resize check (compare-first: no realloc when idle)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w !== this.cssW || h !== this.cssH) {
      this.cssW = w; this.cssH = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.cam.resize(w, h, true); // keep user pan/zoom on window resize
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Live frame: React state + per-frame agents + renderer clock (t).
    // Animations NEVER depend on React re-renders — the rAF owns time.
    const f: Office2DFrame = {
      ...this.frame,
      hoveredId: this.hoveredId, // renderer-owned (its own hit-test wins)
      agents: this.opts.getAgents(),
      t: performance.now() / 1000,
    };
    paintArchitecture(this.ctx, this.cam, f);
    // 14.3 ✓ furniture symbols — composed inside paintArchitecture
    // 14.4 ✓ live agents + Brain — composed inside paintArchitecture
    // 14.5 ✓ hover highlight (agents painter) + [Zones] overlay (architecture)
  }

  /** Frame for hit-testing: the static slice + last known agents. hitTest
   *  never reads `t`, so it is passed as 0 — no clock work per pointer event. */
  private hitFrame(): Office2DFrame {
    return { ...this.frame, hoveredId: this.hoveredId, agents: this.opts.getAgents(), t: 0 };
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true; this.moved = false;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.downX = e.clientX; this.downY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
    // Grabbing the sheet clears hover — no stale tooltip mid-pan
    this.hoveredId = null;
    this.opts.onHover(null, { x: this.mouseSX, y: this.mouseSY });
  };

  private onPointerMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.mouseSX = e.clientX - r.left;
    this.mouseSY = e.clientY - r.top;
    this.mouseInside = true;

    if (this.dragging) {
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 4) this.moved = true;
      if (this.moved) {
        this.cam.pan(dx, dy);
        return; // panning — no hover during a drag
      }
    }

    // Hit-test for hover (live agents straight from the engine snapshot)
    const hit = hitTest(this.cam, this.hitFrame(), this.mouseSX, this.mouseSY);
    this.hoveredId = hit?.kind === 'agent' ? hit.id : null; // glyph highlight
    this.opts.onHover(hit, { x: this.mouseSX, y: this.mouseSY }); // DOM tooltip
  };

  private onPointerUp = () => {
    this.dragging = false;
    if (this.moved) return; // it was a pan, not a click

    // Click — hit-test and select (agent + workstation route to the SAME hub)
    if (this.mouseInside && this.mouseSX >= 0) {
      const hit = hitTest(this.cam, this.hitFrame(), this.mouseSX, this.mouseSY);
      if (hit?.kind === 'agent') { this.opts.onSelect(hit.id); return; }
      if (hit?.kind === 'workstation') { this.opts.onSelect(hit.id); return; }
    }
    // Empty-plan (or plain room) click — clear the selection, exactly like a
    // 3D empty-floor click.
    this.opts.onSelect(null);
  };

  private onPointerLeave = () => {
    this.mouseInside = false;
    this.mouseSX = -1; this.mouseSY = -1;
    this.hoveredId = null;
    this.opts.onHover(null, { x: -1, y: -1 });
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    this.cam.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0012));
  };
}