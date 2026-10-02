import { ROOM_ZONES } from '../../canvas/architecture/SpatialConfig';
import type { Camera2D } from './Camera2D';
import type { Agent2D, Office2DFrame } from '../types';

/** ── Phase 14.5 — hit testing ─────────────────────────────────────────────
 *  Priority: agent > workstation (a ws-flagged desk item) > room. Hover
 *  drives the glyph highlight + the DOM tooltip; a click routes through the
 *  engine's setSelected — the single selection hub, same as 3D clicks.
 *  Pure function: reads state, returns a hit description, mutates nothing. */

export type HitTarget =
  | { kind: 'agent'; id: string; agent: Agent2D }
  | { kind: 'workstation'; id: string; label: string }
  | { kind: 'room'; id: string; label: string }
  | null;

/** Test a screen point against the live scene. Agents get a generous world
 *  radius (they are the primary interaction target); workstations next;
 *  rooms are the catch-all. */
export function hitTest(
  cam: Camera2D, f: Office2DFrame, sx: number, sy: number,
): HitTarget {
  const world = cam.screenToWorld(sx, sy);

  // ── 1. agents — nearest within ~0.6 world units ──
  let bestAgent: Agent2D | null = null;
  let bestD = 0.6;
  for (const a of f.agents) {
    const d = Math.hypot(a.x - world.x, a.z - world.z);
    if (d < bestD) { bestD = d; bestAgent = a; }
  }
  if (bestAgent) return { kind: 'agent', id: bestAgent.id, agent: bestAgent };

  // ── 2. workstations — ws-flagged furniture items within ~1.0 world units ──
  let bestWs: { id: string; label: string } | null = null;
  let bestWD = 1.0;
  for (const it of f.items) {
    if (!it.ws) continue;
    const d = Math.hypot(it.position.x - world.x, it.position.z - world.z);
    if (d < bestWD) { bestWD = d; bestWs = { id: it.id, label: it.name }; }
  }
  if (bestWs) return { kind: 'workstation', id: bestWs.id, label: bestWs.label };

  // ── 3. room — the zone containing the world point ──
  const zone = ROOM_ZONES.find(z =>
    world.x >= z.minX && world.x <= z.maxX &&
    world.z >= z.minZ && world.z <= z.maxZ);
  if (zone) return { kind: 'room', id: zone.id, label: zone.label };

  return null;
}