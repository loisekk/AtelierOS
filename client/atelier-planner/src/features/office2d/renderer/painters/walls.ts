import { WAYPOINTS, BRAIN_ANCHOR } from '../../../canvas/architecture/SpatialConfig';
import { P2D } from '../theme';
import type { Camera2D } from '../Camera2D';

/** ── Phase 14.2 — wall & door model (computed ONCE, world units) ─────────
 *  Every wall is DERIVED from canonical data, never hand-placed:
 *    · envelope — inner faces flush with the ROOM_ZONES grid (±22.5 / ±16.5)
 *    · corridor strips — the real 0.5-unit gaps in ROOM_ZONES (z −8…−7.5, 7.5…8)
 *    · vertical partitions — shared zone boundaries (x −10, x 1, x 15)
 *    · rotunda ring — R 6.1 around BRAIN_ANCHOR (measured GLB geometry; the
 *      zone-rect center lands inside the wall and is never used for anchoring)
 *    · doors — real WAYPOINTS door anchors snapped to their wall + the +X
 *      reception gate (east face, per the v1.3 zone table & entrance axis)
 *  Documented gap (spec §26): windows are GLB-only detail — no semantic
 *  source exists, so the plan shows solid envelope walls. */

interface WallRun {
  axis: 'x' | 'z';             // direction the wall RUNS along
  at: number;                  // fixed coordinate (z for 'x', x for 'z')
  from: number; to: number;    // extent along the run
  thick: number;
}

interface DoorDef {
  axis: 'x' | 'z';
  at: number;                  // wall it belongs to (must match a WallRun)
  center: number;             // opening center along the run
  width: number;
  swing: 1 | -1;              // world side the leaf swings to (cross-axis sign)
  hinge: 1 | -1;              // hinge at center + hinge·width/2
  double?: boolean;
}

export const ROTUNDA_R = 6.1; // measured outer-ring radius (SpatialConfig chord fits)
const RING_T = 0.5;
const ROTUNDA_DOOR_W = 1.8;
const T = 0.6;                // envelope thickness
// envelope centerlines: inner faces flush with the zone grid
const ENV = { x: 22.8, z: 16.8 };

const WALLS: WallRun[] = [
  { axis: 'x', at: -ENV.z, from: -ENV.x, to: ENV.x, thick: T },
  { axis: 'x', at:  ENV.z, from: -ENV.x, to: ENV.x, thick: T },
  { axis: 'z', at: -ENV.x, from: -ENV.z, to: ENV.z, thick: T },
  { axis: 'z', at:  ENV.x, from: -ENV.z, to: ENV.z, thick: T },
  // corridor strips — the real 0.5u gaps between zone rows
  { axis: 'x', at: -7.75, from: -22.5, to: 22.5, thick: 0.5 },
  { axis: 'x', at:  7.75, from: -22.5, to: 22.5, thick: 0.5 },
  // vertical partitions (x=−10 gets clipped around the rotunda below)
  { axis: 'z', at: -10, from: -16.5, to: 16.5, thick: 0.5 },
  { axis: 'z', at:   1, from: -16.5, to: 16.5, thick: 0.5 },
  { axis: 'z', at:  15, from:  -7.5, to:  7.5, thick: 0.5 }, // meeting | reception only
];

// x=−10 pierces the rotunda ring — split it at the circle so the ring reads
// as the chamber wall (the partition continues past it, as in the GLB).
{
  const ringOuter = ROTUNDA_R + RING_T / 2;
  const dx = Math.abs(-10 - BRAIN_ANCHOR.x);
  const half = Math.sqrt(Math.max(0, ringOuter * ringOuter - dx * dx));
  const i = WALLS.findIndex(w => w.axis === 'z' && w.at === -10);
  WALLS.splice(i, 1,
    { axis: 'z', at: -10, from: -16.5, to: BRAIN_ANCHOR.z - half, thick: 0.5 },
    { axis: 'z', at: -10, from: BRAIN_ANCHOR.z + half, to: 16.5, thick: 0.5 });
}

const DOORS: DoorDef[] = [
  // office_door (−4.5, −6.2) → nearest wall: rear corridor (1.55u). Leaf
  // swings into office_floor (the larger room).
  { axis: 'x', at: -7.75, center: WAYPOINTS.office_door[0], width: 1.6, swing: -1, hinge: 1 },
  // meeting_door (2.5, 0) → nearest wall: x=1 partition (1.5u). Swings into
  // the meeting room.
  { axis: 'z', at: 1, center: WAYPOINTS.meeting_door[1], width: 1.6, swing: 1, hinge: 1 },
  // knowledge_door (1.5, 6.2) → PROJECTED onto the front corridor wall. The
  // nearest wall (x=1 at z 6.2, 0.5u) borders command|meeting — but the
  // corridor projection borders knowledge_hub, matching the anchor's name
  // and its path to knowledge_center (6, 12).
  { axis: 'x', at: 7.75, center: WAYPOINTS.knowledge_door[0], width: 1.6, swing: 1, hinge: -1 },
  // reception gate → east envelope, z=0 (v1.3 zone table: the gate faces
  // east / the +X walkway). Double door, swings inward.
  { axis: 'z', at: ENV.x, center: 0, width: 2.4, swing: -1, hinge: 1, double: true },
];

