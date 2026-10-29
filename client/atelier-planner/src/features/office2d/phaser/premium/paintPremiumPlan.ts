/** ── Premium sheet painter (v2 bake) ───────────────────────────────────
 *  Replaces the flat canvas-painter schematic inside the bake with the
 *  premium architectural model, closing the visual gap to the 3D target:
 *
 *    1. warm drafting-paper stage (grid, sheen)  — the Atelier 2D identity
 *    2. building plate floating on the paper (layered drop shadow)
 *    3. per-room floors: tint + material pattern (wood / carpet / tile)
 *       + inset ambient-occlusion at the wall lines
 *    4. GLB-measured rotunda: radial dais, concentric rings, core underglow
 *    5. furniture as two-face mini-extrusions (top face + darker front
 *       face + soft shadow), rotation honored, y-sorted for stacking,
 *       ws-desks carry monitors — category symbols mirror the 3D models
 *    6. two-face extruded WALLS with doorway gaps + door swings (real
 *       plan language), derived from planGeometry (SpatialConfig truth)
 *    7. dressing: title block, north arrow, TRUE 5 m scale bar, grain,
 *       vignette — fully deterministic (no dates/no Math.random)
 *
 *  Room LABELS are NOT baked anymore — they live as floating pills in
 *  OfficeScene (like the 3D's sprite labels). Agents are not baked either
 *  (live sprite layer, unchanged).
 *
 *  NEW FILE — office2d/phaser/premium/paintPremiumPlan.ts */

import { BOUNDS } from '../../../canvas/architecture/SpatialConfig';
import { ITEM_CATALOG } from '../../../furniture/catalog';
import type { PlacedItemMeta } from '../../../ai-agents/types';
import { P2 } from './palette';
import { computePlanGeometry, ROTUNDA } from './planGeometry';
import type { WallSeg } from './planGeometry';

const TAU = Math.PI * 2;

export interface PlanWorldRect { minX: number; minZ: number; w: number; h: number }

