import { ROOM_ZONES } from '../../canvas/architecture/SpatialConfig';
import type { Camera2D } from './Camera2D';
import type { Agent2D, Office2DFrame } from '../types';

/** ── Phase 14.5/18 — hit testing ─────────────────────────────────────────
 *  Priority: agent > workstation (ws-flagged desk item) > room. Screen-space
 *  entry (Canvas renderer) + world-space entry (Phaser scene). Pure
 *  functions: read state, return a hit description, mutate nothing. */

export type HitTarget =
  | { kind: 'agent'; id: string; agent: Agent2D }
  | { kind: 'workstation'; id: string; label: string }
  | { kind: 'room'; id: string; label: string }
  | null;

/** World-space hit test — shared by both renderers. Agents get a generous
 *  world radius (they are the primary interaction target); workstations
 *  next; rooms are the catch-all. */
export function hitTestWorldPoint(
  f: Pick<Office2DFrame, 'items' | 'agents'>, wx: number, wz: number,
): HitTarget {
  // ── 1. agents — nearest within ~0.6 world units ──
  let bestAgent: Agent2D | null = null;
  let bestD = 0.6;
  for (const a of f.agents) {
    const d = Math.hypot(a.x - wx, a.z - wz);
    if (d < bestD) { bestD = d; bestAgent = a; }
  }
  if (bestAgent) return { kind: 'agent', id: bestAgent.id, agent: bestAgent };

  // ── 2. workstations — ws-flagged furniture items within ~1.0 world units ──
  let bestWs: { id: string; label: string } | null = null;
  let bestWD = 1.0;
  for (const it of f.items) {
    if (!it.ws) continue;
    const d = Math.hypot(it.position.x - wx, it.position.z - wz);
    if (d < bestWD) { bestWD = d; bestWs = { id: it.id, label: it.name }; }
  }
  if (bestWs) return { kind: 'workstation', id: bestWs.id, label: bestWs.label };

  // ── 3. room — the zone containing the world point ──
  const zone = ROOM_ZONES.find(z =>
    wx >= z.minX && wx <= z.maxX && wz >= z.minZ && wz <= z.maxZ);
  if (zone) return { kind: 'room', id: zone.id, label: zone.label };

  return null;
}

/** Screen-space entry (Canvas renderer path) — converts then delegates. */
export function hitTest(
  cam: Camera2D, f: Office2DFrame, sx: number, sy: number,
): HitTarget {
  const world = cam.screenToWorld(sx, sy);
  return hitTestWorldPoint(f, world.x, world.z);
}