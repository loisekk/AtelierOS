import { P2D, STATUS_2D } from '../renderer/theme';
import type { Agent2D } from '../types';

/** ── Phase 18 — blob-avatar texture rendering (Munder Difflin vocabulary,
 *  re-derived self-contained — no dependency on the canvas painters) ──
 *  Each agent is a seeded blob body + status face + dept ring, rendered ONCE
 *  per (id, status) into a canvas and registered as a Phaser texture.
 *  Deterministic: same id → same creature forever (Blobatar guarantee). */

const TAU = Math.PI * 2;

/** Department identity (§18) — verified values from the 14.5 acceptance run. */
const DEPT_2D: Record<string, string> = {
  frontend: '#D49B3B', backend: '#D49B3B', qa: '#C75D3F',
  research: '#9B5FD4', design: '#C2419A',
  operations: '#0EA5E9', ops: '#0EA5E9', marketing: '#D4A537',
};
export const deptColor = (role?: string): string =>
  DEPT_2D[(role ?? '').toLowerCase()] ?? P2D.accent;
export const statusColor = (a: Agent2D): string =>
  STATUS_2D[a.status ?? 'idle'] ?? STATUS_2D.idle;

/** Canvas px size for one glyph — represents 0.94 world units (~160 px/u:
 *  crisp past max zoom 60 × DPR 2 ≈ 120 px/u). */
export const AVATAR_TEX = 152;

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

function drawFace(ctx: CanvasRenderingContext2D, k: number, st: string): void {
  const ink = P2D.ink;
  const eyeY = -0.08 * k, eyeDX = 0.12 * k, eyeR = 0.055 * k;
  const mouthY = 0.10 * k, mouthW = 0.16 * k;
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.5; ctx.lineCap = 'round';

  if (st === 'celebrate') {
    for (const ex of [-eyeDX, eyeDX]) { ctx.beginPath(); ctx.arc(ex, eyeY, eyeR * 1.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  } else if (st === 'working') {
    for (const ex of [-eyeDX, eyeDX]) { ctx.beginPath(); ctx.ellipse(ex, eyeY, eyeR * 0.7, eyeR, 0, 0, TAU); ctx.fill(); }
  } else if (st === 'error') {
    for (const ex of [-eyeDX, eyeDX]) { ctx.beginPath(); ctx.arc(ex, eyeY, eyeR * 1.2, 0, TAU); ctx.fill(); }
    ctx.lineWidth = 1.8;
    for (const [ex, dir] of [[-eyeDX, 1], [eyeDX, -1]] as const) {
      ctx.beginPath(); ctx.moveTo(ex - eyeR * 1.3, eyeY - eyeR * 1.8);
      ctx.lineTo(ex + eyeR * 1.3, eyeY - eyeR * 1.8 + dir * eyeR * 0.6); ctx.stroke();
    }
  } else if (st === 'waiting') {
    for (const ex of [-eyeDX, eyeDX]) { ctx.beginPath(); ctx.arc(ex, eyeY - eyeR * 0.5, eyeR, 0, TAU); ctx.fill(); }
  } else {
    for (const ex of [-eyeDX, eyeDX]) { ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, TAU); ctx.fill(); }
  }

  ctx.lineWidth = 1.8;
  if (st === 'working' || st === 'waiting') {
    ctx.beginPath(); ctx.arc(0, mouthY, eyeR * (st === 'working' ? 0.8 : 0.6), 0, TAU); ctx.stroke();
  } else if (st === 'error') {
    ctx.beginPath(); ctx.arc(0, mouthY + eyeR * 1.2, mouthW * 0.7, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  } else if (st === 'celebrate') {
    ctx.beginPath(); ctx.arc(0, mouthY - eyeR * 0.5, mouthW, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, mouthY - eyeR * 0.3, mouthW * 0.8, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  }
}

/** One full glyph into a fresh AVATAR_TEX canvas. */
export function renderBlobAvatar(a: Agent2D): HTMLCanvasElement {
  const S = AVATAR_TEX;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.translate(S / 2, S / 2);
  const k = S / 0.94; // px per world unit — all glyph numbers are world units

  const dept = deptColor(a.role);
  const stCol = statusColor(a);

  // dept ring
  ctx.strokeStyle = dept; ctx.lineWidth = 1.9;
  ctx.beginPath(); ctx.arc(0, 0, 0.40 * k, 0, TAU); ctx.stroke();

  // ground shadow
  ctx.fillStyle = 'rgba(60, 40, 20, 0.15)';
  ctx.beginPath(); ctx.ellipse(0, 0.07 * k, 0.30 * k, 0.20 * k, 0, 0, TAU); ctx.fill();

  // seeded blob body (superellipse)
  const rnd = seedFrom(a.id);
  const wv = 0.85 + rnd() * 0.3, hv = 0.9 + rnd() * 0.2, n = 3 + rnd() * 2.5;
  const bw = 0.34 * wv * k, bh = 0.36 * hv * k;
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const ang = (i / 32) * TAU;
    const cx = bw * Math.sign(Math.cos(ang)) * Math.pow(Math.abs(Math.cos(ang)), 2 / n);
    const cy = bh * Math.sign(Math.sin(ang)) * Math.pow(Math.abs(Math.sin(ang)), 2 / n);
    if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, -bh, 0, bh);
  grad.addColorStop(0, dept); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.9; ctx.fillStyle = dept; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = P2D.ink; ctx.lineWidth = 1.4; ctx.stroke();

  // face plate
  ctx.beginPath(); ctx.arc(0, 0, bw * 0.62, 0, TAU);
  ctx.fillStyle = 'rgba(247, 241, 230, 0.92)'; ctx.fill();

  drawFace(ctx, k, a.status ?? 'idle');

  // status dot
  ctx.fillStyle = stCol;
  ctx.beginPath(); ctx.arc(0.34 * k, -0.34 * k, 0.07 * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#F1E7D8'; ctx.lineWidth = 1; ctx.stroke();
  return c;
}

/** Dashed status-aura ring (world r 0.85) — rotated/pulsed per status. */
export function renderAura(stCol: string): HTMLCanvasElement {
  const S = 160;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const k = S / 1.9;
  ctx.strokeStyle = stCol; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.75;
  const r = 0.85 * k;
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * TAU, a1 = a0 + (TAU / 14) * 0.6;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, r, a0, a1); ctx.stroke();
  }
  return c;
}