function fillSegment(ctx: CanvasRenderingContext2D, cam: Camera2D, w: WallRun, a: number, b: number) {
  if (b - a <= 0.01) return;
  if (w.axis === 'x') {
    ctx.fillRect(cam.toScreenX(a), cam.toScreenY(w.at - w.thick / 2), (b - a) * cam.scale, w.thick * cam.scale);
  } else {
    ctx.fillRect(cam.toScreenX(w.at - w.thick / 2), cam.toScreenY(a), w.thick * cam.scale, (b - a) * cam.scale);
  }
}

/** One door leaf + its quarter-circle swing arc. Works for both wall axes
 *  and double doors (two mirrored half-leaves). */
function drawStraightDoor(ctx: CanvasRenderingContext2D, cam: Camera2D, d: DoorDef) {
  const half = d.width / 2;
  const hinges: Array<{ c: number; sgn: number }> = d.double
    ? [{ c: -half, sgn: -1 }, { c: half, sgn: 1 }]
    : [{ c: d.hinge * half, sgn: d.hinge }];

  for (const { c, sgn } of hinges) {
    const hx = d.axis === 'x' ? d.center + c : d.at;
    const hz = d.axis === 'x' ? d.at : d.center + c;
    const lw = d.double ? half : d.width; // leaf length
    const lx = d.axis === 'x' ? hx : hx + d.swing * lw;
    const lz = d.axis === 'x' ? hz + d.swing * lw : hz;

    const s1x = cam.toScreenX(hx), s1y = cam.toScreenY(hz);
    const s2x = cam.toScreenX(lx), s2y = cam.toScreenY(lz);

    // leaf
    ctx.strokeStyle = P2D.ink; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(s1x, s1y); ctx.lineTo(s2x, s2y); ctx.stroke();

    // swing arc — from leaf direction to wall-opening direction (90°)
    const vlx = s2x - s1x, vly = s2y - s1y;
    const wx = d.axis === 'x' ? -sgn : 0;
    const wy = d.axis === 'x' ? 0 : -sgn;
    const cross = vlx * wy - vly * wx;
    const sweep = (cross > 0 ? 1 : -1) * Math.PI / 2;
    const a1 = Math.atan2(vly, vlx);
    ctx.strokeStyle = P2D.inkSoft; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s1x, s1y, Math.hypot(vlx, vly), a1, a1 + sweep, sweep < 0);
    ctx.stroke();
  }
}

/** Rotunda ring with the east opening (ceo_door sits inside the ring at
 *  2.1u from center — the opening faces it / command hub). */
function paintRotunda(ctx: CanvasRenderingContext2D, cam: Camera2D) {
  const bx = cam.toScreenX(BRAIN_ANCHOR.x), by = cam.toScreenY(BRAIN_ANCHOR.z);
  const rMid = ROTUNDA_R * cam.scale;
  const rO = (ROTUNDA_R + RING_T / 2) * cam.scale;
  const rI = (ROTUNDA_R - RING_T / 2) * cam.scale;
  const half = ROTUNDA_DOOR_W / 2 / ROTUNDA_R; // gap half-angle (radians)

  ctx.fillStyle = P2D.ink;
  ctx.beginPath();
  ctx.arc(bx, by, rO, half, Math.PI * 2 - half);       // outer circle, gap at east
  ctx.arc(bx, by, rI, Math.PI * 2 - half, half, true); // inner circle back
  ctx.closePath();
  ctx.fill();

  // open double leaves at the gap — radial (90° from the ring tangent)
  ctx.strokeStyle = P2D.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  const len = (ROTUNDA_DOOR_W / 2) * cam.scale;
  for (const s of [-1, 1]) {
    const a = s * half;
    const hx = bx + Math.cos(a) * rMid, hy = by + Math.sin(a) * rMid;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(a) * len, hy + Math.sin(a) * len);
    ctx.stroke();
  }
}

/** Walls + doors. Call after floors, before labels. */
export function paintWalls(ctx: CanvasRenderingContext2D, cam: Camera2D): void {
  ctx.fillStyle = P2D.ink;
  for (const w of WALLS) {
    const ds = DOORS.filter(d => d.axis === w.axis && Math.abs(d.at - w.at) < 0.26)
      .sort((p, q) => p.center - q.center);
    let cursor = w.from;
    for (const d of ds) {
      fillSegment(ctx, cam, w, cursor, d.center - d.width / 2);
      cursor = d.center + d.width / 2;
    }
    fillSegment(ctx, cam, w, cursor, w.to);
  }
  ctx.lineCap = 'round';
  for (const d of DOORS) drawStraightDoor(ctx, cam, d);
  paintRotunda(ctx, cam);
}