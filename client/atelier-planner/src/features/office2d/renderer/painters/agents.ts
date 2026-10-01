import { MEETING_ANCHOR } from '../../../canvas/architecture/SpatialConfig';
import { P2D, STATUS_2D } from '../theme';
import type { Camera2D } from '../Camera2D';
import type { Office2DFrame, Agent2D } from '../../types';

/** ── Phase 14.4 — live agents & Brain (the LIVE layer of the 2D plan) ──────
 *  Everything here is a per-frame PROJECTION of the running simulation:
 *  positions/statuses arrive from the engine snapshot (real world coords,
 *  refreshed every rAF), Brain activity from app state (frame.brainActive).
 *  This module owns ZERO application state — the only module-level cache is
 *  a movement tracker (last position + heading per agent) used purely to
 *  derive facing and motion streaks for walkers. Pruned to live ids each
 *  call, so deleted agents can never leave ghosts behind.
 *
 *  Vocabulary (spec §14): top-down silhouette (shoulders + head), dept ring
 *  (§18 — accents only, never a repaint), status dot with per-status
 *  animation, seated aura = the workstation state mirror (§16), motion
 *  streak + heading for walkers, meeting-room halo when ≥2 gather (§13),
 *  name at high zoom / initials at mid zoom. */

const TAU = Math.PI * 2;
const lw = (k: number, px: number): number => px / k;

/** Department identity (§18): Engineering amber · QA red-orange · Research
 *  purple · Design magenta · Operations cyan · Marketing gold. */
const DEPT_2D: Record<string, string> = {
  frontend: '#D49B3B', backend: '#D49B3B', qa: '#C75D3F',
  research: '#9B5FD4', design: '#C2419A',
  operations: '#0EA5E9', ops: '#0EA5E9', marketing: '#D4A537',
};
const deptColor = (role?: string): string =>
  DEPT_2D[(role ?? '').toLowerCase()] ?? P2D.accent;

const statusColor = (a: Agent2D): string =>
  STATUS_2D[a.status ?? 'idle'] ?? STATUS_2D.idle;

const initials = (name: string): string =>
  name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

/** '#RRGGBB' → 'rgba(r,g,b,a)' (STATUS_2D / DEPT_2D are all 6-digit hex). */
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Movement tracker — heading derivation for walking agents. */
const track = new Map<string, { x: number; z: number; hx: number; hz: number }>();

/** ── CEO Brain core (§19) — replaces the static violet disc. Idle = slow
 *  breath; active = faster pulse + orbiting neural dots + dispatch rings. */
