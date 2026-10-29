/** ── Plan geometry (v2 sheet) ──────────────────────────────────────────
 *  Derives the architectural plan the premium painter draws — wall runs,
 *  doorway gaps and the CEO rotunda — from SpatialConfig (the 3D's spatial
 *  truth), NOT from hand-drawn rectangles:
 *
 *    · envelope walls  = BOUNDS
 *    · interior walls  = shared boundaries between adjacent ROOM_ZONES
 *                        (facing edges within 0.6 u merge into one wall —
 *                        the 0.5 u corridor gaps collapse to the midline)
 *    · rotunda         = circle at BRAIN_ANCHOR (GLB-measured), which also
 *                        PUNCHES OPENINGS through any wall it crosses
 *                        (the x=−10 run splits around the chamber mouth)
 *    · doorways        = WAYPOINTS *_door anchors projected onto their
 *                        nearest wall + the reception gate on the east
 *                        envelope (aligned with EGRESS_POINTS[3])
 *
 *  Pure data, deterministic, memoized (SpatialConfig is immutable). When a
 *  real-GLB PlanExtractor (probeFloorPlan) lands later it can replace this
 *  module's body — the painter only consumes the WallSeg[] shape.
 *
 *  NEW FILE — office2d/phaser/premium/planGeometry.ts */

import { BOUNDS, ROOM_ZONES, WAYPOINTS, BRAIN_ANCHOR } from '../../../canvas/architecture/SpatialConfig';
import type { RoomZone } from '../../../canvas/architecture/SpatialConfig';

export interface DoorGap {
  /** Position of the door centre ALONG the wall run (world units). */
  at: number;
  /** Half-width of the opening (world units). */
  half: number;
}

export interface WallSeg {
  /** Run direction: 'x' = E–W (fixed z), 'z' = N–S (fixed x). */
  axis: 'x' | 'z';
  /** The fixed coordinate (z when axis='x', x when axis='z'). */
  at: number;
  /** Run extent [from…to] along the running axis. */
  from: number;
  to: number;
  /** Wall thickness (envelope thicker than interior). */
  t: number;
  doors: DoorGap[];
}

export interface PlanGeometry {
  rooms: RoomZone[];
  walls: WallSeg[];
}

/** GLB-measured rotunda (SpatialConfig chord/dais fits; OfficeScene parity). */
export const ROTUNDA = { cx: BRAIN_ANCHOR.x, cz: BRAIN_ANCHOR.z, rOuter: 6.1, rDais: 4.7 };

const EPS = 0.6;          // facing-edge tolerance → corridor gaps merge
const MIN_OVERLAP = 2;    // walls need ≥ 2 u of shared run
const ENV_T = 0.42;       // envelope wall thickness
const INT_T = 0.3;        // interior wall thickness
const DOOR_HALF = 0.85;   // standard door opening half-width
const ROT_CLEAR = 0.6;    // extra clearance carved around the rotunda

interface RawSeg { axis: 'x' | 'z'; at: number; from: number; to: number; env: boolean }

let cached: PlanGeometry | null = null;

