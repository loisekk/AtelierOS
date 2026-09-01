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
// Brain chamber = the rotunda at the -X end
export const BRAIN_FALLBACK = V([-16, 2.6, 0]);

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

export const ROOM_LABELS: { text: string; sub: string; accent: string; pos: [number, number, number] }[] = [
  { text: 'CEO BRAIN CORE',     sub: 'Command Intelligence',  accent: '#9B5FD4', pos: [ -16.0, 4.6,  0.0 ] },
  { text: 'HOME WORKSPACE',     sub: 'CEO Private Office',    accent: '#C77B3F', pos: [ -16.0, 4.6, 12.0 ] },
  { text: 'WORKSPACE SHOWCASE', sub: 'Active Projects',       accent: '#49D8EC', pos: [ -16.0, 4.6, -12.0 ] },
  { text: 'COMMAND HUB',        sub: 'Dispatch & Monitor',    accent: '#49D8EC', pos: [ -4.5, 4.2,  0.0 ] },
  { text: 'AGENT SPACE',        sub: 'AI Employees',          accent: '#4E9B67', pos: [ -4.5, 4.2, 12.0 ] },
  { text: 'OFFICE FLOOR',       sub: 'Co-Workers & Teams',    accent: '#6B8E4E', pos: [ -4.5, 4.2, -12.0 ] },
  { text: 'KNOWLEDGE HUB',      sub: 'Company Memory',        accent: '#56749B', pos: [  6.0, 4.2, 12.0 ] },
  { text: 'MEETING ROOM',       sub: 'Team Strategy',         accent: '#D09A46', pos: [  6.0, 4.2,  0.0 ] },
  { text: 'AI CLUB LOUNGE',     sub: 'Break & Social',        accent: '#9B5FD4', pos: [  6.0, 4.2, -12.0 ] },
  { text: 'RECEPTION',          sub: 'Welcome to Atelier',    accent: '#B96D3D', pos: [ 17.0, 3.6,  0.0 ] },
];

export const CAMERA_RIGS = {
  office:    { pos: [ 26, 22, 26 ] as const,  lookAt: [ 0, 0, 0 ] as const,      fov: 40 },
  ceo:       { pos: [ -2, 5.5, 0 ] as const,  lookAt: [ -16, 2.6, 0 ] as const,  fov: 35 },
  command:   { pos: [ 8, 11, 10 ] as const,   lookAt: [ -4.5, 1, 0 ] as const,   fov: 45 },
  knowledge: { pos: [ 16, 11, 18 ] as const,  lookAt: [ 6, 1, 12 ] as const,     fov: 45 },
  top:       { pos: [ 0, 60, 0.01 ] as const, lookAt: [ 0, 0, 0 ] as const,      fov: 34 },
};

export const EGRESS_POINTS: [number, number, number][] = [
  [ -4, 0.02, -12 ], [ 6, 0.02, -12 ], [ 14, 0.02, -8 ], [ 19, 0.02, -3 ],
];