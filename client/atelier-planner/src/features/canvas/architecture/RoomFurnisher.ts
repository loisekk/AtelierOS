import { ROOM_ZONES } from './SpatialConfig';
import type { RoomId } from './SpatialConfig';
import type { LayoutEntry, RoomRect, LayoutPreset, AddFn, RoomBuilder } from './layout/layoutTypes';
import * as rooms from './layout/roomLayouts';
import { USER_DEFAULT_LAYOUT } from './layout/userDefaultLayout';
import * as catalogModule from '../../furniture/catalog';

/**
 * Atelier RoomFurnisher v3.4.1 — image-space compositions, ZONES-FIRST rects.
 * ROOM_ZONES (SpatialConfig, GLB-derived) is the only valid ruler: the cluster-
 * derived MEASURED rects below are a fallback safety net only (they were
 * calibrated from v3.3 furniture that was itself misplaced, so they inherited
 * the old error and must never drive layout). Room files under layout/rooms/
 * are authored in REFERENCE-IMAGE space (img(): hx = right+, hz = down+) and
 * mapped once in layout/coords.ts — "what you drew is what renders".
 * Preserved from v3.3: presets, per-room census stats, ws anchors, barrel rule,
 * engine LayoutEntry shape unchanged, fault-tolerant add() (unknown catalog key
 * = warn-once + skip + counted, NEVER aborts mid-room), essential-flag sparse
 * preset. v3.4 adds: 10% inset clamp (kills corner overshoot), boot
 * console.table of id → center, KNOWLEDGE_AICLUB_SWAP escape hatch.
 */
export const DEFAULT_OFFICE_LAYOUT_VERSION = '4.0.0';
export type { LayoutEntry, LayoutPreset } from './layout/layoutTypes';

export interface RoomStat { count: number; ws: number; types: Record<string, number>; skipped: number; }

/** If library furniture ever renders under the AI CLUB label (or vice-versa), flip this. */
export const KNOWLEDGE_AICLUB_SWAP = false;

/** Fallback ONLY (world units). x/z = center, w/d = FULL size. Never the primary ruler:
 *  calibrated from v3.3 furniture clusters, which inherited v3.3's own misplacement. */
const MEASURED: Record<RoomId, RoomRect> = {
  home_workspace: { x: -16.25, z:  11.60, w: 11.4, d: 10.6 },
  brain_chamber:  { x: -16.25, z:   0.00, w: 10.6, d: 10.6 },
  showcase:       { x: -16.25, z: -12.20, w: 11.4, d: 10.6 },
  agent_space:    { x:  -4.50, z:  12.20, w: 10.0, d:  8.6 },
  command_hub:    { x:  -4.50, z:  -0.30, w:  9.6, d:  9.6 },
  office_floor:   { x:  -4.50, z: -12.20, w: 10.0, d:  8.6 },
  knowledge_hub:  { x:   6.00, z:  12.00, w:  9.6, d:  8.6 },
  meeting_room:   { x:   6.00, z:   0.00, w:  9.6, d: 12.0 },
  ai_club:        { x:   6.00, z: -12.00, w:  9.6, d:  8.6 },
  reception:      { x:  16.75, z:   0.00, w:  8.2, d:  8.4 },
};

const ROOM_BUILDERS: Record<RoomId, RoomBuilder> = {
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

/** Tolerant zone reader (v3.3 hardening, restored): accepts {minX,maxX,minZ,maxZ}
 *  (live shape), {x,z,w,d}, and {center,width,depth}. */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const toRect = (zone: Record<string, unknown>): RoomRect | null => {
  if (isNum(zone.minX) && isNum(zone.maxX) && isNum(zone.minZ) && isNum(zone.maxZ)) {
    return { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2, w: zone.maxX - zone.minX, d: zone.maxZ - zone.minZ };
  }
  if (isNum(zone.x) && isNum(zone.z) && isNum(zone.w) && isNum(zone.d)) {
    return { x: zone.x, z: zone.z, w: zone.w, d: zone.d };
  }
  const c = zone.center as Record<string, unknown> | undefined;
  if (c && isNum(c.x) && isNum(c.z) && isNum(zone.width) && isNum(zone.depth)) {
    return { x: c.x, z: c.z, w: zone.width, d: zone.depth };
  }
  return null;
};

/** Zones-first (v3.4.1): ROOM_ZONES (GLB-derived) wins; MEASURED is a fallback
 *  safety net only, warned loudly when hit. */
const rectFor = (id: RoomId): RoomRect => {
  const resolved: RoomId =
    id === 'knowledge_hub' && KNOWLEDGE_AICLUB_SWAP ? 'ai_club' :
    id === 'ai_club' && KNOWLEDGE_AICLUB_SWAP ? 'knowledge_hub' : id;
  const zone = ROOM_ZONES.find((zn) => zn.id === resolved);
  const rect = zone ? toRect(zone as unknown as Record<string, unknown>) : null;
  if (rect) return rect;
  console.warn(`[layout v${DEFAULT_OFFICE_LAYOUT_VERSION}] zone missing for "${resolved}" — measured fallback`);
  return MEASURED[resolved];
};

// Catalog probe tolerant to the catalog's export shape (v3.3 hardening, kept):
// picks the module export whose values carry a `factory` (ITEM_CATALOG itself).
const catalogBag = Object.values(catalogModule).find(
  (v) =>
    !!v && typeof v === 'object' && !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).some(
      (e) => !!e && typeof e === 'object' && 'factory' in e,
    ),
) as Record<string, unknown> | undefined;
const hasKey = (key: string): boolean => !!catalogBag && key in catalogBag;

