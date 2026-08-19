import * as THREE from 'three';
import { ROOM_ZONES, WORLD } from './SpatialConfig';
import type { RoomId, RoomZone } from './SpatialConfig';

// Per-room furniture whitelists (Phase 11.5 Step 3 catalog ids — expansion coming next)
const FURNITURE_WHITELIST: Record<RoomId | 'general', string[]> = {
  office_floor:   ['workstation_set', 'workstation_l_shape', 'plant_small', 'plant_large', 'tv_screen', 'pendant_light'],
  meeting_room:   ['conference_table', 'meeting_wall_screen', 'projector', 'plant_large', 'pendant_light'],
  knowledge_hub:  ['bookshelf_large', 'bookshelf_wall', 'reading_table', 'archive_server', 'plant_large', 'pendant_light'],
  brain_chamber:  ['plant_large', 'pendant_light', 'tv_screen'],
  command_hub:    ['command_console', 'command_wall_screen', 'tv_screen', 'pendant_light', 'plant_small'],
  reception:      ['reception_desk', 'waiting_bench', 'plant_large', 'pendant_light'],
  ai_club:        ['lounge_sofa', 'lounge_chair', 'coffee_table', 'espresso_machine', 'tv_screen', 'plant_large', 'pendant_light'],
  home_workspace: ['bookshelf_large', 'reading_table', 'tv_screen', 'plant_small', 'plant_large', 'pendant_light'],
  showcase:       ['tv_screen', 'plant_large', 'pendant_light', 'reading_table'],
  agent_space:    ['workstation_set', 'workstation_l_shape', 'plant_small', 'plant_large', 'tv_screen', 'pendant_light'],
  general:        ['plant_large', 'plant_small', 'pendant_light'],
};

export function getRoomAt(x: number, z: number): RoomId | null {
  const zone = ROOM_ZONES.find(r => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  return zone ? zone.id : null;
}

export function getRoomZone(id: RoomId): RoomZone | undefined {
  return ROOM_ZONES.find(r => r.id === id);
}

export function getRoomCenter(id: RoomId): THREE.Vector3 {
  const z = getRoomZone(id);
  if (!z) return new THREE.Vector3(0, WORLD.floorY, 0);
  return new THREE.Vector3((z.minX + z.maxX) / 2, WORLD.floorY, (z.minZ + z.maxZ) / 2);
}

export function getAllowedFurniture(room: RoomId | null): string[] {
  if (!room) return FURNITURE_WHITELIST.general;
  return [...FURNITURE_WHITELIST[room], ...FURNITURE_WHITELIST.general];
}

export function isAllowedInRoom(type: string, room: RoomId | null): boolean {
  return getAllowedFurniture(room).includes(type);
}

// Debug helper: window.atelierEngine.debugRooms() → translucent zone overlays
export function debugDrawZones(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'roomZoneDebug';
  const palette = [0xC75D3F, 0x9B5FD4, 0x49D8EC, 0x4E9B67, 0xD09A46, 0x56749B, 0x6B8E4E, 0xB96D3D, 0x7C3AED, 0x1F3A5F];

  ROOM_ZONES.forEach((zone, i) => {
    const w = zone.maxX - zone.minX;
    const d = zone.maxZ - zone.minZ;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ color: palette[i % palette.length], transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((zone.minX + zone.maxX) / 2, WORLD.floorY + 0.05 + i * 0.002, (zone.minZ + zone.maxZ) / 2);
    group.add(mesh);
  });

  scene.add(group);
  console.log('🗺️ Room zones drawn. Call window.atelierEngine.debugRooms() again to remove.');
  return group;
}