export function paintBrain(
  ctx: CanvasRenderingContext2D, bx: number, by: number, r: number, f: Office2DFrame,
): void {
  const t = f.t;
  const active = f.brainActive;
  const breathe = 1 + Math.sin(t * (active ? 4.2 : 1.2)) * (active ? 0.10 : 0.04);

  const halo = ctx.createRadialGradient(bx, by, r * 0.05, bx, by, r * 0.62);
  halo.addColorStop(0, active ? 'rgba(167, 95, 255, 0.50)' : 'rgba(167, 95, 255, 0.20)');
  halo.addColorStop(1, 'rgba(167, 95, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(bx, by, r * 0.62, 0, TAU); ctx.fill();

  const cr = Math.max(3, r * 0.22) * breathe;
  ctx.fillStyle = P2D.brainCore;
  ctx.beginPath(); ctx.arc(bx, by, cr, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(241, 231, 216, 0.85)';
  ctx.beginPath(); ctx.arc(bx, by, cr * 0.42, 0, TAU); ctx.fill();

  if (active) {
    for (let i = 0; i < 3; i++) {
      const a = t * 1.7 + (i * TAU) / 3;
      ctx.fillStyle = i === 1 ? '#5FE7F2' : '#C89BFF';
      ctx.beginPath();
      ctx.arc(bx + Math.cos(a) * r * 0.40, by + Math.sin(a) * r * 0.40, Math.max(1.5, r * 0.045), 0, TAU);
      ctx.fill();
    }
    const ph = (t * 0.9) % 1; // dispatch pulse — expanding, fading ring
    ctx.strokeStyle = `rgba(167, 95, 255, ${0.5 * (1 - ph)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, cr + ph * r * 0.35, 0, TAU); ctx.stroke();
  }
}

/** Seated workstation aura (§16) — the occupied-desk state mirror: glow in
 *  the agent's status colour, working = rotating shimmer arc. */
function seatedAura(ctx: CanvasRenderingContext2D, k: number, st: string, stCol: string, t: number): void {
  const R = 1.05;
  const g = ctx.createRadialGradient(0, 0, 0.1, 0, 0, R);
  g.addColorStop(0, rgba(stCol, st === 'error' ? 0.30 : 0.24));
  g.addColorStop(1, rgba(stCol, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();

  if (st === 'working') {
    ctx.setLineDash([lw(k, 5), lw(k, 4)]);
    ctx.lineDashOffset = -t * lw(k, 10);
    ctx.strokeStyle = rgba(stCol, 0.75); ctx.lineWidth = lw(k, 1.6);
    ctx.beginPath(); ctx.arc(0, 0, 0.85, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  } else if (st === 'waiting') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    ctx.strokeStyle = rgba(stCol, 0.3 + 0.4 * pulse); ctx.lineWidth = lw(k, 1.4);
    ctx.beginPath(); ctx.arc(0, 0, 0.85, 0, TAU); ctx.stroke();
  }
}

/** Status dot (top-right of the glyph) — one animation per status. */
function statusDot(ctx: CanvasRenderingContext2D, k: number, st: string, stCol: string, t: number): void {
  if (st === 'error' && Math.sin(t * 7) < 0) return; // hard blink
  ctx.globalAlpha = st === 'waiting' ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2)) : 1;
  ctx.fillStyle = stCol;
  ctx.beginPath(); ctx.arc(0.34, -0.32, 0.085, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#F1E7D8'; ctx.lineWidth = lw(k, 1); ctx.stroke();
  ctx.globalAlpha = 1;

  if (st === 'working') { // typing shimmer
    ctx.setLineDash([lw(k, 2.5), lw(k, 2.5)]);
    ctx.lineDashOffset = -t * lw(k, 8);
    ctx.strokeStyle = stCol; ctx.lineWidth = lw(k, 1.2);
    ctx.beginPath(); ctx.arc(0.34, -0.32, 0.155, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  } else if (st === 'celebrate') { // expanding burst
    const ph = (t * 1.4) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.strokeStyle = stCol; ctx.lineWidth = lw(k, 1.4);
    ctx.beginPath(); ctx.arc(0.34, -0.32, 0.085 + ph * 0.28, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** One employee glyph. Local frame: translate(item pos) · scale(k) — no
 *  rotation (heading turns the BODY, not the label/dot). */
function agentGlyph(
  ctx: CanvasRenderingContext2D, k: number, a: Agent2D, f: Office2DFrame,
  heading: { hx: number; hz: number } | null,
): void {
  const st = a.status ?? 'idle';
  const stCol = statusColor(a);
  const selected = f.selectedId === a.id;
  const full = k >= 5;

  if (selected) { // 2D selection ring — mirrors the 3D ring (accent, dashed)
    ctx.strokeStyle = P2D.accent; ctx.lineWidth = lw(k, 2);
    ctx.setLineDash([lw(k, 4), lw(k, 3)]);
    ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = deptColor(a.role); // dept ring (§18)
  ctx.lineWidth = lw(k, selected ? 2.4 : 1.8);
  ctx.beginPath(); ctx.arc(0, 0, 0.38, 0, TAU); ctx.stroke();

  if (a.seated) seatedAura(ctx, k, st, stCol, f.t);

  if (!full) { // diagram pass — dept dot only, sprawl stays readable
    ctx.fillStyle = stCol;
    ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, TAU); ctx.fill();
    return;
  }

  ctx.fillStyle = 'rgba(60, 40, 20, 0.18)'; // ground shadow
  ctx.beginPath(); ctx.ellipse(0, 0.07, 0.30, 0.20, 0, 0, TAU); ctx.fill();

  if (a.seated) {
    // Seated at their desk centre — chair ring + compact body + head.
    ctx.strokeStyle = P2D.inkSoft; ctx.lineWidth = lw(k, 1.1);
    ctx.beginPath(); ctx.arc(0, 0, 0.31, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(77, 56, 42, 0.88)';
    ctx.beginPath(); ctx.ellipse(0, 0, 0.26, 0.19, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = P2D.ink; ctx.lineWidth = lw(k, 1); ctx.stroke();
    ctx.fillStyle = '#E6D5C2';
    ctx.beginPath(); ctx.arc(0, 0.02, 0.115, 0, TAU); ctx.fill();
    ctx.strokeStyle = P2D.ink; ctx.lineWidth = lw(k, 0.8); ctx.stroke();
  } else {
    // Standing/walking — body aligned to travel, head toward the destination.
    ctx.save();
    ctx.rotate(Math.atan2(heading?.hz ?? -1, heading?.hx ?? 0));
    ctx.fillStyle = 'rgba(77, 56, 42, 0.88)';
    ctx.beginPath(); ctx.ellipse(0, 0, 0.17, 0.26, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = P2D.ink; ctx.lineWidth = lw(k, 1); ctx.stroke();
    ctx.fillStyle = '#E6D5C2';
    ctx.beginPath(); ctx.arc(0.13, 0, 0.115, 0, TAU); ctx.fill();
    ctx.strokeStyle = P2D.ink; ctx.lineWidth = lw(k, 0.8); ctx.stroke();
    ctx.restore();
  }

  statusDot(ctx, k, st, stCol, f.t);
}
/** The live layer — meeting halo, motion streaks, glyphs, names.
 *  Called from architecture() AFTER the wall poché (people read on top of
 *  the plan), BEFORE the vignette. */
export function paintAgents(ctx: CanvasRenderingContext2D, cam: Camera2D, f: Office2DFrame): void {
  const k = cam.scale;
  const W = cam.width, H = cam.height;
  ctx.lineCap = 'round';

  // ── prune the movement tracker to live agents (no ghosts) ──
  const live = new Set(f.agents.map(a => a.id));
  for (const id of track.keys()) if (!live.has(id)) track.delete(id);

  // ── meeting-room halo (§13): ≥2 agents gathered at the table ──
  const meetN = f.agents.filter(a =>
    Math.hypot(a.x - MEETING_ANCHOR.x, a.z - MEETING_ANCHOR.z) < 2.6).length;
  if (meetN >= 2) {
    const mx = cam.toScreenX(MEETING_ANCHOR.x), my = cam.toScreenY(MEETING_ANCHOR.z);
    const R = 2.3 * k;
    const pulse = 0.5 + 0.5 * Math.sin(f.t * 2);
    const g = ctx.createRadialGradient(mx, my, R * 0.2, mx, my, R);
    g.addColorStop(0, `rgba(124, 58, 237, ${0.10 + 0.06 * pulse})`);
    g.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(124, 58, 237, ${0.35 + 0.25 * pulse})`;
    ctx.lineWidth = lw(k, 1.6);
    ctx.setLineDash([lw(k, 6), lw(k, 5)]);
    ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const a of f.agents) {
    const sx = cam.toScreenX(a.x), sy = cam.toScreenY(a.z);
    if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;

    // heading + motion from the tracker
    const prev = track.get(a.id);
    let hx = prev?.hx ?? 0, hz = prev?.hz ?? -1, moving = false;
    if (prev) {
      const dx = a.x - prev.x, dz = a.z - prev.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.004) { hx = dx / d; hz = dz / d; moving = true; }
    }
    track.set(a.id, { x: a.x, z: a.z, hx, hz });

    // motion streak — reads as direction + speed while walking
    if (moving && !a.seated) {
      const L = 0.5 * k;
      const g = ctx.createLinearGradient(sx, sy, sx - hx * L, sy - hz * L);
      g.addColorStop(0, rgba(statusColor(a), 0.40));
      g.addColorStop(1, rgba(statusColor(a), 0));
      ctx.strokeStyle = g; ctx.lineWidth = lw(k, 3);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - hx * L, sy - hz * L); ctx.stroke();
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(k, k);
    agentGlyph(ctx, k, a, f, moving ? { hx, hz } : (prev ? { hx, hz } : null));
    ctx.restore();

    // labels — initials at mid zoom, full name up close (screen space)
    if (k >= 6) {
      const label = k >= 9 ? a.name : initials(a.name);
      ctx.font = k >= 9 ? '700 10px Archivo, sans-serif' : '700 8px Archivo, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const ty = sy - 0.55 * k - 3;
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(241, 231, 216, 0.9)';
      ctx.strokeText(label, sx, ty);
      ctx.fillStyle = P2D.label;
      ctx.fillText(label, sx, ty);
    }
  }
}