import { ITEM_CATALOG } from '../../../furniture/catalog';
import { P2D, PF2D } from '../theme';
import type { Camera2D } from '../Camera2D';
import type { Office2DFrame } from '../../types';
import type { PlacedItemMeta } from '../../../ai-agents/types';

/** ── Phase 14.3 — furniture vocabulary ─────────────────────────────────────
 *  Every placed item gets a top-down architectural symbol. Symbols are
 *  authored in world units — one canvas transform per item reproduces the
 *  3D placement EXACTLY:
 *
 *      translate(screen x, screen z) · rotate(−rotation.y) · scale(k)
 *
 *  Local frame: +x = world +X (right), +y = world +Z (down the sheet). At
 *  rot 0 a local point (0, 1) lands at world offset (sin θ, cos θ) — the
 *  same direction THREE.rotation.y gives the mesh — so BOTH catalog facing
 *  conventions fall straight out of the transform (layout/coords.ts):
 *  furniture fronts (+Z — desks, sofas, screens, shelves) point +y; chairs
 *  (front −Z) point −y. Footprints come from ITEM_CATALOG[type].dim — the
 *  plan can never disagree with the 3D item it depicts.
 *
 *  LOD: k ≥ 7 draws the full worked symbol; below that a diagram pass
 *  (footprint + signature accent) keeps the 185-item sprawl readable.
 *  Agent bodies (role items) are 14.4's vocabulary and are skipped here.
 *  Light fixtures (pendant / path_light / wall_sconce) paint LAST — they
 *  hang over the furniture they share space with. */

type Sym = (ctx: CanvasRenderingContext2D, k: number, full: boolean) => void;

/** world-unit line width for a px stroke (the per-item scale is k) */
const lw = (k: number, px: number): number => px / k;
const TAU = Math.PI * 2;

/** Rounded-rect path (hand-rolled — ctx.roundRect is not universal). */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

/** Seat + backrest arc — the 'chair' glyph. Front faces −y at a = 0 (the
 *  chair convention, coords.ts), so the backrest arc sweeps the +y half;
 *  rotate by a = item yaw + π to seat it against a table on any side. */
function chairGlyph(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  disc(ctx, 0, 0, 0.21);
  ctx.fillStyle = PF2D.fabric;
  ctx.fill();
  ctx.strokeStyle = P2D.inkSoft;
  ctx.lineWidth = lw(k, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.27, 0.13 * Math.PI, 0.87 * Math.PI);
  ctx.strokeStyle = P2D.ink;
  ctx.lineWidth = lw(k, 1.5);
  ctx.stroke();
  ctx.restore();
}

/** mkPlant(s) projected — pot ring + three leaf cones of the 3D rosette. */
function plantGlyph(ctx: CanvasRenderingContext2D, k: number, s: number): void {
  const leaf = 0.17 * s;
  const cols = [PF2D.leaf, PF2D.leafDeep, PF2D.leaf];
  for (let i = 0; i < 3; i++) {
    disc(ctx, (i - 1) * 0.12 * s, (i - 1) * 0.08 * s, leaf);
    ctx.fillStyle = cols[i];
    ctx.fill();
    ctx.strokeStyle = P2D.inkSoft;
    ctx.lineWidth = lw(k, 0.7);
    ctx.stroke();
  }
  disc(ctx, 0, 0, 0.055 * s);
  ctx.fillStyle = PF2D.woodDark;
  ctx.fill();
  disc(ctx, 0, 0, 0.17 * s); // pot rim over the foliage base
  ctx.strokeStyle = P2D.ink;
  ctx.lineWidth = lw(k, 1.1);
  ctx.stroke();
}

/** One symbol per catalog type — worked top-down drawings keyed to the real
 *  3D construction (see catalog.ts factories for every number below). */
