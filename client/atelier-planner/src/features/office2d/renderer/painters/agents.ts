import { MEETING_ANCHOR } from '../../../canvas/architecture/SpatialConfig';
import { P2D, STATUS_2D } from '../theme';
import type { Camera2D } from '../Camera2D';
import type { Office2DFrame, Agent2D } from '../../types';

/** ── Phase 14.5 — Munder Difflin-style blob avatars + live agents ─────────
 *  The agent vocabulary follows the munderdiffl.in reference: each employee
 *  is a rounded blob-avatar with a FACE (eyes + mouth expressions that change
 *  with status), rendered in their department colour, with a name + status
 *  pill below. "Animal Crossing meets Earthbound" applied to our warm
 *  architectural plan — playful characters on a serious sheet.
 *
 *  DETERMINISTIC: each agent's blob shape is seeded from their ID, so the same
 *  employee is always the same creature with the same slight shape variance
 *  (Blobatar's core idea, drawn natively in canvas 2D — zero dependencies
 *  added to the locked stack).
 *
 *  This module owns ZERO application state. The only module-level caches are
 *  the seeded shape table + a movement tracker (last position + heading per
 *  agent) used purely to derive facing and motion streaks for walkers. The
 *  tracker is pruned to live ids each call, so deleted agents can never leave
 *  ghosts behind.
 *
 *  Vocabulary: seeded blob body (superellipse) · status face · dept ring
 *  (§18 — accents only, never a repaint) · status badge on the ring · seated
 *  aura = the workstation state mirror (§16) · motion streak + heading for
 *  walkers · meeting-room halo when ≥2 gather (§13) · name + status pill at
 *  readable zoom. Everything drawn OUTSIDE a glyph's own scale(k) transform
 *  (halo, streak, pill) uses screen px — lw() is for world-unit strokes. */

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

/** '#RRGGBB' → 'rgba(r,g,b,a)' (STATUS_2D / DEPT_2D are all 6-digit hex). */
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Deterministic seeded RNG from a string (agent id). Same id → same blob
 *  shape variance forever — the Blobatar guarantee. */
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

/** Per-agent blob shape params — seeded once, cached by id. */
interface BlobShape {
  wv: number;     // body half-width variance (±15%)
  hv: number;     // body half-height variance (±10%)
  round: number;  // 0.55…1 → superellipse exponent 2…5 (≈circle at 1)
  squash: number; // face-plate horizontal squash
}
const shapeCache = new Map<string, BlobShape>();
function blobShape(id: string): BlobShape {
  let s = shapeCache.get(id);
  if (!s) {
    const rnd = seedFrom(id);
    s = {
      wv: 0.85 + rnd() * 0.3,
      hv: 0.9 + rnd() * 0.2,
      round: 0.55 + rnd() * 0.45,
      squash: 0.95 + rnd() * 0.1,
    };
    shapeCache.set(id, s);
  }
  return s;
}

/** Movement tracker — heading derivation for walking agents. */
const track = new Map<string, { x: number; z: number; hx: number; hz: number }>();

/** Rounded-rect path (hand-rolled — ctx.roundRect is not universal). */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** ── FACE (the Munder Difflin vocabulary) ──
 *  Eyes + mouth expressions that change with status. Drawn in the blob's local
 *  frame (top-down: the face looks at the viewer). Every feature size is a
 *  fraction of the face-plate radius rp, so a face reads identically on every
 *  blob however its seeded size varies. */
