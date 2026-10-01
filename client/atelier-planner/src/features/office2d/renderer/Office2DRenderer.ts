import type { Office2DFrame } from '../types';
import { Camera2D } from './Camera2D';
import { paintArchitecture } from './painters/architecture';

export interface Office2DRendererOptions {
  onSelect: (id: string | null) => void;
  /** Per-frame live agent positions — straight from the engine. */
  getAgents: () => Office2DFrame['agents'];
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

  constructor(canvas: HTMLCanvasElement, opts: Office2DRendererOptions) {
    this.canvas = canvas;
    this.opts = opts;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Office2DRenderer: 2D context unavailable');
    this.ctx = ctx;
    this.frame = { items: [], selectedId: null, labelsVisible: true, brainActive: false };

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** React pushes the latest app state here — cheap update, no re-init. */
  public setFrame(f: Office2DStaticFrame) { this.frame = f; }

  public start() { this.raf = requestAnimationFrame(this.loop); }
  public stop() { cancelAnimationFrame(this.raf); }

  public dispose() {
    this.stop();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
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
      agents: this.opts.getAgents(),
      t: performance.now() / 1000,
    };
    paintArchitecture(this.ctx, this.cam, f);
    // 14.3 ✓ furniture symbols — composed inside paintArchitecture
    // 14.4 ✓ live agents + Brain — composed inside paintArchitecture
    // 14.5: hover/selection overlays + hitTest (employee → room → workstation)
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true; this.moved = false;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.downX = e.clientX; this.downY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
    this.lastX = e.clientX; this.lastY = e.clientY;
    if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 4) this.moved = true;
    if (this.moved) this.cam.pan(dx, dy);
  };

  private onPointerUp = () => {
    this.dragging = false;
    if (this.moved) return; // it was a pan, not a click
    // 14.1: empty-plan click clears selection (mirrors 3D empty-floor click).
    // 14.5 replaces this with full hit-testing: employee → room → workstation.
    this.opts.onSelect(null);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    this.cam.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0012));
  };
}
