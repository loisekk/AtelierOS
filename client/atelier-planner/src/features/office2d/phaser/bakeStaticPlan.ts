import { BOUNDS } from '../../canvas/architecture/SpatialConfig';
import { paintPremiumPlan } from './premium/paintPremiumPlan';
import type { PlacedItemMeta } from '../../ai-agents/types';

/** ── v2 PREMIUM sheet bake ─────────────────────────────────────────────
 *  paintPremiumPlan renders the complete architectural MODEL (paper stage,
 *  room floors with materials, extruded two-face walls with door swings,
 *  GLB-measured rotunda, two-face furniture symbols with shadows, dressing)
 *  ONCE into an offscreen canvas — then Phaser displays it as a single
 *  world-fixed image. The dressing (title block, north arrow, TRUE 5 m
 *  scale bar) pans/zooms WITH the sheet, so the printed scale always reads
 *  true against the plan.
 *
 *  v2 changes vs the Phase 18 bake:
 *    · paintArchitecture (old canvas painters) → paintPremiumPlan — the
 *      bake no longer depends on the painters at all (they remain the
 *      emergency fallback renderer's engine, untouched).
 *    · Room LABELS are NOT baked anymore — OfficeScene renders them as
 *      floating pills (like the 3D), so the signature drops labelsVisible.
 *      Toggling [Labels] no longer triggers a ~100 ms rebake.
 *    · Fully deterministic: same layout → identical pixels (no dates, no
 *      Math.random — seeded grain/patterns only).
 *
 *  When a real-GLB PlanExtractor lands (probeFloorPlan), planGeometry.ts
 *  swaps its data source and this bake inherits true walls with ZERO
 *  changes here. */

export const PLAN_PPU = 64;    // bake px per world unit (sheet ≤ 4096² GPU max)
export const PLAN_MARGIN = 7;  // sheet margin around BOUNDS (world units)

const w = (BOUNDS.maxX - BOUNDS.minX) + PLAN_MARGIN * 2;
const h = (BOUNDS.maxZ - BOUNDS.minZ) + PLAN_MARGIN * 2;
export const PLAN_WORLD = {
  minX: BOUNDS.minX - PLAN_MARGIN, minZ: BOUNDS.minZ - PLAN_MARGIN,
  w, h, maxX: BOUNDS.maxX + PLAN_MARGIN, maxZ: BOUNDS.maxZ + PLAN_MARGIN,
};

export function bakeStaticPlan(items: PlacedItemMeta[]): HTMLCanvasElement {
  const bw = Math.round(PLAN_WORLD.w * PLAN_PPU);
  const bh = Math.round(PLAN_WORLD.h * PLAN_PPU);
  const c = document.createElement('canvas');
  c.width = bw;
  c.height = bh;
  paintPremiumPlan(c.getContext('2d')!, items, PLAN_PPU, PLAN_WORLD);
  return c;
}
