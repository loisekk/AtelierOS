import type { RoomBuilder } from '../layoutTypes';
import { nat, F } from '../coords';
import { ring, backCorners } from '../builders';

// ── CEO BRAIN CORE: brain untouched; CEO desk at south rim + 8-seat polar ring ──
export const brainChamber: RoomBuilder = (add, r, preset) => {
  add('workstation_set', ...nat(r, 0, 0.65), F.S, true);   // CEO sits south, gazes north at the brain
  ring(add, r, { count: 8, radius: 0.7, phase: 0.5 });     // inward-facing, N/S axes clear
  if (preset !== 'sparse') backCorners(add, r, 0.44, 0.44);
  if (preset === 'dense') {                                // ── legacy v2.1 servers ──
    add('archive_server', ...nat(r, -0.80, 0.30), F.E);
    add('archive_server', ...nat(r, 0.80, 0.30), F.W);
  }
};