const SYMBOLS: Record<string, Sym> = {
  // 1.82×0.82 white desktop; monitors on the back edge (−0.2), keyboard at
  // +0.1, the sitter's chair at +0.45 (front = +y).
  workstation_set: (ctx, k, full) => {
    rr(ctx, -0.91, -0.41, 1.82, 0.82, 0.05);
    ctx.fillStyle = PF2D.top;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      for (const mx of [-0.35, 0.35]) {
        rr(ctx, mx - 0.3, -0.235, 0.6, 0.07, 0.02);
        ctx.fillStyle = PF2D.screen;
        ctx.fill();
        ctx.fillStyle = PF2D.glow;
        ctx.fillRect(mx - 0.26, -0.225, 0.52, 0.045);
      }
      rr(ctx, -0.25, 0.02, 0.5, 0.15, 0.02); // keyboard
      ctx.fillStyle = PF2D.screen;
      ctx.fill();
      chairGlyph(ctx, k, 0, 0.47, 0);
    } else {
      ctx.fillStyle = PF2D.glow; // diagram pass: one screen band, no sitter
      ctx.fillRect(-0.55, -0.2, 1.1, 0.07);
    }
  },

  // 4.6×1.7 top with 8 chairs (4 north row yawed π, 4 south).
  conference_table: (ctx, k, full) => {
    rr(ctx, -2.3, -0.85, 4.6, 1.7, 0.14);
    ctx.fillStyle = PF2D.wood;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    rr(ctx, -2.14, -0.7, 4.28, 1.4, 0.1);
    ctx.strokeStyle = P2D.inkSoft;
    ctx.lineWidth = lw(k, 0.8);
    ctx.stroke();
    if (full) {
      for (const cx of [-1.6, -0.55, 0.55, 1.6]) {
        chairGlyph(ctx, k, cx, -1.15, Math.PI);
        chairGlyph(ctx, k, cx, 1.15, 0);
      }
    }
  },

  rect_table: (ctx, k, full) => {
    rr(ctx, -0.8, -0.425, 1.6, 0.85, 0.05);
    ctx.fillStyle = PF2D.top;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      ctx.fillStyle = PF2D.oak;
      for (const lx of [-0.72, 0.72]) for (const lz of [-0.35, 0.35]) { disc(ctx, lx, lz, 0.04); ctx.fill(); }
    }
  },

  round_table: (ctx, k, full) => {
    disc(ctx, 0, 0, 0.55);
    ctx.fillStyle = PF2D.oak;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      disc(ctx, 0, 0, 0.3);
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.8);
      ctx.stroke();
      disc(ctx, 0, 0, 0.06);
      ctx.fillStyle = PF2D.metal;
      ctx.fill();
    }
  },

  // The ONE item whose front faces −Z (mkChair back panel at z +0.28).
  chair: (ctx, k) => chairGlyph(ctx, k, 0, 0, 0),

  laptop: (ctx, k, full) => {
    rr(ctx, -0.17, -0.12, 0.34, 0.24, 0.03);
    ctx.fillStyle = PF2D.screen;
    ctx.fill();
    ctx.strokeStyle = P2D.inkSoft;
    ctx.lineWidth = lw(k, 0.8);
    ctx.stroke();
    if (full) {
      ctx.fillStyle = PF2D.glow; // screen leaf at the back edge
      ctx.fillRect(-0.15, -0.11, 0.3, 0.05);
    }
  },

  // 4.2-wide frame slab; the glowing screen plane sits on the +y face (z +0.05).
  wall_screen: (ctx, k, full) => {
    ctx.fillStyle = PF2D.screen;
    ctx.fillRect(-2.1, -0.04, 4.2, 0.08);
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1);
    ctx.strokeRect(-2.1, -0.04, 4.2, 0.08);
    ctx.strokeStyle = PF2D.glow;
    ctx.lineWidth = lw(k, 1.8);
    ctx.beginPath();
    ctx.moveTo(-2.02, 0.07);
    ctx.lineTo(2.02, 0.07);
    ctx.stroke();
    if (full) {
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.8);
      ctx.beginPath();
      for (const tx of [-2.1, 2.1]) { ctx.moveTo(tx, -0.12); ctx.lineTo(tx, 0.12); }
      ctx.stroke();
    }
  },

  // 6.4 beam + legs over a 5.6×1.4 base slab; the 6×3 screen reads as a
  // glow strip on the +y face (z +0.075).
  projector_screen: (ctx, k, full) => {
    rr(ctx, -2.8, -0.7, 5.6, 1.4, 0.06);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = PF2D.wood;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = P2D.inkSoft;
    ctx.lineWidth = lw(k, 0.8);
    ctx.stroke();
    if (full) {
      ctx.fillStyle = PF2D.metal;
      for (const lx of [-2.55, 2.55]) ctx.fillRect(lx - 0.11, -0.11, 0.22, 0.22);
    }
    rr(ctx, -3.2, -0.12, 6.4, 0.24, 0.04);
    ctx.fillStyle = PF2D.screen;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    ctx.strokeStyle = PF2D.glow;
    ctx.lineWidth = lw(k, 2.2);
    ctx.beginPath();
    ctx.moveTo(-3, 0.09);
    ctx.lineTo(3, 0.09);
    ctx.stroke();
  },

  whiteboard: (ctx, k, full) => {
    rr(ctx, -0.94, -0.25, 1.88, 0.5, 0.03);
    ctx.fillStyle = PF2D.top;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      rr(ctx, -0.86, -0.18, 1.72, 0.36, 0.02); // writing surface
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.7);
      ctx.stroke();
      ctx.fillStyle = PF2D.metal;
      for (const lx of [-0.8, 0.8]) { disc(ctx, lx, -0.05, 0.035); ctx.fill(); }
    }
  },

  // 0.5×0.6 steel cabinet; three fold-down drawers on the +y face (z +0.31).
  filing_cabinet: (ctx, k, full) => {
    rr(ctx, -0.25, -0.3, 0.5, 0.6, 0.03);
    ctx.fillStyle = PF2D.metal;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.1);
    ctx.stroke();
    if (full) {
      ctx.strokeStyle = PF2D.screen;
      ctx.lineWidth = lw(k, 0.8);
      ctx.beginPath();
      for (const dy of [-0.15, 0, 0.15]) { ctx.moveTo(-0.2, dy); ctx.lineTo(0.2, dy); }
      ctx.stroke();
      ctx.fillStyle = P2D.ink;
      for (const dy of [-0.19, -0.04, 0.11]) ctx.fillRect(-0.06, dy, 0.12, 0.025); // handles
    }
  },

  // Two side panels + five shelves; the book spines read as a striped band.
  bookshelf_large: (ctx, k, full) => {
    rr(ctx, -0.95, -0.2, 1.9, 0.4, 0.02);
    ctx.fillStyle = PF2D.woodDark;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = PF2D.spines[i % 5];
        ctx.fillRect(-0.81 + i * 0.162, -0.14, 0.13, 0.28);
      }
    }
  },

  // Round top + pedestal, chaired north and south (reading pair).
  reading_table: (ctx, k, full) => {
    disc(ctx, 0, 0, 0.7);
    ctx.fillStyle = PF2D.wood;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      disc(ctx, 0, 0, 0.1);
      ctx.fillStyle = PF2D.metal;
      ctx.fill();
      chairGlyph(ctx, k, 0, -1.0, Math.PI);
      chairGlyph(ctx, k, 0, 1.0, 0);
    }
  },

  // 2.2×0.9 base, back at −0.35, arms at ±1.1 (front = +y).
  lounge_sofa: (ctx, k, full) => {
    rr(ctx, -1.1, -0.35, 2.2, 0.9, 0.1);
    ctx.fillStyle = PF2D.fabric;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.1);
    ctx.stroke();
    rr(ctx, -1.1, -0.475, 2.2, 0.25, 0.07);
    ctx.fillStyle = PF2D.fabricDeep;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.stroke();
    for (const ax of [-1.21, 0.99]) {
      rr(ctx, ax, -0.45, 0.22, 0.9, 0.07);
      ctx.fillStyle = PF2D.fabricDeep;
      ctx.fill();
      ctx.strokeStyle = P2D.ink;
      ctx.stroke();
    }
    if (full) {
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.7);
      ctx.beginPath();
      for (const cx of [-0.37, 0.37]) { ctx.moveTo(cx, -0.2); ctx.lineTo(cx, 0.42); }
      ctx.stroke();
    }
  },

  // 0.9×0.85 base with its back at −0.32.
  lounge_chair: (ctx, k) => {
    rr(ctx, -0.45, -0.425, 0.9, 0.85, 0.1);
    ctx.fillStyle = PF2D.fabric;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.1);
    ctx.stroke();
    rr(ctx, -0.45, -0.43, 0.9, 0.22, 0.07);
    ctx.fillStyle = PF2D.fabricDeep;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.stroke();
  },

  coffee_table: (ctx, k, full) => {
    disc(ctx, 0, 0, 0.6);
    ctx.fillStyle = PF2D.woodDark;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      disc(ctx, 0, 0, 0.28); // base disc
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.7);
      ctx.stroke();
    }
  },

  // Curved counter — cylinder sector r 1.8, θ 0.15π…0.85π → ±1.1 rad on the
  // sheet; desktop ring r 1.9, work ledge on the inside.
  reception_desk: (ctx, k, full) => {
    ctx.beginPath();
    ctx.arc(0, 0, 1.9, -1.1, 1.1);
    ctx.arc(0, 0, 1.62, 1.1, -1.1, true);
    ctx.closePath();
    ctx.fillStyle = PF2D.woodDark;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    if (full) {
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, -1.05, 1.05);
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.8);
      ctx.stroke();
      ctx.beginPath(); // end caps
      for (const a of [-1.1, 1.1]) {
        ctx.moveTo(Math.cos(a) * 1.55, Math.sin(a) * 1.55);
        ctx.lineTo(Math.cos(a) * 1.95, Math.sin(a) * 1.95);
      }
      ctx.strokeStyle = P2D.ink;
      ctx.lineWidth = lw(k, 1);
      ctx.stroke();
    }
  },

  // 2×0.5 seat, back rail at −0.25.
  waiting_bench: (ctx, k, full) => {
    rr(ctx, -1, -0.28, 2, 0.09, 0.03);
    ctx.fillStyle = PF2D.woodDark;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1);
    ctx.stroke();
    rr(ctx, -1, -0.25, 2, 0.5, 0.05);
    ctx.fillStyle = PF2D.wood;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.stroke();
    if (full) {
      ctx.fillStyle = PF2D.metal;
      for (const lx of [-0.9, 0.9]) { disc(ctx, lx, 0, 0.045); ctx.fill(); }
    }
  },

  // Cylinder sector r 2.2, θ 0.2π…0.8π → ±0.3π on the sheet; three monitors
  // at (sin a·1.6, 1.2 − cos a·1.6), each yawed a to face along the arc.
  command_console: (ctx, k, full) => {
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, -0.3 * Math.PI, 0.3 * Math.PI);
    ctx.arc(0, 0, 1.95, 0.3 * Math.PI, -0.3 * Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = PF2D.screen;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2.24, -0.3 * Math.PI, 0.3 * Math.PI);
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 0.9);
    ctx.stroke();
    if (full) {
      for (const a of [-0.5, 0, 0.5]) {
        ctx.save();
        ctx.translate(Math.sin(a) * 1.6, 1.2 - Math.cos(a) * 1.6);
        ctx.rotate(a);
        rr(ctx, -0.3, -0.03, 0.6, 0.06, 0.02);
        ctx.fillStyle = PF2D.glow;
        ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.beginPath(); // diagram pass: one glow band along the console
      ctx.arc(0, 0, 2.075, -0.3 * Math.PI, 0.3 * Math.PI);
      ctx.strokeStyle = PF2D.glow;
      ctx.lineWidth = lw(k, 1.6);
      ctx.stroke();
    }
  },

  // 0.8×0.6 black cabinet with the LED bank on the +y face (z +0.31).
  archive_server: (ctx, k, full) => {
    rr(ctx, -0.4, -0.3, 0.8, 0.6, 0.03);
    ctx.fillStyle = PF2D.screen;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 1.1);
    ctx.stroke();
    if (full) {
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.7);
      ctx.beginPath();
      for (const dy of [-0.12, 0.02]) { ctx.moveTo(-0.3, dy); ctx.lineTo(0.3, dy); }
      ctx.stroke();
      ctx.fillStyle = PF2D.glow;
      ctx.fillRect(-0.3, 0.16, 0.6, 0.05);
    }
  },

  plant_large: (ctx, k) => plantGlyph(ctx, k, 1.8),
  plant: (ctx, k) => plantGlyph(ctx, k, 1),

  // Ceiling fixture — ring + cross (drawn in the overhead pass).
  pendant: (ctx, k) => {
    disc(ctx, 0, 0, 0.2);
    ctx.strokeStyle = PF2D.glowSoft;
    ctx.lineWidth = lw(k, 1.3);
    ctx.stroke();
    ctx.strokeStyle = P2D.inkSoft;
    ctx.lineWidth = lw(k, 0.7);
    ctx.beginPath();
    ctx.moveTo(-0.13, -0.13);
    ctx.lineTo(0.13, 0.13);
    ctx.moveTo(-0.13, 0.13);
    ctx.lineTo(0.13, -0.13);
    ctx.stroke();
    disc(ctx, 0, 0, 0.05);
    ctx.fillStyle = PF2D.glow;
    ctx.fill();
  },

  // Bollard — lit disc with four rays.
  path_light: (ctx, k) => {
    disc(ctx, 0, 0, 0.1);
    ctx.fillStyle = PF2D.glowSoft;
    ctx.fill();
    ctx.strokeStyle = P2D.inkSoft;
    ctx.lineWidth = lw(k, 0.7);
    ctx.beginPath();
    for (const a of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
      ctx.moveTo(Math.cos(a) * 0.11, Math.sin(a) * 0.11);
      ctx.lineTo(Math.cos(a) * 0.19, Math.sin(a) * 0.19);
    }
    ctx.stroke();
    disc(ctx, 0, 0, 0.045);
    ctx.fillStyle = PF2D.glow;
    ctx.fill();
  },

  // Wall fixture — glow fans away from the wall plate line.
  wall_sconce: (ctx, k) => {
    ctx.beginPath();
    ctx.arc(0, 0, 0.14, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = PF2D.glowSoft;
    ctx.fill();
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = lw(k, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.22, 0);
    ctx.lineTo(0.22, 0);
    ctx.stroke();
  },

  // 3.2×1.8 mat: brown field, accent border (the 3D canvas texture in plan).
  entrance_mat: (ctx, k, full) => {
    rr(ctx, -1.6, -0.9, 3.2, 1.8, 0.22);
    ctx.fillStyle = PF2D.matFill;
    ctx.fill();
    ctx.strokeStyle = P2D.accent;
    ctx.lineWidth = lw(k, 1.4);
    ctx.stroke();
    if (full) {
      rr(ctx, -1.38, -0.68, 2.76, 1.36, 0.16);
      ctx.strokeStyle = P2D.inkSoft;
      ctx.lineWidth = lw(k, 0.7);
      ctx.stroke();
    }
  },
};