/** Deterministic seeded rand — same hash family as blobAvatar. */
function seedFrom(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Rounded-rect path via arcTo (no ctx.roundRect dependency). */
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

const MATERIAL: Record<string, 'wood' | 'carpet' | 'tile' | 'none'> = {
  home_workspace: 'wood', showcase: 'wood', office_floor: 'wood', agent_space: 'wood',
  knowledge_hub: 'wood', meeting_room: 'wood', command_hub: 'tile', reception: 'tile',
  ai_club: 'carpet', brain_chamber: 'none', // rotunda paints its own floor
};

const isRug = (t: string) => /(rug|carpet|mat)/.test(t);

// ════════════════════════════════════════════════════════════════════
export function paintPremiumPlan(
  ctx: CanvasRenderingContext2D,
  items: PlacedItemMeta[],
  ppu: number,
  world: PlanWorldRect,
): void {
  const plan = computePlanGeometry();
  const W = Math.round(world.w * ppu);
  const H = Math.round(world.h * ppu);

  // ── 1. paper stage ─────────────────────────────────────────────────
  ctx.fillStyle = P2.paper;
  ctx.fillRect(0, 0, W, H);
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // ── world space from here ──────────────────────────────────────────
  ctx.save();
  ctx.setTransform(ppu, 0, 0, ppu, -world.minX * ppu, -world.minZ * ppu);

  // 2. drafting grid (1 u)
  ctx.strokeStyle = P2.grid;
  ctx.lineWidth = 0.014;
  ctx.beginPath();
  for (let x = Math.ceil(world.minX); x <= world.minX + world.w; x++) { ctx.moveTo(x, world.minZ); ctx.lineTo(x, world.minZ + world.h); }
  for (let z = Math.ceil(world.minZ); z <= world.minZ + world.h; z++) { ctx.moveTo(world.minX, z); ctx.lineTo(world.minX + world.w, z); }
  ctx.stroke();

  // 3. building plate — layered shadow = "model on the desk"
  const bw = BOUNDS.maxX - BOUNDS.minX;
  const bh = BOUNDS.maxZ - BOUNDS.minZ;
  ctx.fillStyle = 'rgba(60, 40, 20, 0.09)';
  ctx.fillRect(BOUNDS.minX + 0.38, BOUNDS.minZ + 0.5, bw, bh);
  ctx.fillStyle = 'rgba(60, 40, 20, 0.10)';
  ctx.fillRect(BOUNDS.minX + 0.18, BOUNDS.minZ + 0.24, bw, bh);
  ctx.fillStyle = P2.floorBase;
  ctx.fillRect(BOUNDS.minX, BOUNDS.minZ, bw, bh);

  // 4. room floors + materials + AO
  for (const room of plan.rooms) paintRoomFloor(ctx, room);
  paintRotundaFloor(ctx);

  // 5. furniture (rugs → shadows → symbols)
  paintFurniture(ctx, items);

  // 6. walls (two-face) + door swings + rotunda ring
  for (const w of plan.walls) paintWall(ctx, w);
  paintRotundaWall(ctx);

  ctx.restore(); // back to px space

  // ── 7. dressing ────────────────────────────────────────────────────
  paintDressing(ctx, W, H, ppu);
}

// ── room floors ──────────────────────────────────────────────────────
function paintRoomFloor(ctx: CanvasRenderingContext2D, room: { id: string; minX: number; maxX: number; minZ: number; maxZ: number }): void {
  const w = room.maxX - room.minX;
  const h = room.maxZ - room.minZ;
  ctx.fillStyle = P2.rooms[room.id] ?? P2.floorBase;
  ctx.fillRect(room.minX, room.minZ, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(room.minX, room.minZ, w, h);
  ctx.clip();

  const mat = MATERIAL[room.id] ?? 'wood';
  const rnd = seedFrom(room.id);
  if (mat === 'wood') {
    ctx.strokeStyle = P2.materials.wood;
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    for (let z = room.minZ + 0.42; z < room.maxZ; z += 0.42) { ctx.moveTo(room.minX, z); ctx.lineTo(room.maxX, z); }
    ctx.stroke();
    ctx.strokeStyle = P2.materials.woodEdge;
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    let row = 0;
    for (let z = room.minZ; z < room.maxZ; z += 0.42, row++) {
      const off = room.minX + ((row * 0.53) % 1.15);
      for (let x = off; x < room.maxX; x += 1.15) { ctx.moveTo(x, z); ctx.lineTo(x, z + 0.42); }
    }
    ctx.stroke();
  } else if (mat === 'carpet') {
    ctx.fillStyle = P2.materials.carpet;
    for (let z = room.minZ + 0.16; z < room.maxZ; z += 0.32) {
      for (let x = room.minX + 0.16; x < room.maxX; x += 0.32) {
        ctx.beginPath();
        ctx.arc(x + (rnd() - 0.5) * 0.14, z + (rnd() - 0.5) * 0.14, 0.028, 0, TAU);
        ctx.fill();
      }
    }
  } else if (mat === 'tile') {
    ctx.strokeStyle = P2.materials.tile;
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (let x = room.minX + 0.65; x < room.maxX; x += 0.65) { ctx.moveTo(x, room.minZ); ctx.lineTo(x, room.maxZ); }
    for (let z = room.minZ + 0.65; z < room.maxZ; z += 0.65) { ctx.moveTo(room.minX, z); ctx.lineTo(room.maxX, z); }
    ctx.stroke();
  }

  // inset AO — floor darkens where it meets the north + west walls
  let ao = ctx.createLinearGradient(0, room.minZ, 0, room.minZ + 0.7);
  ao.addColorStop(0, P2.aoTop);
  ao.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ao;
  ctx.fillRect(room.minX, room.minZ, w, 0.7);
  ao = ctx.createLinearGradient(room.minX, 0, room.minX + 0.45, 0);
  ao.addColorStop(0, P2.aoTop);
  ao.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ao;
  ctx.fillRect(room.minX, room.minZ, 0.45, h);

  ctx.restore();
}

// ── rotunda floor (GLB-measured dais) ────────────────────────────────
function paintRotundaFloor(ctx: CanvasRenderingContext2D): void {
  const { cx, cz, rDais } = ROTUNDA;
  const g = ctx.createRadialGradient(cx, cz, 0.4, cx, cz, rDais);
  g.addColorStop(0, P2.brain.dais);
  g.addColorStop(1, P2.rooms.brain_chamber);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cz, rDais, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = P2.brain.daisRing;
  ctx.lineWidth = 0.03;
  for (const r of [1.5, 2.9, 4.2]) {
    ctx.beginPath();
    ctx.arc(cx, cz, r, 0, TAU);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(cx, cz, 0.1, cx, cz, 2.2);
  glow.addColorStop(0, P2.brain.glow);
  glow.addColorStop(1, 'rgba(167, 95, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cz, 2.2, 0, TAU);
  ctx.fill();
}

// ── furniture ────────────────────────────────────────────────────────
function paintFurniture(ctx: CanvasRenderingContext2D, items: PlacedItemMeta[]): void {
  const rugs = items.filter(i => !i.role && isRug(i.type.toLowerCase()));
  const rest = items
    .filter(i => !i.role && !isRug(i.type.toLowerCase()))
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0)); // stacking order (laptops on tables)

  for (const it of rugs) drawRug(ctx, it);
  for (const it of rest) drawShadow(ctx, it);
  for (const it of rest) drawFurniture(ctx, it);
}

function dimOf(item: PlacedItemMeta): [number, number] {
  return ITEM_CATALOG[item.type]?.dim ?? [0.7, 0.7];
}

function drawShadow(ctx: CanvasRenderingContext2D, item: PlacedItemMeta): void {
  const [w, h] = dimOf(item);
  ctx.save();
  ctx.translate(item.position.x, item.position.z);
  ctx.rotate(item.rotation);
  ctx.fillStyle = P2.wallShadow;
  rr(ctx, -w / 2 + 0.12, -h / 2 + 0.16, w, h, 0.06);
  ctx.fill();
  ctx.restore();
}

function drawRug(ctx: CanvasRenderingContext2D, item: PlacedItemMeta): void {
  const [w, h] = dimOf(item);
  ctx.save();
  ctx.translate(item.position.x, item.position.z);
  ctx.rotate(item.rotation);
  ctx.fillStyle = 'rgba(201, 162, 107, 0.16)';
  rr(ctx, -w / 2, -h / 2, w, h, 0.12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(169, 134, 91, 0.5)';
  ctx.lineWidth = 0.035;
  ctx.setLineDash([0.22, 0.14]);
  rr(ctx, -w / 2 + 0.08, -h / 2 + 0.08, w - 0.16, h - 0.16, 0.1);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Two-face extrusion helper: darker front face on the local south edge. */
function extrude(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, face: string, depth = 0.1): void {
  ctx.fillStyle = face;
  ctx.fillRect(-w / 2, h / 2, w, depth);
  ctx.fillStyle = top;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = P2.fur.ink;
  ctx.lineWidth = 0.025;
  ctx.strokeRect(-w / 2, -h / 2, w, h + depth);
}

function drawFurniture(ctx: CanvasRenderingContext2D, item: PlacedItemMeta): void {
  const [w, h] = dimOf(item);
  const type = item.type.toLowerCase();
  const rnd = seedFrom(item.id);
  ctx.save();
  ctx.translate(item.position.x, item.position.z);
  ctx.rotate(item.rotation);

  if (/(chair|stool|seat)/.test(type)) {
    // seat + back arc + pedestal dot
    ctx.fillStyle = P2.fur.fabric;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.34, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = P2.fur.fabricFace;
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.arc(0, 0.04, w * 0.4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.fillStyle = P2.fur.ink;
    ctx.beginPath();
    ctx.arc(0, 0, 0.035, 0, TAU);
    ctx.fill();
  } else if (/(sofa|couch|bench|lounge)/.test(type)) {
    extrude(ctx, w, h, P2.fur.fabric, P2.fur.fabricFace, 0.12);
    ctx.strokeStyle = P2.fur.fabricFace;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 0.08); ctx.lineTo(0, h / 2 - 0.06);
    ctx.stroke();
    ctx.fillStyle = P2.fur.fabricFace;
    ctx.fillRect(-w / 2, -h / 2, 0.1, h);
    ctx.fillRect(w / 2 - 0.1, -h / 2, 0.1, h);
  } else if (/(plant|tree|potted|monstera|ficus|palm)/.test(type)) {
    ctx.fillStyle = P2.fur.pot;
    ctx.beginPath();
    ctx.arc(0, 0, 0.17, 0, TAU);
    ctx.fill();
    const leaves = 5 + Math.floor(rnd() * 2);
    for (let i = 0; i < leaves; i++) {
      const a = (i / leaves) * TAU + rnd() * 0.5;
      const r = 0.16 + rnd() * 0.14;
      ctx.fillStyle = i % 2 ? P2.fur.leaf : P2.fur.leafDeep;
      ctx.save();
      ctx.translate(Math.cos(a) * 0.18, Math.sin(a) * 0.18);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(r * 0.55, 0, r, r * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  } else if (/(shelf|bookcase|bookshelf|library|cabinet)/.test(type)) {
    extrude(ctx, w, h, P2.fur.wood, P2.fur.woodFace, 0.08);
    const spines = ['rgba(199, 93, 63, 0.75)', 'rgba(31, 58, 95, 0.7)', 'rgba(107, 142, 78, 0.7)', 'rgba(212, 155, 59, 0.75)'];
    const n = Math.max(3, Math.floor(w / 0.13));
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = spines[Math.floor(rnd() * spines.length)]!;
      const x = -w / 2 + 0.05 + (i / n) * (w - 0.1);
      ctx.fillRect(x, -h / 2 + 0.05, 0.05, h - 0.1);
    }
  } else if (/(screen|projector|display|monitor|tv)/.test(type)) {
    extrude(ctx, w, h, P2.fur.screen, '#151312', 0.06);
    ctx.strokeStyle = P2.fur.screenGlow;
    ctx.lineWidth = 0.03;
    ctx.strokeRect(-w / 2 + 0.07, -h / 2 + 0.07, w - 0.14, h - 0.14);
  } else if (/(lamp|pendant|light)/.test(type)) {
    const g = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.42);
    g.addColorStop(0, 'rgba(255, 236, 190, 0.55)');
    g.addColorStop(1, 'rgba(255, 236, 190, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 0.42, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P2.fur.ink;
    ctx.beginPath();
    ctx.arc(0, 0, 0.07, 0, TAU);
    ctx.fill();
  } else {
    // desk / table / workstation / everything else — wood top + grain
    extrude(ctx, w, h, P2.fur.wood, P2.fur.woodFace, 0.1);
    ctx.strokeStyle = 'rgba(120, 84, 48, 0.25)';
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    const along = w >= h;
    if (along) { ctx.moveTo(-w / 2 + 0.06, -h * 0.14); ctx.lineTo(w / 2 - 0.06, -h * 0.14); ctx.moveTo(-w / 2 + 0.06, h * 0.16); ctx.lineTo(w / 2 - 0.06, h * 0.16); }
    else { ctx.moveTo(-w * 0.14, -h / 2 + 0.06); ctx.lineTo(-w * 0.14, h / 2 - 0.06); ctx.moveTo(w * 0.16, -h / 2 + 0.06); ctx.lineTo(w * 0.16, h / 2 - 0.06); }
    ctx.stroke();
    if (item.ws) {
      // screen-linked workstation: monitor + glow + keyboard hint
      ctx.fillStyle = P2.fur.screen;
      ctx.fillRect(-w * 0.22, -h / 2 + 0.04, w * 0.4, h * 0.18);
      ctx.strokeStyle = P2.fur.screenGlow;
      ctx.lineWidth = 0.022;
      ctx.strokeRect(-w * 0.2, -h / 2 + 0.06, w * 0.36, h * 0.14);
      ctx.fillStyle = 'rgba(62, 46, 32, 0.35)';
      ctx.fillRect(-w * 0.12, h * 0.1, w * 0.24, h * 0.12);
    }
  }
  ctx.restore();
}

// ── walls ────────────────────────────────────────────────────────────
/** Wall run pieces between door gaps. */
function runsOf(w: WallSeg): [number, number][] {
  if (!w.doors.length) return [[w.from, w.to]];
  const ds = [...w.doors].sort((a, b) => a.at - b.at);
  const out: [number, number][] = [];
  let cur = w.from;
  for (const d of ds) {
    const a = d.at - d.half, b = d.at + d.half;
    if (a > cur) out.push([cur, Math.min(a, w.to)]);
    cur = Math.max(cur, b);
  }
  if (w.to > cur) out.push([cur, w.to]);
  return out.filter(([f, t]) => t - f > 0.05);
}

function paintWall(ctx: CanvasRenderingContext2D, w: WallSeg): void {
  const t = w.t;
  const extrudeH = t * 0.8;
  for (const [f, to] of runsOf(w)) {
    const len = to - f;
    if (w.axis === 'x') {
      // shadow → south side face → top face → ink silhouette + face seam
      ctx.fillStyle = P2.wallShadow;
      ctx.fillRect(f + 0.1, w.at - t / 2 + 0.14, len, t + extrudeH);
      ctx.fillStyle = P2.wallSide;
      ctx.fillRect(f, w.at + t / 2 - 0.02, len, extrudeH);
      ctx.fillStyle = P2.wallTop;
      ctx.fillRect(f, w.at - t / 2, len, t);
      ctx.strokeStyle = P2.wallLine;
      ctx.lineWidth = 0.035;
      ctx.strokeRect(f, w.at - t / 2, len, t + extrudeH);
      ctx.beginPath();
      ctx.moveTo(f, w.at + t / 2); ctx.lineTo(to, w.at + t / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = P2.wallShadow;
      ctx.fillRect(w.at - t / 2 + 0.1, f + 0.14, t + extrudeH, len);
      ctx.fillStyle = P2.wallSide;
      ctx.fillRect(w.at + t / 2 - 0.02, f, extrudeH, len);
      ctx.fillStyle = P2.wallTop;
      ctx.fillRect(w.at - t / 2, f, t, len);
      ctx.strokeStyle = P2.wallLine;
      ctx.lineWidth = 0.035;
      ctx.strokeRect(w.at - t / 2, f, t + extrudeH, len);
      ctx.beginPath();
      ctx.moveTo(w.at + t / 2, f); ctx.lineTo(w.at + t / 2, to);
      ctx.stroke();
    }
  }
  // door swings — hinge at the gap edge, leaf + quarter arc
  ctx.strokeStyle = P2.inkSoft;
  ctx.lineWidth = 0.03;
  for (const d of w.doors) {
    const r = d.half * 2;
    const hx = w.axis === 'x' ? d.at - d.half : w.at;
    const hz = w.axis === 'x' ? w.at : d.at - d.half;
    ctx.beginPath();
    if (w.axis === 'x') ctx.arc(hx, hz, r, -Math.PI / 2, 0);
    else ctx.arc(hx, hz, r, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx, hz);
    if (w.axis === 'x') ctx.lineTo(hx, hz - r);
    else ctx.lineTo(hx + r, hz);
    ctx.stroke();
  }
}

function paintRotundaWall(ctx: CanvasRenderingContext2D): void {
  const { cx, cz, rOuter } = ROTUNDA;
  // offset darker ring peeks out SE = the extruded side face
  ctx.strokeStyle = P2.wallSide;
  ctx.lineWidth = 0.34;
  ctx.beginPath();
  ctx.arc(cx + 0.12, cz + 0.16, rOuter, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = P2.wallTop;
  ctx.beginPath();
  ctx.arc(cx, cz, rOuter, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = P2.wallLine;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.arc(cx, cz, rOuter + 0.17, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cz, rOuter - 0.17, 0, TAU);
  ctx.stroke();
}

// ── dressing (px space) ─────────────────────────────────────────────
function paintDressing(ctx: CanvasRenderingContext2D, W: number, H: number, ppu: number): void {
  // sheet frame
  ctx.strokeStyle = P2.frame;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(34, 34, W - 68, H - 68);

  // title block
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = P2.ink;
  ctx.font = '700 30px Archivo, "Segoe UI", system-ui, sans-serif';
  ctx.fillText('ATELIER HQ', 46, 88);
  ctx.font = '500 12px Archivo, "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(62, 46, 32, 0.62)';
  ctx.fillText('LIVE FLOOR PLAN · CANONICAL LAYOUT · SCALE 1:100', 46, 108);
  ctx.strokeStyle = 'rgba(62, 46, 32, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(46, 122);
  ctx.lineTo(370, 122);
  ctx.stroke();

  // scale bar — TRUE at ppu (1 world unit = 1 m): 5 m reads exact at any zoom
  const sx = 46, sy = H - 64;
  ctx.strokeStyle = P2.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + 5 * ppu, sy);
  for (const t of [0, 1, 5]) {
    ctx.moveTo(sx + t * ppu, sy);
    ctx.lineTo(sx + t * ppu, sy - 9);
  }
  ctx.stroke();
  ctx.font = '500 11px Archivo, "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = P2.ink;
  ctx.fillText('0', sx - 2, sy + 16);
  ctx.fillText('1', sx + ppu - 2, sy + 16);
  ctx.fillText('5 m', sx + 5 * ppu - 10, sy + 16);

  // north arrow (plan y-down: north = −z = up)
  const nx = W - 96, ny = H - 96;
  ctx.strokeStyle = P2.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(nx, ny, 20, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = P2.ink;
  ctx.beginPath();
  ctx.moveTo(nx, ny - 13);
  ctx.lineTo(nx - 6, ny + 7);
  ctx.lineTo(nx + 6, ny + 7);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 12px Archivo, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny - 27);
  ctx.textAlign = 'left';

  // grain (seeded — bake stays deterministic)
  const rnd = seedFrom('atelier-grain');
  const n = Math.floor((W * H) / 1500);
  ctx.fillStyle = 'rgba(90, 68, 48, 0.05)';
  for (let i = 0; i < n; i++) ctx.fillRect(rnd() * W, rnd() * H, 1, 1);

  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(90, 60, 30, 0.07)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
