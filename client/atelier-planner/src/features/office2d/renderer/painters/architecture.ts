import { ROOM_ZONES, BOUNDS, BRAIN_ANCHOR } from '../../../canvas/architecture/SpatialConfig';
import { roomBannerFor } from '../../../canvas/architecture/roomLabels';
import { P2D, ROOM_FLOOR_2D } from '../theme';
import type { Camera2D } from '../Camera2D';
import type { Office2DFrame } from '../../types';
import { paintWalls, ROTUNDA_R } from './walls';
import { paintFurniture } from './furniture';
import { paintAgents, paintBrain } from './agents';

/** '#RRGGBB' → 'rgba(r,g,b,a)' (the P2D palette is all 6-digit hex). */
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// ── paper grain: one seeded offscreen noise tile, created lazily ──
let grain: CanvasPattern | null = null;
function grainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (grain) return grain;
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(160, 160);
  let seed = 1337; // stable sheet texture across reloads
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 160 * 160; i++) {
    const a = rnd();
    if (a < 0.82) continue;                                  // sparse — paper, not sandpaper
    const p = i * 4;
    img.data[p] = 77; img.data[p + 1] = 56; img.data[p + 2] = 42;
    img.data[p + 3] = Math.round(((a - 0.82) / 0.18) * 18); // ≤ ~7% alpha speckle
  }
  g.putImageData(img, 0, 0);
  grain = ctx.createPattern(c, 'repeat');
  return grain;
}

/** Sheet dressing — screen-fixed chrome that never covers the plan:
 *  title block (top-left, clear of the floating panels), north arrow +
 *  zoom-honest scale bar (bottom-left band). −Z is north on this plan
 *  (the reception gate faces east/+X, per the v1.3 zone table). */
function paintDressing(ctx: CanvasRenderingContext2D, cam: Camera2D, _W: number, H: number) {
  ctx.save();
  ctx.strokeStyle = P2D.ink; ctx.fillStyle = P2D.ink;

  // Title block — top-left, right of the LeftPanel column
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '700 11px Archivo, sans-serif';
  ctx.fillText('ATELIER HQ', 272, 84);
  ctx.font = '9px Manrope, sans-serif';
  ctx.fillStyle = P2D.sub;
  ctx.fillText('LIVE OPERATING PLAN · CEO EDITION', 272, 97);

  // North arrow
  ctx.fillStyle = P2D.ink;
  const nx = 300, ny = H - 52;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(nx, ny, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nx, ny - 10); ctx.lineTo(nx - 4, ny + 5); ctx.lineTo(nx, ny + 1); ctx.lineTo(nx + 4, ny + 5);
  ctx.closePath(); ctx.fill();
  ctx.font = '700 9px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N', nx, ny - 22);

  // Scale bar — zoom-aware: its pixel length is always an honest 5 world meters
  const m = cam.scale;
  const bx = nx + 32, by = H - 48;
  ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(bx + 5 * m, by);
  for (let i = 0; i <= 5; i++) {
    ctx.moveTo(bx + i * m, by - (i % 2 ? 3 : 5));
    ctx.lineTo(bx + i * m, by + (i % 2 ? 3 : 5));
  }
  ctx.stroke();
  ctx.font = '9px Manrope, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('0', bx - 3, by + 15);
  ctx.fillText('5 m', bx + 5 * m - 8, by + 15);
  ctx.restore();
}

/**
 * Architecture layer v5 — the illustrated plan: warm paper, drafting grid,
 * seeded grain, building drop-shadow, per-room floor tints, furniture
 * symbols (14.3, ./furniture), poché walls with door swings (14.2,
 * ./walls), LIVE rotunda core + agents (14.4, ./agents — the live layer
 * reads on top of the plan), the [Zones] overlay (14.5), vignette, banner
 * labels, sheet dressing.
 * Pure draw — reads state, writes nothing (app state, that is; the agents
 * painter keeps a movement cache for heading derivation only).
 */
