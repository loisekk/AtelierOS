import type { AddFn, RoomRect } from './layoutTypes';
import { degC, wsFacing, img } from './coords';

/** 2x2 facing workstation pod — historical approved values (used by 'dense' preset) */
export function pod(add: AddFn, cx: number, cz: number, dense = false) {
  const offset = dense ? 0.85 : 1.05;
  const depth = dense ? 0.7 : 0.8;
  add('workstation_set', cx - offset, cz - depth, Math.PI, true);
  add('workstation_set', cx + offset, cz - depth, Math.PI, true);
  add('workstation_set', cx - offset, cz + depth, 0, true);
  add('workstation_set', cx + offset, cz + depth, 0, true);
}

/** round table + explicit chairs (round_table ships WITHOUT chairs in the catalog).
 *  v3.3: optional `essential` flag threads through so the sparse preset keeps clusters. */
export function cluster(add: AddFn, x: number, z: number, seats: 3 | 4 = 4, essential = false) {
  add('round_table', x, z, 0, false, 0, essential);
  add('chair', x, z - 1.05, Math.PI, false, 0, essential);
  add('chair', x, z + 1.05, 0, false, 0, essential);
  if (seats === 4) {
    add('chair', x - 1.05, z, -Math.PI / 2, false, 0, essential);
    add('chair', x + 1.05, z, Math.PI / 2, false, 0, essential);
  }
}

/** row of bookshelves along a wall (rot = shelf facing in engine radians) */
export function shelfRun(add: AddFn, x: number, z: number, rot: number, count: number, gap = 2.1) {
  const alongX = Math.abs(Math.sin(rot)) < 0.5;
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * gap;
    add('bookshelf_large', alongX ? x + off : x, alongX ? z : z + off, rot);
  }
}

/**
 * POLAR ring of seats around the room center, all facing INWARD.
 * radius = fraction of half the room's SMALLER dimension (keeps chairs
 * inside rectangular rooms). phase 0.5 offsets the ring so no seat lands
 * on the N/S entrance axes.
 */
export function ring(
  add: AddFn,
  r: RoomRect,
  opts: { count?: number; radius?: number; phase?: number; type?: string } = {},
) {
  const { count = 8, radius = 0.7, phase = 0.5, type = 'chair' } = opts;
  const R = (Math.min(r.w, r.d) / 2) * radius;
  for (let i = 0; i < count; i++) {
    const a = ((i + phase) / count) * Math.PI * 2; // compass angle from north, clockwise
    add(type, r.x + Math.sin(a) * R, r.z - Math.cos(a) * R, degC((a * 180) / Math.PI + 180));
  }
}

/** 2 symmetric back-corner plants */
export function backCorners(add: AddFn, r: RoomRect, fx = 0.38, fz = 0.34) {
  add('plant_large', r.x - r.w * fx, r.z + r.d * fz);
  add('plant_large', r.x + r.w * fx, r.z + r.d * fz);
}

/** 4-corner plants */
export function corners(add: AddFn, r: RoomRect, fx = 0.42, fz = 0.4) {
  add('plant_large', r.x - r.w * fx, r.z - r.d * fz);
  add('plant_large', r.x + r.w * fx, r.z - r.d * fz);
  add('plant_large', r.x - r.w * fx, r.z + r.d * fz);
  add('plant_large', r.x + r.w * fx, r.z + r.d * fz);
}

/** sofa + coffee table in front of it (exported for future use) */
export function sofaSet(add: AddFn, x: number, z: number, rot = 0) {
  add('lounge_sofa', x, z, rot);
  add('coffee_table', x + Math.sin(rot) * 1.7, z + Math.cos(rot) * 1.7, 0);
}

// ── v3.3 additions ──────────────────────────────────────────────────────────
/** Single workstation pod — one desk whose SITTER gazes compass `gaze`
 *  (wsFacing math), registers a ws anchor. Optional essential flag. */
export function podGaze(add: AddFn, x: number, z: number, gaze: number, essential = false): void {
  add('workstation_set', x, z, wsFacing(gaze), true, 0, essential);
}

/**
 * Wall-aligned bookshelf run that CLAMPS ITS COUNT to the room rect (img-4 fix).
 * Takes a v3.4 image-space anchor (img() fractions) so call-sites stay in the
 * room-authoring convention. Computes the max shelves that fit inside the run
 * axis (SHELF_W 1.9 = bookshelf_large, WALL_MARGIN 0.55) and keeps the run
 * centered — no room dimension can produce wall clipping.
 */
export function shelfWall(
  add: AddFn, r: RoomRect,
  hx: number, hz: number, rot: number,
  count = 3, gap = 2.1,
) {
  const SHELF_W = 1.9;      // catalog bookshelf_large width
  const WALL_MARGIN = 0.55;
  const [x, z] = img(r, hx, hz);
  const alongX = Math.abs(Math.sin(rot)) < 0.5;
  const runHalf = (alongX ? r.w : r.d) / 2 - WALL_MARGIN;
  const maxCount = Math.max(1, Math.floor(((runHalf - SHELF_W / 2) * 2) / gap) + 1);
  shelfRun(add, x, z, rot, Math.min(count, maxCount), gap);
}