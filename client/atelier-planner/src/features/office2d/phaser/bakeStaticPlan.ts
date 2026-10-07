import { BOUNDS } from '../../canvas/architecture/SpatialConfig';
import { Camera2D } from '../renderer/Camera2D';
import { paintArchitecture } from '../renderer/painters/architecture';
import type { Office2DFrame } from '../types';
import type { PlacedItemMeta } from '../../ai-agents/types';

/** ── Phase 18 — the STATIC sheet bake ──────────────────────────────────
 *  The existing canvas painters render the complete architectural plan
 *  (paper, drafting grid, grain, drop shadow, room floors, rotunda, ALL
 *  furniture symbols, labels, dressing) ONCE into an offscreen canvas with
 *  agents stripped (agents: []) — then Phaser displays it as a single
 *  world-fixed image. The sheet is a physical drawing on a desk: dressing,
 *  north arrow and the printed 5 m scale bar pan/zoom WITH it — the baked
 *  scale bar always reads TRUE against the plan (it scales with it).
 *
 *  Margin 7 u keeps the baked dressing (title block at sheet px 272,84;
 *  compass/scale at the bottom band) OUTSIDE the building footprint.
 *  When Phase 14.6b's PlanExtractor lands inside the painters, this bake
 *  inherits the real-GLB walls with ZERO changes here. */

export const PLAN_PPU = 64;    // bake px per world unit (sheet ≤ 4096² GPU max)
export const PLAN_MARGIN = 7;  // sheet margin around BOUNDS (world units)

const w = (BOUNDS.maxX - BOUNDS.minX) + PLAN_MARGIN * 2;
const h = (BOUNDS.maxZ - BOUNDS.minZ) + PLAN_MARGIN * 2;
export const PLAN_WORLD = {
  minX: BOUNDS.minX - PLAN_MARGIN, minZ: BOUNDS.minZ - PLAN_MARGIN,
  w, h, maxX: BOUNDS.maxX + PLAN_MARGIN, maxZ: BOUNDS.maxZ + PLAN_MARGIN,
};

export function bakeStaticPlan(items: PlacedItemMeta[], labelsVisible: boolean): HTMLCanvasElement {
  const bw = Math.round(PLAN_WORLD.w * PLAN_PPU);
  const bh = Math.round(PLAN_WORLD.h * PLAN_PPU);
  const c = document.createElement('canvas');
  c.width = bw; c.height = bh;
  const ctx = c.getContext('2d')!;

  const cam = new Camera2D();
  cam.resize(bw, bh, false);          // triggers fit() — values overridden next
  cam.cx = 0; cam.cz = 0; cam.scale = PLAN_PPU; // BOUNDS is symmetric about (0,0)

  const f: Office2DFrame = {
    items, agents: [],               // ← agents/brain/selection/hover = DYNAMIC
    selectedId: null, labelsVisible, zonesVisible: false,
    hoveredId: null, brainActive: false, t: 0,
  };
  paintArchitecture(ctx, cam, f);
  return c;
}