export function paintArchitecture(ctx: CanvasRenderingContext2D, cam: Camera2D, f: Office2DFrame): void {
  const W = cam.width, H = cam.height;

  // ── paper ──
  ctx.fillStyle = P2D.paper;
  ctx.fillRect(0, 0, W, H);

  // ── building drop shadow (the plan sits ON the sheet) ──
  ctx.save();
  ctx.shadowColor = 'rgba(60, 40, 20, 0.30)';
  ctx.shadowBlur = 26; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 10;
  ctx.fillStyle = P2D.paper;
  ctx.fillRect(cam.toScreenX(BOUNDS.minX), cam.toScreenY(BOUNDS.minZ),
    (BOUNDS.maxX - BOUNDS.minX) * cam.scale, (BOUNDS.maxZ - BOUNDS.minZ) * cam.scale);
  ctx.restore();

  // ── drafting grid (world-aligned → the plan slides, the sheet stays) ──
  ctx.strokeStyle = P2D.grid;
  ctx.lineWidth = 1;
  const step = 2;
  const tl = cam.screenToWorld(0, 0), br = cam.screenToWorld(W, H);
  ctx.beginPath();
  for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
    const sx = cam.toScreenX(x); ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
  }
  for (let z = Math.floor(tl.z / step) * step; z <= br.z; z += step) {
    const sy = cam.toScreenY(z); ctx.moveTo(0, sy); ctx.lineTo(W, sy);
  }
  ctx.stroke();

  // sheet grain (screen-fixed — the PAPER is the medium)
  const gp = grainPattern(ctx);
  if (gp) { ctx.fillStyle = gp; ctx.fillRect(0, 0, W, H); }

  // ── room floors (walls own ALL linework) ──
  for (const z of ROOM_ZONES) {
    if (z.id === 'brain_chamber') continue; // the rotunda floor is its own circle
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ROOM_FLOOR_2D[z.id] ?? '#C7A98D';
    ctx.fillRect(cam.toScreenX(z.minX), cam.toScreenY(z.minZ),
      (z.maxX - z.minX) * cam.scale, (z.maxZ - z.minZ) * cam.scale);
  }
  ctx.globalAlpha = 1;

  // ── CEO Brain rotunda floor + dais rings + LIVE core (14.4, ./agents) ──
  const bx = cam.toScreenX(BRAIN_ANCHOR.x), by = cam.toScreenY(BRAIN_ANCHOR.z);
  const r = ROTUNDA_R * cam.scale;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = ROOM_FLOOR_2D.brain_chamber;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = P2D.inkSoft; ctx.lineWidth = 1;
  for (const k of [0.78, 0.5]) {
    ctx.beginPath(); ctx.arc(bx, by, r * k, 0, Math.PI * 2); ctx.stroke();
  }
  paintBrain(ctx, bx, by, r, f); // live pulse — idle breath / active neural orbits

  // ── furniture vocabulary (14.3 — per-catalog symbols, see ./furniture) ──
  paintFurniture(ctx, cam, f);

  // ── walls, partitions, door swings (14.2 — data-derived, see ./walls) ──
  paintWalls(ctx, cam);

  // ── LIVE layer (14.4 — meeting halo, agents, streaks; see ./agents) ──
  paintAgents(ctx, cam, f);

  // ── [Zones] overlay (14.5): dim the sheet, then mark every zone with a
  //    tinted fill + dashed bounds. Screen-space (the sheet's own units —
  //    a px dash is a px dash HERE, nothing is scaled) and VISUAL ONLY:
  //    no application state is read or written by this block.
  if (f.zonesVisible) {
    ctx.fillStyle = 'rgba(241, 231, 216, 0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.setLineDash([6, 4]);
    for (const z of ROOM_ZONES) {
      const zx = cam.toScreenX(z.minX), zy = cam.toScreenY(z.minZ);
      const zw = (z.maxX - z.minX) * cam.scale, zh = (z.maxZ - z.minZ) * cam.scale;
      ctx.fillStyle = rgba(P2D.accent, 0.06);
      ctx.fillRect(zx, zy, zw, zh);
      ctx.strokeStyle = P2D.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(zx, zy, zw, zh);
    }
    ctx.setLineDash([]);
  }

  // ── vignette ──
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(77,56,42,0)');
  vg.addColorStop(1, 'rgba(77,56,42,0.07)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // ── labels (brain label anchored INSIDE the ring — was dead space in 14.1) ──
  if (f.labelsVisible) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const z of ROOM_ZONES) {
      const banner = roomBannerFor(z.id);
      const isBrain = z.id === 'brain_chamber';
      const cx = cam.toScreenX(isBrain ? BRAIN_ANCHOR.x : (z.minX + z.maxX) / 2);
      const cy = cam.toScreenY(isBrain ? BRAIN_ANCHOR.z - 3.4 : (z.minZ + z.maxZ) / 2);
      ctx.font = '700 11px Archivo, sans-serif';
      ctx.fillStyle = P2D.label;
      ctx.fillText((banner?.text ?? z.label).toUpperCase(), cx, cy - 6);
      if (cam.scale > 7 && banner?.sub) {
        ctx.font = '9px Manrope, sans-serif';
        ctx.fillStyle = P2D.sub;
        ctx.fillText(banner.sub, cx, cy + 8);
      }
    }
  }

  // ── sheet dressing (title block, north arrow, live scale bar) ──
  paintDressing(ctx, cam, W, H);
}