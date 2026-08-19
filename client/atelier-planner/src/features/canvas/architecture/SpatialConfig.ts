import * as THREE from 'three';

export const V = (t: readonly [number, number, number]) => new THREE.Vector3(t[0], t[1], t[2]);

// Runtime world state — set once after GLB load (interior floor height above the plinth)
export const WORLD = { floorY: 0 };

export const BOUNDS = { minX: -23.5, maxX: 23.5, minZ: -16.5, maxZ: 16.5 } as const;

// TODO: refine with window.atelierEngine.startCalibration()
export const WAYPOINTS: Record<string, [number, number, number]> = {
  office_center:    [ 15.5, 0,  0.0 ],
  office_door:      [  8.0, 0,  0.0 ],
  spine_center:     [  0.0, 0,  1.0 ],
  meeting_door:     [  0.0, 0,  5.5 ],
  meeting_table:    [  0.0, 0,  8.2 ],
  knowledge_door:   [ -8.0, 0,  4.5 ],
  knowledge_center: [-19.5, 0,  7.5 ],
  ceo_door:         [  0.0, 0, -4.5 ],
  ceo_center:       [  0.0, 0, -8.0 ],
};

export const MEETING_ANCHOR = V(WAYPOINTS.meeting_table).setY(2.4);
export const BRAIN_FALLBACK = V([0, 2.6, -8.5]);

// ── Room zoning (Phase 11.5) — calibratable rectangles matching the GLB topology ──
export type RoomId =
  | 'home_workspace' | 'brain_chamber' | 'showcase'
  | 'agent_space' | 'command_hub' | 'office_floor'
  | 'knowledge_hub' | 'meeting_room' | 'ai_club' | 'reception';

export interface RoomZone {
  id: RoomId; label: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
}

export const ROOM_ZONES: RoomZone[] = [
  { id: 'home_workspace', label: 'Home Workspace',     minX: -23.5, maxX: -8, minZ: -16.5, maxZ: -3 },
  { id: 'brain_chamber',  label: 'CEO Brain Core',     minX: -8,    maxX: 8,  minZ: -16.5, maxZ: -3 },
  { id: 'showcase',       label: 'Workspace Showcase', minX: 8,     maxX: 23.5, minZ: -16.5, maxZ: -3 },
  { id: 'agent_space',    label: 'Agent Space',        minX: -23.5, maxX: -8, minZ: -3, maxZ: 3.5 },
  { id: 'command_hub',    label: 'Command Hub',        minX: -8,    maxX: 8,  minZ: -3, maxZ: 3.5 },
  { id: 'office_floor',   label: 'Office Floor',       minX: 8,     maxX: 23.5, minZ: -3, maxZ: 3.5 },
  { id: 'knowledge_hub',  label: 'Knowledge Hub',      minX: -23.5, maxX: -8, minZ: 3.5, maxZ: 10.5 },
  { id: 'meeting_room',   label: 'Meeting Room',       minX: -8,    maxX: 8,  minZ: 3.5, maxZ: 10.5 },
  { id: 'ai_club',        label: 'AI Club Lounge',     minX: 8,     maxX: 23.5, minZ: 3.5, maxZ: 10.5 },
  { id: 'reception',      label: 'Reception',          minX: -8,    maxX: 8,  minZ: 10.5, maxZ: 16.5 },
];

export const ROOM_LABELS: { text: string; sub: string; accent: string; pos: [number, number, number] }[] = [
  { text: 'CEO BRAIN CORE',     sub: 'Command Intelligence',  accent: '#9B5FD4', pos: [  0.0, 4.6, -8.5 ] },
  { text: 'HOME WORKSPACE',     sub: 'CEO Private Office',    accent: '#C77B3F', pos: [-19.5, 4.6, -8.5 ] },
  { text: 'WORKSPACE SHOWCASE', sub: 'Active Projects',       accent: '#49D8EC', pos: [ 15.5, 4.6, -8.5 ] },
  { text: 'COMMAND HUB',        sub: 'Dispatch & Monitor',    accent: '#49D8EC', pos: [  0.0, 4.2,  1.5 ] },
  { text: 'AGENT SPACE',        sub: 'AI Employees',          accent: '#4E9B67', pos: [-19.5, 4.2,  0.0 ] },
  { text: 'OFFICE FLOOR',       sub: 'Co-Workers & Teams',    accent: '#6B8E4E', pos: [ 15.5, 4.2,  0.0 ] },
  { text: 'KNOWLEDGE HUB',      sub: 'Company Memory',        accent: '#56749B', pos: [-19.5, 4.2,  7.5 ] },
  { text: 'MEETING ROOM',       sub: 'Team Strategy',         accent: '#D09A46', pos: [  0.0, 4.2,  8.2 ] },
  { text: 'AI CLUB LOUNGE',     sub: 'Break & Social',        accent: '#9B5FD4', pos: [ 15.5, 4.2,  7.5 ] },
  { text: 'RECEPTION',          sub: 'Welcome to Atelier',    accent: '#B96D3D', pos: [  0.0, 3.6, 11.5 ] },
];

export const CAMERA_RIGS = {
  office:    { pos: [ 30, 22, 30 ] as const,    lookAt: [ 0, 0, 0 ] as const,       fov: 40 },
  ceo:       { pos: [ 0, 5.5, 4.5 ] as const,   lookAt: [ 0, 2.6, -8.5 ] as const,  fov: 35 },
  command:   { pos: [ 0, 11, 13 ] as const,     lookAt: [ 0, 1, 1.5 ] as const,     fov: 45 },
  knowledge: { pos: [-19.5, 11, 16 ] as const,  lookAt: [-19.5, 1, 7.5 ] as const,  fov: 45 },
  top:       { pos: [ 0, 60, 0.01 ] as const,   lookAt: [ 0, 0, 0 ] as const,       fov: 34 },
};

export const EGRESS_POINTS: [number, number, number][] = [
  [ 11.25, 0.02, -10.5 ], [ 11.25, 0.02, 7.5 ], [ 15, 0.02, 10.5 ], [ 19, 0.02, 10.5 ],
];