function drawFace(
  ctx: CanvasRenderingContext2D, k: number, status: string, t: number, rp: number,
): void {
  const ink = P2D.ink;
  const eyeY = -0.18 * rp;
  const eyeDX = 0.36 * rp;
  const eyeR = 0.18 * rp;
  const mouthY = 0.34 * rp;
  const mouthW = 0.50 * rp;

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';

  const st = status;
  const blink = Math.sin(t * 2.5) > 0.985; // occasional natural blink

  // ── EYES ──
  if (st === 'celebrate' || blink) {
    // Happy closed eyes ^^ (arc centred BELOW the eye → ∩ shape)
    for (const ex of [-eyeDX, eyeDX]) {
      ctx.lineWidth = lw(k, 1.5);
      ctx.beginPath();
      ctx.arc(ex, eyeY + eyeR * 0.3, eyeR * 1.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (st === 'working') {
    // Focused — slightly narrowed
    for (const ex of [-eyeDX, eyeDX]) {
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeR * 0.7, eyeR * 1.05, 0, 0, TAU);
      ctx.fill();
    }
  } else if (st === 'error') {
    // Worried — wide eyes under angled brows
    for (const ex of [-eyeDX, eyeDX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR * 1.15, 0, TAU);
      ctx.fill();
    }
    ctx.lineWidth = lw(k, 1.8);
    for (const [ex, dir] of [[-eyeDX, 1], [eyeDX, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(ex - eyeR * 1.3, eyeY - eyeR * 1.9);
      ctx.lineTo(ex + eyeR * 1.3, eyeY - eyeR * 1.9 + dir * eyeR * 0.7);
      ctx.stroke();
    }
  } else if (st === 'waiting') {
    // Looking up — the pupil sits higher in the eye
    for (const ex of [-eyeDX, eyeDX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY - eyeR * 0.45, eyeR, 0, TAU);
      ctx.fill();
    }
  } else {
    // Neutral — idle / walking: round eyes
    for (const ex of [-eyeDX, eyeDX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, TAU);
      ctx.fill();
    }
  }

  // ── MOUTH ──
  ctx.lineWidth = lw(k, 1.8);
  if (st === 'working') {
    // Small "o" — typing focus
    ctx.beginPath();
    ctx.arc(0, mouthY, eyeR * 0.75, 0, TAU);
    ctx.stroke();
  } else if (st === 'error') {
    // Frown (arc centred BELOW the mouth → ∩ shape)
    ctx.beginPath();
    ctx.arc(0, mouthY + eyeR * 1.1, mouthW * 0.8, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  } else if (st === 'celebrate') {
    // Big happy smile (arc centred ABOVE the mouth → ∪ shape)
    ctx.beginPath();
    ctx.arc(0, mouthY - eyeR * 0.5, mouthW, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else if (st === 'waiting') {
    // Small "o" — patient
    ctx.beginPath();
    ctx.arc(0, mouthY, eyeR * 0.6, 0, TAU);
    ctx.stroke();
  } else {
    // Gentle smile — idle, walking
    ctx.beginPath();
    ctx.arc(0, mouthY - eyeR * 0.3, mouthW * 0.85, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

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

/** Seated workstation aura (§16) — the occupied-desk state mirror: a glow in
 *  the agent's status colour; working = rotating dashed shimmer arc. Drawn
 *  inside the glyph's scale(k) frame, so lw() is correct here. */
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

/** One blob-avatar glyph — the Munder Difflin vocabulary on our plan.
 *  Local frame: translate(item pos) · scale(k). The body is a seeded
 *  superellipse blob, the face carries the status expression, the dept ring
 *  surrounds it and the status badge rides the ring's top-right. */
function agentGlyph(
  ctx: CanvasRenderingContext2D, k: number, a: Agent2D, f: Office2DFrame,
  heading: { hx: number; hz: number } | null,
): void {
  const st = a.status ?? 'idle';
  const stCol = statusColor(a);
  const dept = deptColor(a.role);
  const selected = f.selectedId === a.id;
  const hovered = f.hoveredId === a.id;
  const full = k >= 5;
  const shape = blobShape(a.id);

  // Selection / hover ring — accent, dashed (mirrors the 3D selection ring)
  if (selected || hovered) {
    ctx.strokeStyle = selected ? P2D.accent : rgba(P2D.accent, 0.6);
    ctx.lineWidth = lw(k, selected ? 2.4 : 1.8);
    ctx.setLineDash([lw(k, 4), lw(k, 3)]);
    ctx.beginPath(); ctx.arc(0, 0, 0.58, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Department ring (§18) — accents only, never a repaint
  ctx.strokeStyle = dept;
  ctx.lineWidth = lw(k, selected || hovered ? 2.2 : 1.6);
  ctx.beginPath(); ctx.arc(0, 0, 0.46, 0, TAU); ctx.stroke();

  if (a.seated) seatedAura(ctx, k, st, stCol, f.t);

  if (!full) {
    // Diagram pass — status disc inside the dept ring; sprawl stays readable
    ctx.fillStyle = stCol;
    ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, TAU); ctx.fill();
    ctx.strokeStyle = dept; ctx.lineWidth = lw(k, 1.2); ctx.stroke();
    return;
  }

  // ── ground shadow (drawn before the body, never rotated with it) ──
  ctx.fillStyle = 'rgba(60, 40, 20, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 0.15, 0.34 * shape.wv, 0.21 * shape.hv, 0, 0, TAU);
  ctx.fill();

  // ── BLOB BODY — seeded superellipse, leaning into travel ──
  const bw = 0.38 * shape.wv;
  const bh = 0.40 * shape.hv;
  if (!a.seated && heading) ctx.rotate(Math.atan2(heading.hz, heading.hx) * 0.08);
  const bob = st === 'walking' ? Math.sin(f.t * 8) * 0.02 : 0; // walking bob

  const n = 2 + (1 - shape.round) * 3; // rounder blob → closer to a circle
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const ang = (i / 32) * TAU;
    const lx = bw * Math.sign(Math.cos(ang)) * Math.pow(Math.abs(Math.cos(ang)), 2 / n);
    const ly = (bh + bob) * Math.sign(Math.sin(ang)) * Math.pow(Math.abs(Math.sin(ang)), 2 / n);
    if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
  }
  ctx.closePath();

  // Body fill — department colour, vertical gradient for depth
  const bodyGrad = ctx.createLinearGradient(0, -bh, 0, bh);
  bodyGrad.addColorStop(0, rgba(dept, 0.95));
  bodyGrad.addColorStop(1, rgba(dept, 0.75));
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = P2D.ink;
  ctx.lineWidth = lw(k, 1.4);
  ctx.stroke();

  // ── FACE PLATE (light disc) + FACE (status expression) ──
  const rp = bw * 0.72;
  ctx.beginPath();
  ctx.ellipse(0, 0, rp * shape.squash, rp, 0, 0, TAU);
  ctx.fillStyle = rgba('#F7F1E6', 0.92);
  ctx.fill();
  drawFace(ctx, k, st, f.t, rp);

  // ── status badge riding the dept ring (error hard-blinks) ──
  if (st !== 'error' || Math.sin(f.t * 7) > 0) {
    ctx.fillStyle = stCol;
    ctx.beginPath(); ctx.arc(0.325, -0.325, 0.08, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#F1E7D8'; ctx.lineWidth = lw(k, 1); ctx.stroke();
  }
  if (st === 'working') { // typing shimmer around the badge
    ctx.setLineDash([lw(k, 2.5), lw(k, 2.5)]);
    ctx.lineDashOffset = -f.t * lw(k, 8);
    ctx.strokeStyle = stCol; ctx.lineWidth = lw(k, 1.2);
    ctx.beginPath(); ctx.arc(0.325, -0.325, 0.15, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Name + status pill below the avatar (Munder Difflin style: "Alice /
 *  WORKING"). Screen space — always crisp, never scaled by the camera. */
function drawNamePill(
  ctx: CanvasRenderingContext2D, k: number, a: Agent2D, sx: number, sy: number,
): void {
  if (k < 6) return; // pill only at readable zoom

  const st = a.status ?? 'idle';
  const stCol = statusColor(a);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 9px Archivo, sans-serif';
  const nameW = ctx.measureText(a.name).width;
  const stText = st.toUpperCase();
  ctx.font = '600 7px Manrope, sans-serif';
  const stW = ctx.measureText(stText).width;

  const pillW = Math.max(nameW, stW * 0.9) + 18;
  const pillH = 22;
  const px = sx - pillW / 2;
  const py = sy + 0.58 * k + 4;

  ctx.fillStyle = 'rgba(241, 231, 216, 0.92)'; // pill plate
  ctx.strokeStyle = P2D.ink;
  ctx.lineWidth = 0.8;
  rrect(ctx, px, py, pillW, pillH, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = stCol; // status dot in the pill
  ctx.beginPath(); ctx.arc(px + 8, py + pillH / 2, 3, 0, TAU); ctx.fill();

  ctx.fillStyle = P2D.label; // name (bold) over status (light)
  ctx.font = '700 9px Archivo, sans-serif';
  ctx.fillText(a.name, px + pillW / 2 + 4, py + 8);
  ctx.fillStyle = rgba(stCol, 0.9);
  ctx.font = '600 7px Manrope, sans-serif';
  ctx.fillText(stText, px + pillW / 2 + 4, py + 16);
}

/** The live layer — meeting halo, motion streaks, blob avatars, name pills.
 *  Called from architecture() AFTER the wall poché (people read on top of the
 *  plan), BEFORE the vignette. Everything here is SCREEN space, so halo /
 *  streak strokes use literal px — lw() is only for the scaled glyph frame. */
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
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }

  const showPills = k >= 6; // pill metrics are skipped when too zoomed out

  for (const a of f.agents) {
    const sx = cam.toScreenX(a.x), sy = cam.toScreenY(a.z);
    if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) continue;

    // heading + motion from the tracker
    const prev = track.get(a.id);
    let hx = prev?.hx ?? 0, hz = prev?.hz ?? -1, moving = false;
    if (prev) {
      const dx = a.x - prev.x, dz = a.z - prev.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.004) { hx = dx / d; hz = dz / d; moving = true; }
    }
    track.set(a.id, { x: a.x, z: a.z, hx, hz });

    // motion streak — reads as direction + speed while walking. Anchored
    // BEHIND the blob body (which spans ~0.42·k px) so the bigger 14.5
    // avatar can never swallow the trail: it emerges from the back edge
    // and fades out at ~1.1·k px.
    if (moving && !a.seated) {
      const x0 = sx - hx * 0.38 * k, y0 = sy - hz * 0.38 * k;
      const x1 = sx - hx * 1.1 * k, y1 = sy - hz * 1.1 * k;
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, rgba(statusColor(a), 0.45));
      g.addColorStop(1, rgba(statusColor(a), 0));
      ctx.strokeStyle = g; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // glyph (blob avatar) — the only drawing inside a scale(k) frame
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(k, k);
    agentGlyph(ctx, k, a, f, prev ? { hx, hz } : null);
    ctx.restore();

    // name + status pill (screen space — always readable)
    if (showPills) drawNamePill(ctx, k, a, sx, sy);
  }
}