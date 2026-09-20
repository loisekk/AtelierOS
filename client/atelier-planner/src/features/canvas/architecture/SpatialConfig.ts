import * as THREE from 'three';

export const V = (t: readonly [number, number, number]) => new THREE.Vector3(t[0], t[1], t[2]);

export const WORLD = { floorY: 0 };

export const BOUNDS = { minX: -23.5, maxX: 23.5, minZ: -16.5, maxZ: 16.5 } as const;

// ── WAYPOINTS re-oriented: front-back axis = X, left-right axis = Z ──
export const WAYPOINTS: Record<string, [number, number, number]> = {
  office_center:    [ -4.5, 0, -11.9 ],
  office_door:      [ -4.5, 0,  -6.2 ],
  spine_center:     [ -3.0, 0,   0.0 ],
  meeting_door:     [  2.5, 0,   0.0 ],
  meeting_table:    [  6.0, 0,   0.0 ],
  knowledge_door:   [  1.5, 0,   6.2 ],
  knowledge_center: [  6.0, 0,  12.0 ],
  ceo_door:         [ -9.0, 0,   0.0 ],
  ceo_center:       [ -14.0, 0,  0.0 ],
};

export const MEETING_ANCHOR = V(WAYPOINTS.meeting_table).setY(2.4);
// Brain chamber = the circular rotunda. v4.0 center measured by wall-probe chord
// fits (outer ring R≈6.1: west −17.2 / north z6.45 / south z−5.7; inner dais R≈4.7)
// — concentric-solution center. GLB rotunda's dead center on the raised dais.
export const BRAIN_FALLBACK = V([-11.2, 2.6, 0.4]);
/** Raised circular dais the brain stands on (GLB-measured: dais floor = base + 0.73). */
export const BRAIN_DAIS_Y = 0.73;

/** v4.1 MEASURED rotunda anchor — the only valid brain/chair/banner ruler.
 *  Triangulated three ways: (1) wall-circle Kasa fit center (−10.65, −0.33),
 *  (2) chord fit in the comment above (−11.1, 0.4), (3) dais raycast probes —
 *  (−15.25,0)/(−14.25,0)/(−11.15,−0.55) all floor = base+0.73, while
 *  (−16.25,±2) is base floor. Dais radius ≈ 4.7 around this center; all 8
 *  chair slots at R 3.6 raycast-verified on the dais (11.416–11.426, clear above).
 *  ⚠ The brain_chamber ZONE rect center (−16.25, 0) lands INSIDE the rotunda
 *  wall (raycast 14.14 = wall top) — never anchor anything to the zone center. */
export const BRAIN_ANCHOR = V([-11.1, 0, -0.3]);

/** DAG dispatch screen mount — GLB-probed Command Hub north wall (z=−3.76), which
 *  the 'command' camera rig faces directly. The raised platform (offset 0.735)
 *  continues into the hub; eye = 1.8 above it. Screen face looks +z (into room). */
export const DAG_SCREEN_MOUNT = {
  x: -4.5,
  zWall: -3.76,      // wall face (screen hangs 0.12 in front of it)
  hubFloorOffset: 0.735,
  eye: 1.8,
  screenOffset: 0.12,
} as const;

/** Camera boundary v1 — underside & void unreachable, dollhouse top view preserved. */
export const CAMERA_LIMITS = {
  minDistance: 6,              // close-in inspection stays usable
  maxDistance: 95,             // zoom-out stops at a full exterior lot frame
  minPolarAngle: 0,            // exact top-down dollhouse preserved (phi≈0 must stay legal)
  maxPolarAngle: Math.PI * 0.485, // stops just ABOVE horizontal → sub-floor orbit impossible
  minCameraYOverFloor: 1.2,    // per-frame hard clamp: never sink under the slab
} as const;

export type RoomId =
  | 'home_workspace' | 'brain_chamber' | 'showcase'
  | 'agent_space' | 'command_hub' | 'office_floor'
  | 'knowledge_hub' | 'meeting_room' | 'ai_club' | 'reception';

export interface RoomZone {
  id: RoomId; label: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
}

// ── ROOM ZONES v1.2 — rotated 90° to match the actual GLB orientation ──
// Rear row (rotunda end) = -X · Front (reception) = +X · Home side = +Z
export const ROOM_ZONES: RoomZone[] = [
  { id: 'home_workspace', label: 'Home Workspace',     minX: -22.5, maxX: -10, minZ: 8,     maxZ: 16.5 },
  { id: 'brain_chamber',  label: 'CEO Brain Core',     minX: -22.5, maxX: -10, minZ: -7.5,  maxZ: 7.5 },
  { id: 'showcase',       label: 'Workspace Showcase', minX: -22.5, maxX: -10, minZ: -16.5, maxZ: -8 },
  { id: 'agent_space',    label: 'Agent Space',        minX: -10,   maxX: 1,   minZ: 8,     maxZ: 16.5 },
  { id: 'command_hub',    label: 'Command Hub',        minX: -10,   maxX: 1,   minZ: -7.5,  maxZ: 7.5 },
  { id: 'office_floor',   label: 'Office Floor',       minX: -10,   maxX: 1,   minZ: -16.5, maxZ: -8 },
  { id: 'knowledge_hub',  label: 'Knowledge Hub',      minX: 1,     maxX: 11,  minZ: 8,     maxZ: 16.5 },
  { id: 'meeting_room',   label: 'Meeting Room',       minX: 1,     maxX: 11,  minZ: -7.5,  maxZ: 7.5 },
  { id: 'ai_club',        label: 'AI Club Lounge',     minX: 1,     maxX: 11,  minZ: -16.5, maxZ: -8 },
  { id: 'reception',      label: 'Reception',          minX: 11,    maxX: 22.5, minZ: -7.5, maxZ: 7.5 },
];

export const CAMERA_RIGS = {
  office:    { pos: [ 26, 22, 26 ] as const,  lookAt: [ 0, 0, 0 ] as const,      fov: 40 },
  ceo:       { pos: [ 2.8, 5.5, 0.4 ] as const,  lookAt: [ -11.2, 2.6, 0.4 ] as const, fov: 35 },
  command:   { pos: [ 8, 11, 10 ] as const,   lookAt: [ -4.5, 1, 0 ] as const,   fov: 45 },
  knowledge: { pos: [ 16, 11, 18 ] as const,  lookAt: [ 6, 1, 12 ] as const,     fov: 45 },
  top:       { pos: [ 0, 60, 0.01 ] as const, lookAt: [ 0, 0, 0 ] as const,      fov: 34 },
};

export const EGRESS_POINTS: [number, number, number][] = [
  [ -4, 0.02, -12 ], [ 6, 0.02, -12 ], [ 14, 0.02, -8 ], [ 19, 0.02, -3 ],
];