/** Unknown/future catalog types — honest footprint from the catalog dim. */
function generic(ctx: CanvasRenderingContext2D, k: number, full: boolean, it: PlacedItemMeta): void {
  const d = ITEM_CATALOG[it.type]?.dim ?? [0.7, 0.7];
  rr(ctx, -d[0] / 2, -d[1] / 2, d[0], d[1], 0.05);
  ctx.fillStyle = PF2D.top;
  ctx.fill();
  ctx.strokeStyle = P2D.ink;
  ctx.lineWidth = lw(k, 1.1);
  ctx.stroke();
  if (full) {
    disc(ctx, 0, 0, 0.05);
    ctx.fillStyle = P2D.inkSoft;
    ctx.fill();
  }
}

/** Overhead fixtures — painted after the furniture they hang above. */
const LIGHTS = new Set(['pendant', 'path_light', 'wall_sconce']);

// cull radius per type, from the catalog footprint (half diagonal of dim)
const SPAN = new Map<string, number>();
function halfSpan(type: string): number {
  let v = SPAN.get(type);
  if (v === undefined) {
    const d = ITEM_CATALOG[type]?.dim;
    v = d ? Math.hypot(d[0], d[1]) / 2 : 0.8;
    SPAN.set(type, v);
  }
  return v;
}

/** All placed items, drawn as their catalog symbols. Called from
 *  architecture() between the room floors and the wall poché — the drafting
 *  order is floors → furniture → walls → labels. */
export function paintFurniture(ctx: CanvasRenderingContext2D, cam: Camera2D, f: Office2DFrame): void {
  const k = cam.scale;
  const full = k >= 7; // worked symbols above the subtitle threshold
  const W = cam.width, H = cam.height;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let pass = 0; pass < 2; pass++) {
    for (const it of f.items) {
      if (it.role) continue; // agent bodies — 14.4 vocabulary
      if ((pass === 1) !== LIGHTS.has(it.type)) continue;

      const sx = cam.toScreenX(it.position.x), sy = cam.toScreenY(it.position.z);
      const m = (halfSpan(it.type) + 0.8) * k; // cull disc around the symbol
      if (sx < -m || sy < -m || sx > W + m || sy > H + m) continue;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-it.rotation);
      ctx.scale(k, k);
      const sym = SYMBOLS[it.type];
      if (sym) sym(ctx, k, full);
      else generic(ctx, k, full, it);
      ctx.restore();
    }
  }
}