export function computePlanGeometry(): PlanGeometry {
  if (cached) return cached;

  const raw: RawSeg[] = [
    { axis: 'x', at: BOUNDS.minZ, from: BOUNDS.minX, to: BOUNDS.maxX, env: true },
    { axis: 'x', at: BOUNDS.maxZ, from: BOUNDS.minX, to: BOUNDS.maxX, env: true },
    { axis: 'z', at: BOUNDS.minX, from: BOUNDS.minZ, to: BOUNDS.maxZ, env: true },
    { axis: 'z', at: BOUNDS.maxX, from: BOUNDS.minZ, to: BOUNDS.maxZ, env: true },
  ];

  // ── interior walls: every adjacent zone pair's facing edges ──
  for (let i = 0; i < ROOM_ZONES.length; i++) {
    for (let j = i + 1; j < ROOM_ZONES.length; j++) {
      const A = ROOM_ZONES[i]!, B = ROOM_ZONES[j]!;
      const xOverlap = Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX);
      const zOverlap = Math.min(A.maxZ, B.maxZ) - Math.max(A.minZ, B.minZ);
      // vertical boundary (wall running N–S) — A's east edge faces B's west edge
      if (Math.abs(A.maxX - B.minX) <= EPS && zOverlap >= MIN_OVERLAP) {
        raw.push({ axis: 'z', at: (A.maxX + B.minX) / 2, from: Math.max(A.minZ, B.minZ), to: Math.min(A.maxZ, B.maxZ), env: false });
      } else if (Math.abs(B.maxX - A.minX) <= EPS && zOverlap >= MIN_OVERLAP) {
        raw.push({ axis: 'z', at: (B.maxX + A.minX) / 2, from: Math.max(A.minZ, B.minZ), to: Math.min(A.maxZ, B.maxZ), env: false });
      }
      // horizontal boundary (wall running E–W)
      if (Math.abs(A.maxZ - B.minZ) <= EPS && xOverlap >= MIN_OVERLAP) {
        raw.push({ axis: 'x', at: (A.maxZ + B.minZ) / 2, from: Math.max(A.minX, B.minX), to: Math.min(A.maxX, B.maxX), env: false });
      } else if (Math.abs(B.maxZ - A.minZ) <= EPS && xOverlap >= MIN_OVERLAP) {
        raw.push({ axis: 'x', at: (B.maxZ + A.minZ) / 2, from: Math.max(A.minX, B.minX), to: Math.min(A.maxX, B.maxX), env: false });
      }
    }
  }

  // ── merge runs that share a line (same axis + at) ──
  const byLine = new Map<string, { axis: 'x' | 'z'; at: number; env: boolean; runs: [number, number][] }>();
  for (const s of raw) {
    const key = `${s.axis}:${s.at.toFixed(2)}`;
    const entry = byLine.get(key) ?? { axis: s.axis, at: s.at, env: s.env, runs: [] };
    entry.env = entry.env || s.env;
    entry.runs.push([s.from, s.to]);
    byLine.set(key, entry);
  }

  const walls: WallSeg[] = [];
  for (const line of byLine.values()) {
    line.runs.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const run of line.runs) {
      const last = merged[merged.length - 1];
      if (last && run[0] - last[1] <= EPS) last[1] = Math.max(last[1], run[1]);
      else merged.push([run[0], run[1]]);
    }
    for (const [from, to] of merged) {
      for (const part of splitByRotunda(line.axis, line.at, from, to)) {
        walls.push({ axis: line.axis, at: line.at, from: part[0], to: part[1], t: line.env ? ENV_T : INT_T, doors: [] });
      }
    }
  }

  carveDoors(walls);
  walls.sort((a, b) => (a.axis === b.axis ? a.at - b.at : a.axis < b.axis ? -1 : 1));

  cached = { rooms: ROOM_ZONES, walls };
  return cached;
}

/** Remove the chord the rotunda punches through a wall run — the chamber
 *  mouth (x=−10, z −6.3…5.7) becomes an open connection, matching the 3D.
 *  Wall ends land exactly ON the ring circle (no overlap, no gap). */
function splitByRotunda(axis: 'x' | 'z', at: number, from: number, to: number): [number, number][] {
  const d = axis === 'x' ? Math.abs(ROTUNDA.cz - at) : Math.abs(ROTUNDA.cx - at);
  if (d >= ROTUNDA.rOuter + ROT_CLEAR) return [[from, to]];
  const half = Math.sqrt(Math.max(0, ROTUNDA.rOuter * ROTUNDA.rOuter - d * d)) + 0.05;
  const c = axis === 'x' ? ROTUNDA.cx : ROTUNDA.cz;
  const a = c - half, b = c + half;
  const out: [number, number][] = [];
  if (from < a) out.push([from, Math.min(to, a)]);
  if (to > b) out.push([Math.max(from, b), to]);
  return out.filter(([f, t]) => t - f >= 0.8); // no slivers
}

/** Carve doorways: every WAYPOINTS *_door anchor projects onto its nearest
 *  wall (≤ 3 u away). ceo_door intentionally finds none — the rotunda
 *  mouth IS the brain chamber entrance. The reception gate is carved on the
 *  east envelope at z=−3 (EGRESS_POINTS[3] alignment). */
function carveDoors(walls: WallSeg[]): void {
  const doors = Object.entries(WAYPOINTS)
    .filter(([k]) => k.endsWith('_door'))
    .map(([, v]) => ({ x: v[0], z: v[2] }));

  for (const d of doors) {
    let best: WallSeg | null = null;
    let bestDist = Infinity;
    let proj = 0;
    for (const w of walls) {
      const along = w.axis === 'x' ? d.x : d.z;
      const clamped = Math.max(w.from, Math.min(w.to, along));
      const dx = w.axis === 'x' ? d.x - clamped : d.x - w.at;
      const dz = w.axis === 'x' ? d.z - w.at : d.z - clamped;
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist) { bestDist = dist; best = w; proj = clamped; }
    }
    if (best && bestDist <= 3) {
      const lo = best.from + DOOR_HALF + 0.35;
      const hi = best.to - DOOR_HALF - 0.35;
      if (hi > lo) best.doors.push({ at: Math.max(lo, Math.min(hi, proj)), half: DOOR_HALF });
    }
  }

  const east = walls.find(w => w.axis === 'z' && w.at === BOUNDS.maxX);
  if (east) east.doors.push({ at: -3, half: 1.1 }); // reception gate (double door)
}
