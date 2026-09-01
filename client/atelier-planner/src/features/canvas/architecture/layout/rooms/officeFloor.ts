import type { RoomBuilder } from '../layoutTypes';
import { nat, F } from '../coords';
import { corners, shelfRun, pod } from '../builders';

// ── OFFICE FLOOR: exactly 6 desks, 2×3. Rows face each other across the aisle ──
// (Same composition as the approved pods: north row sitters face south, south row face north.)
export const officeFloor: RoomBuilder = (add, r, preset) => {
  add('workstation_set', ...nat(r, -0.65, -0.40), F.N, true);
  add('workstation_set', ...nat(r, 0.00, -0.40), F.N, true);
  add('workstation_set', ...nat(r, 0.65, -0.40), F.N, true);
  add('workstation_set', ...nat(r, -0.65, 0.40), F.S, true);
  add('workstation_set', ...nat(r, 0.00, 0.40), F.S, true);
  add('workstation_set', ...nat(r, 0.65, 0.40), F.S, true);
  add('wall_screen', ...nat(r, 0, -0.88), F.S);
  if (preset !== 'sparse') corners(add, r, 0.44, 0.44);
  if (preset === 'dense') {                                // ── legacy v2.1: shelf wall + center pod ──
    shelfRun(add, ...nat(r, 0.88, 0.0), F.W, 2, 2.1);
    pod(add, r.x, r.z, true);
  }
};