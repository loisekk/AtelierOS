import { ROOM_ZONES, BOUNDS, BRAIN_ANCHOR } from '../../../canvas/architecture/SpatialConfig';
import { roomBannerFor } from '../../../canvas/architecture/roomLabels';
import { P2D, ROOM_FLOOR_2D } from '../theme';
import type { Camera2D } from '../Camera2D';
import type { Office2DFrame } from '../../types';

/** Brain rotunda — measured GLB geometry (BRAIN_ANCHOR + outer ring R≈6.1),
 *  NOT the zone rect: the rect's center sits inside the rotunda wall and must
 *  never be used for anything anchored (SpatialConfig's own warning). */
const ROTUNDA_R = 6.1;

/** Architecture layer — warm illustrated plan: paper, world-aligned drafting
 *  grid, per-room floor tints, ink room outlines, banner labels, and the
 *  circular brain chamber. Pure draw — reads state, writes nothing. */
export function paintArchitecture(ctx: CanvasRenderingContext2D, cam: Camera2D, f: Office2DFrame): void {
  const W = cam.width, H = cam.height;

  // ── Paper + drafting grid (world-aligned → pans with the plan) ──
  ctx.fillStyle = P2D.paper;
  ctx.fillRect(0, 0, W, H);
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

  // ── Building envelope — thick ink outline ──
  ctx.strokeStyle = P2D.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(
    cam.toScreenX(BOUNDS.minX), cam.toScreenY(BOUNDS.minZ),
    (BOUNDS.maxX - BOUNDS.minX) * cam.scale, (BOUNDS.maxZ - BOUNDS.minZ) * cam.scale,
  );

  // ── Room floors + inner walls (brain chamber drawn as rotunda below) ──
  for (const z of ROOM_ZONES) {
    if (z.id === 'brain_chamber') continue;
    const x0 = cam.toScreenX(z.minX), y0 = cam.toScreenY(z.minZ);
    const w = (z.maxX - z.minX) * cam.scale, h = (z.maxZ - z.minZ) * cam.scale;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ROOM_FLOOR_2D[z.id] ?? '#C7A98D';
    ctx.fillRect(x0, y0, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = P2D.ink;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x0, y0, w, h);
  }

  // ── CEO Brain rotunda — circular chamber, concentric rings, violet core ──
  const bx = cam.toScreenX(BRAIN_ANCHOR.x), by = cam.toScreenY(BRAIN_ANCHOR.z);
  const r = ROTUNDA_R * cam.scale;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = ROOM_FLOOR_2D.brain_chamber;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = P2D.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = P2D.inkSoft; ctx.lineWidth = 1;
  for (const k of [0.78, 0.5]) {
    ctx.beginPath(); ctx.arc(bx, by, r * k, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = P2D.brainCore; // 14.4: pulse from live Brain state
  ctx.beginPath(); ctx.arc(bx, by, Math.max(3, r * 0.22), 0, Math.PI * 2); ctx.fill();

  // ── Room labels — banner text, fixed screen size, zoom-gated subtitles ──
  if (f.labelsVisible) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const z of ROOM_ZONES) {
      const banner = roomBannerFor(z.id);
      const cx = cam.toScreenX((z.minX + z.maxX) / 2);
      const cy = cam.toScreenY(z.id === 'brain_chamber' ? z.minZ + 1.2 : (z.minZ + z.maxZ) / 2);
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
}
