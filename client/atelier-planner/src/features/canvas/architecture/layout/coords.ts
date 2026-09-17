import type { RoomRect } from './layoutTypes';

/**
 * ── TWO FACING CONVENTIONS (proven from catalog.ts mesh geometry) ──────
 *
 * FURNITURE (desks, sofas, screens, shelves): front/user side faces +Z at rot 0.
 *   Proof: workstation_set chair at z=+0.45 (sitter side), monitors z=−0.2;
 *   lounge_sofa back at z=−0.35; wall_screen plane at z=+0.05.
 *   For workstations, F.<dir> = the side the SITTER sits on; the sitter
 *   faces the opposite direction (toward the desk & its monitors).
 *
 * CHAIRS ('chair'): front faces −Z at rot 0.
 *   Proof: mkChair() back panel at z=+0.28.
 *
 * Both take master-reference compass degrees (0°=N, 90°=E, 180°=S, 270°=W).
 */
export const deg  = (d: number): number => Math.PI - (d * Math.PI) / 180; // furniture
export const degC = (d: number): number => -(d * Math.PI) / 180;          // chairs

export const F  = { N: deg(0),  E: deg(90),  S: deg(180),  W: deg(270)  } as const; // furniture
export const FC = { N: degC(0), E: degC(90), S: degC(180), W: degC(270) } as const; // chairs

/** fraction-of-room → world coords (±0.5 = walls) — legacy, kept for compatibility */
export const at = (r: RoomRect, fx: number, fz: number): [number, number] => [
  r.x + r.w * fx,
  r.z + r.d * fz,
];

/**
 * Normalized master-reference coords → world coords (±1 = walls, 0 = center).
 * Implements the master prompt lerp: world = lerp(min, max, (n + 1) / 2).
 */
export const nat = (r: RoomRect, nx: number, nz: number): [number, number] => [
  r.x + (r.w / 2) * nx,
  r.z + (r.d / 2) * nz,
];

// ── v3.3 additions ──────────────────────────────────────────────────────────
/** Yaw so a workstation's SITTER faces compass g (monitors toward g).
 *  Preserves the semantic rule: F.S (0 rad) = sitter on south side facing north. */
export const wsFacing = (g: number): number => deg(g + 180);

/** Compass bearing (degrees) from (x,z) toward (tx,tz) — gaze-at-center seating. */
export const bearingTo = (x: number, z: number, tx: number, tz: number): number =>
  (Math.atan2(tx - x, -(tz - z)) * 180) / Math.PI;

// ── v3.4 additions: IMAGE-SPACE AUTHORING ───────────────────────────────────
/**
 * Rooms are now authored in REFERENCE-IMAGE space (as the eye sees the
 * reference render), not in raw world axes: down = +X (front/reception),
 * up = −X (rear/rotunda), left = +Z (home side), right = −Z (showcase side).
 * One transform (img) maps image fractions → world, so a mis-aimed "north
 * wall / west wall / corner" anchor — the class of bug behind four iterations
 * of transposed furniture — becomes structurally impossible.
 */
export type ImgDir = 'up' | 'down' | 'left' | 'right';
export const img = (r: RoomRect, hx: number, hz: number): [number, number] => [
  r.x + (r.w / 2) * hz,   // image-down  → world +X (front / reception side)
  r.z - (r.d / 2) * hx,   // image-right → world −Z (showcase side)
];

const IMG_COMPASS: Record<ImgDir, number> = { down: 90, up: 270, left: 180, right: 0 };
const OPP: Record<ImgDir, ImgDir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Furniture front (+Z at rot 0) faces image direction d. */
export const fFace = (d: ImgDir): number => deg(IMG_COMPASS[d]);
/** Workstation SITTER gazes image direction d (radians — for direct add() rot). */
export const fGaze = (d: ImgDir): number => fFace(OPP[d]);
/** Sitter-gaze in COMPASS DEGREES — for podGaze()'s compass-degree parameter. */
export const gazeDeg = (d: ImgDir): number => IMG_COMPASS[d];
/** Chair gaze (front, −Z at rot 0) faces image direction d. */
export const cGaze = (d: ImgDir): number => degC(IMG_COMPASS[d]);