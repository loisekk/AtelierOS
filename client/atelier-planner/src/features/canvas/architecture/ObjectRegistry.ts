import * as THREE from 'three';
import { ROOM_ZONES } from './SpatialConfig';
import type { RoomId } from './SpatialConfig';

export type ObjectCategory = 'STRUCTURAL' | 'FURNITURE' | 'TECHNOLOGY' | 'DECORATION' | 'SPECIAL' | 'UNKNOWN';

export interface RegisteredObject {
  id: string;
  name: string;
  parent: string;
  category: ObjectCategory;
  structural: boolean;
  roomId: RoomId | 'exterior';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
}

export interface ValidationResult {
  level: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  itemId?: string;
  position?: { x: number; z: number };
}

export interface RoomStats {
  roomId: RoomId;
  label: string;
  itemCount: number;
  workstationCount: number;
  area: number;
  density: number; // items per 10m²
}

export function inferRoom(x: number, z: number): RoomId | 'exterior' {
  const zone = ROOM_ZONES.find(r => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  if (zone) return zone.id;
  // v4.1 — nearest-zone fallback. The GLB floor extends past the zone rects
  // (measured footprint x −21.9…22.5, z −21.1…20.3): e.g. the NE library and
  // SE lounge clusters sit on REAL floor just outside their room rects, and
  // the old strict rect test falsely reported them OUTSIDE building (41 false
  // errors). Attribute to the nearest zone within 3m of its rect edge.
  let best: RoomId | null = null;
  let bestD = Infinity;
  for (const r of ROOM_ZONES) {
    const nx = Math.max(r.minX, Math.min(r.maxX, x));
    const nz = Math.max(r.minZ, Math.min(r.maxZ, z));
    const d = Math.hypot(x - nx, z - nz);
    if (d < bestD) { bestD = d; best = r.id; }
  }
  return best && bestD <= 3 ? best : 'exterior';
}

export function classify(name: string, size: THREE.Vector3): { category: ObjectCategory; structural: boolean } {
  const n = name.toLowerCase();
  if (/brain|neuron|neural|core_|platform|holo|ring_/.test(n)) return { category: 'SPECIAL', structural: false };
  if (/wall|floor|ceiling|facade|roof|column|beam|door|window|stair|corridor|shell|partition|building|room_/.test(n)) return { category: 'STRUCTURAL', structural: true };
  if (/monitor|screen|display|tv|led|console|panel/.test(n)) return { category: 'TECHNOLOGY', structural: false };
  if (/desk|table|chair|sofa|couch|shelf|cabinet|counter|bench|reception|stool|locker/.test(n)) return { category: 'FURNITURE', structural: false };
  if (/plant|leaf|pot|lamp|light|decor|prop|vase|rug|carpet|art|painting|sign/.test(n)) return { category: 'DECORATION', structural: false };
  
  const flat = size.y < 0.2 && size.x * size.z > 6;
  const tall = Math.min(size.x, size.z) < 0.4 && size.y > 1.5 && Math.max(size.x, size.z) > 2;
  if (flat || tall) return { category: 'STRUCTURAL', structural: true };
  return { category: 'UNKNOWN', structural: false };
}

export function buildObjectRegistry(building: THREE.Object3D): RegisteredObject[] {
  building.updateMatrixWorld(true);
  const out: RegisteredObject[] = [];
  const counters: Record<string, number> = {};
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const wp = new THREE.Vector3();

  building.traverse(nd => {
    const mesh = nd as THREE.Mesh;
    if (!mesh.isMesh) return;
    box.setFromObject(mesh);
    box.getSize(size);
    mesh.getWorldPosition(wp);

    const { category, structural } = classify(mesh.name || '', size);
    const key = category.toLowerCase();
    counters[key] = (counters[key] || 0) + 1;

    out.push({
      id: `${key}.${String(counters[key]).padStart(2, '0')}`,
      name: mesh.name || '(unnamed)',
      parent: mesh.parent?.name || '(root)',
      category,
      structural,
      roomId: inferRoom(wp.x, wp.z),
      position: { x: +wp.x.toFixed(2), y: +wp.y.toFixed(2), z: +wp.z.toFixed(2) },
      rotation: { x: +mesh.rotation.x.toFixed(2), y: +mesh.rotation.y.toFixed(2), z: +mesh.rotation.z.toFixed(2) },
      scale: { x: +mesh.scale.x.toFixed(2), y: +mesh.scale.y.toFixed(2), z: +mesh.scale.z.toFixed(2) },
      size: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) },
    });
  });

  return out;
}

/**
 * Enhanced validation with multiple checks:
 * - Room assignment
 * - Overlap detection
 * - Wall proximity
 * - Screen alignment
 * - Cluster coherence
 */