/** 10% inset clamp — perimeter items can never reach clipped/angled walls again;
 *  every anchor is capped at ±0.80 of each half-axis of the MEASURED rect. */
const clampToRoom = (r: RoomRect, x: number, z: number): [number, number] => [
  Math.min(r.x + r.w * 0.40, Math.max(r.x - r.w * 0.40, x)),
  Math.min(r.z + r.d * 0.40, Math.max(r.z - r.d * 0.40, z)),
];

function buildLayout(preset: LayoutPreset) {
  // v4.0 'default' = the CEO's hand-placed office, baked verbatim into
  // userDefaultLayout.ts. No composition, no clamping — world coords as placed.
  // Per-room census via point-in-rect attribution (zones-first, same ruler as
  // the composed presets) with nearest-center fallback for atrium/corridor strays.
  if (preset === 'default') {
    const stats: Record<string, RoomStat> = {};
    const ids = Object.keys(ROOM_BUILDERS) as RoomId[];
    for (const id of ids) stats[id] = { count: 0, ws: 0, types: {}, skipped: 0 };
    const rects = ids.map((id) => ({ id, rect: rectFor(id) }));
    for (const e of USER_DEFAULT_LAYOUT) {
      let hit = rects.find(({ rect }) =>
        Math.abs(e.x - rect.x) <= rect.w / 2 && Math.abs(e.z - rect.z) <= rect.d / 2);
      if (!hit) {
        hit = rects.reduce((best, cur) => {
          const d = (p: typeof cur) => (e.x - p.rect.x) ** 2 + (e.z - p.rect.z) ** 2;
          return d(cur) < d(best) ? cur : best;
        }, rects[0]);
      }
      const s = stats[hit.id];
      s.count += 1;
      s.types[e.type] = (s.types[e.type] ?? 0) + 1;
      if (e.ws) s.ws += 1;
    }
    return { layout: USER_DEFAULT_LAYOUT.map((e) => ({ ...e })), stats };
  }

  const L: LayoutEntry[] = [];
  const stats: Record<string, RoomStat> = {};
  const warned = new Set<string>();

  // Fault-tolerant add (v3.3, kept): unknown catalog keys are warn-once + skipped
  // + counted (never abort mid-room); sparse drops non-essential items silently.
  // v3.4: every anchor passes through the 10% inset clamp of its MEASURED rect.
  let current: RoomStat = { count: 0, ws: 0, types: {}, skipped: 0 };
  let currentRect: RoomRect = { x: 0, z: 0, w: 12, d: 12 };
  const add: AddFn = (type, x, z, r = 0, ws = false, dy = 0, essential = false) => {
    if (preset === 'sparse' && !essential) {
      current.skipped += 1;
      return;
    }
    if (!hasKey(type)) {
      current.skipped += 1;
      if (!warned.has(type)) {
        warned.add(type);
        console.warn(`[layout v${DEFAULT_OFFICE_LAYOUT_VERSION}] catalog key missing → skipped: ${type}`);
      }
      return;
    }
    const [cx, cz] = clampToRoom(currentRect, x, z);
    L.push({ type, x: cx, z: cz, r, ws, dy });
    current.count += 1;
    current.types[type] = (current.types[type] ?? 0) + 1;
    if (ws) current.ws += 1;
  };

  for (const id of Object.keys(ROOM_BUILDERS) as RoomId[]) {
    current = { count: 0, ws: 0, types: {}, skipped: 0 };
    currentRect = rectFor(id);
    ROOM_BUILDERS[id](add, currentRect, preset);
    stats[id] = current;
  }

  return { layout: L, stats };
}

export function getAutoLayout(preset: LayoutPreset = 'default'): LayoutEntry[] {
  return buildLayout(preset).layout;
}

/** Per-room furniture census — powers the count-validation criterion. */
export function getLayoutStats(preset: LayoutPreset = 'default'): Record<string, RoomStat> {
  return buildLayout(preset).stats;
}

/** Boot-time truth table: id → measured center/size. Compare against labels in one glance. */
export const showRoomCenters = (): void => {
  console.table(Object.fromEntries((Object.keys(MEASURED) as RoomId[]).map((id) => [id, rectFor(id)])));
};