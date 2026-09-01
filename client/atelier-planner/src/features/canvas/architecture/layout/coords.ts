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