export function validatePlacedItems(
  items: { id: string; type: string; position: { x: number; z: number }; y?: number; rotation?: number }[],
  walls?: { x: number; z: number; w: number; d: number }[]
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 1. Room assignment validation
  items.forEach(it => {
    const room = inferRoom(it.position.x, it.position.z);
    if (room === 'exterior') {
      results.push({
        level: 'ERROR',
        message: `${it.type} (${it.id}) OUTSIDE building`,
        itemId: it.id,
        position: it.position,
      });
    } else {
      results.push({
        level: 'OK',
        message: `${it.type} (${it.id}) → ${room}`,
        itemId: it.id,
        position: it.position,
      });
    }
  });

  // 2. Overlap detection
  // Some catalog factories bake elevation INTO the mesh group (pendant shade at
  // y≈2.0 inside the group) while the group itself sits at y=0 — so stored meta
  // y can't see it. BAKED_ELEVATION adds that known internal height so stacking
  // false-positives (pendant above its table) stay silenced. Mirrors dy-awareness.
  const BAKED_ELEVATION: Record<string, number> = { pendant: 1.9 };
  const elevOf = (it: { y?: number }): number => (it.y ?? 0) + (BAKED_ELEVATION[(it as { type?: string }).type ?? ''] ?? 0);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const d = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
      const minDist = (a.type === 'plant_large' || b.type === 'plant_large') ? 0.3 : 0.5;
      // dy-awareness: items intentionally stacked at different heights (laptops on
      // tables, pendants above tables) share x/z by design — not a collision.
      const dy = Math.abs(elevOf(a) - elevOf(b));
      if (d < minDist && dy < 0.4) {
        results.push({
          level: 'WARNING',
          message: `${a.type} (${a.id}) overlaps ${b.type} (${b.id}) dist=${d.toFixed(2)}m`,
          itemId: a.id,
          position: a.position,
        });
      }
    }
  }

  // 3. Wall proximity (if wall data provided)
  if (walls && walls.length > 0) {
    items.forEach(it => {
      walls.forEach(wall => {
        const dx = Math.abs(it.position.x - wall.x);
        const dz = Math.abs(it.position.z - wall.z);
        if (dx < 0.3 && dz < wall.d / 2) {
          results.push({
            level: 'WARNING',
            message: `${it.type} (${it.id}) too close to wall`,
            itemId: it.id,
            position: it.position,
          });
        }
      });
    });
  }

  // 4. Cluster coherence (workstations should be grouped WITHIN each room)
  // Legacy check measured scatter across the whole building, which always fires
  // in a multi-room office (desks are SUPPOSED to be 16m apart across rooms).
  // Per-room: warn only if one room's own workstations drift from their local
  // centroid by more than the aisle threshold.
  const workstations = items.filter(it => it.type === 'workstation_set');
  if (workstations.length > 0) {
    const byRoom = new Map<string, typeof workstations>();
    workstations.forEach(w => {
      const room = inferRoom(w.position.x, w.position.z);
      const list = byRoom.get(room) ?? [];
      list.push(w);
      byRoom.set(room, list);
    });
    byRoom.forEach((list, room) => {
      if (room === 'exterior' || list.length < 2) return;
      const avgX = list.reduce((sum, w) => sum + w.position.x, 0) / list.length;
      const avgZ = list.reduce((sum, w) => sum + w.position.z, 0) / list.length;
      const maxDist = list.reduce((max, w) => {
        const d = Math.hypot(w.position.x - avgX, w.position.z - avgZ);
        return Math.max(max, d);
      }, 0);
      if (maxDist > 8) {
        results.push({
          level: 'WARNING',
          message: `Workstations scattered in ${room} (max dist: ${maxDist.toFixed(1)}m from room center)`,
        });
      }
    });
  }

  return results;
}

/**
 * Generate per-room statistics
 */
export function generateRoomStats(items: { type: string; position: { x: number; z: number } }[]): RoomStats[] {
  const stats: RoomStats[] = [];

  ROOM_ZONES.forEach(zone => {
    const roomItems = items.filter(it => 
      it.position.x >= zone.minX && it.position.x <= zone.maxX &&
      it.position.z >= zone.minZ && it.position.z <= zone.maxZ
    );

    const area = (zone.maxX - zone.minX) * (zone.maxZ - zone.minZ);
    const workstationCount = roomItems.filter(it => it.type === 'workstation_set').length;

    stats.push({
      roomId: zone.id,
      label: zone.label,
      itemCount: roomItems.length,
      workstationCount,
      area: Math.round(area),
      density: +((roomItems.length / area) * 10).toFixed(2),
    });
  });

  return stats;
}

/**
 * Export layout as downloadable JSON file
 */
export interface ExportedLayoutItem {
  type: string;
  position: { x: number; z: number };
  rotation: number;
  role?: string;
}

export function exportLayoutToFile(items: ExportedLayoutItem[], filename: string = 'office-layout') {
  const json = JSON.stringify({
    version: '1.1',
    exported: new Date().toISOString(),
    itemCount: items.length,
    items,
  }, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

