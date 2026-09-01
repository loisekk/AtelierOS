import { ROOM_ZONES } from './SpatialConfig';
import type { LayoutEntry, RoomRect, LayoutPreset, AddFn, RoomBuilder } from './layout/layoutTypes';
import * as rooms from './layout/roomLayouts';

export const DEFAULT_OFFICE_LAYOUT_VERSION = '3.2';
export type { LayoutEntry, LayoutPreset } from './layout/layoutTypes';

export interface RoomStat { count: number; ws: number; types: Record<string, number>; }

const ROOM_BUILDERS: Record<string, RoomBuilder> = {
  home_workspace: rooms.homeWorkspace,
  brain_chamber: rooms.brainChamber,
  showcase: rooms.showcase,
  agent_space: rooms.agentSpace,
  command_hub: rooms.commandHub,
  office_floor: rooms.officeFloor,
  knowledge_hub: rooms.knowledgeHub,
  meeting_room: rooms.meetingRoom,
  ai_club: rooms.aiClub,
  reception: rooms.reception,
};

function buildLayout(preset: LayoutPreset) {
  const L: LayoutEntry[] = [];
  const add: AddFn = (type, x, z, r = 0, ws = false, dy = 0) => L.push({ type, x, z, r, ws, dy });
  const stats: Record<string, RoomStat> = {};

  for (const zone of ROOM_ZONES) {
    const builder = ROOM_BUILDERS[zone.id];
    if (!builder) continue;
    const rect: RoomRect = {
      x: (zone.minX + zone.maxX) / 2,
      z: (zone.minZ + zone.maxZ) / 2,
      w: zone.maxX - zone.minX,
      d: zone.maxZ - zone.minZ,
    };
    const start = L.length;
    builder(add, rect, preset);
    const roomStat: RoomStat = { count: L.length - start, ws: 0, types: {} };
    for (let i = start; i < L.length; i++) {
      const e = L[i];
      roomStat.types[e.type] = (roomStat.types[e.type] ?? 0) + 1;
      if (e.ws) roomStat.ws++;
    }
    stats[zone.id] = roomStat;
  }

  return { layout: L, stats };
}

export function getAutoLayout(preset: LayoutPreset = 'standard'): LayoutEntry[] {
  return buildLayout(preset).layout;
}

/** Per-room furniture census — powers the count-validation criterion. */
export function getLayoutStats(preset: LayoutPreset = 'standard'): Record<string, RoomStat> {
  return buildLayout(preset).stats;
}