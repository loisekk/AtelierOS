import type { RoomBuilder } from '../layoutTypes';
import { nat, F, FC } from '../coords';

// ── RECEPTION: centered curved desk, receptionist inside the nook, 2 plants ──
// Desk arc bulges +X (east) at rot 0 — a catalog quirk, kept at rot 0 (approved).
// If it reads sideways: change 0 → -Math.PI / 2.
export const reception: RoomBuilder = (add, r, preset) => {
  add('reception_desk', ...nat(r, 0, 0.05), 0);
  add('chair', ...nat(r, 0, 0.15), FC.S);                  // inside the nook, faces the entrance
  add('plant_large', ...nat(r, -0.70, -0.55));
  add('plant_large', ...nat(r, 0.70, -0.55));
  if (preset !== 'sparse') add('pendant', ...nat(r, 0, 0.35));
  if (preset === 'dense') {                                // ── legacy v2.1 benches + side tables ──
    add('waiting_bench', ...nat(r, -0.62, -0.25), F.E);
    add('waiting_bench', ...nat(r, 0.62, -0.25), F.W);
    add('round_table', ...nat(r, -0.64, 0.50), 0);
    add('round_table', ...nat(r, 0.64, 0.50), 0);
  }
};