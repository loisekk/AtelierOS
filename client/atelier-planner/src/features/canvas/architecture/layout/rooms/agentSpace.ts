import type { RoomBuilder } from '../layoutTypes';
import { nat, F } from '../coords';
import { cluster, shelfRun, backCorners } from '../builders';

// ── AGENT SPACE: exactly 7 stations (2 round clusters + 5 screen-linked desks) ──
export const agentSpace: RoomBuilder = (add, r, preset) => {
  cluster(add, ...nat(r, -0.55, -0.65), 4);                // W1 — round, 4 chairs
  add('workstation_set', ...nat(r, 0.55, -0.65), F.W, true); // W2 — east, sitter faces the desk
  add('workstation_set', ...nat(r, 0.00, -0.20), F.S, true); // W3 — center, sitter faces north
  cluster(add, ...nat(r, -0.55, 0.30), 3);                 // W4 — round, 3 chairs
  add('workstation_set', ...nat(r, 0.55, 0.25), F.W, true); // W5
  add('workstation_set', ...nat(r, -0.30, 0.70), F.N, true); // W6 — south row, sitter faces south
  add('workstation_set', ...nat(r, 0.30, 0.70), F.N, true); // W7
  if (preset !== 'sparse') backCorners(add, r, 0.44, 0.42);
  if (preset === 'dense') {                                // ── legacy v2.1 library wall + extras ──
    add('wall_screen', ...nat(r, 0, -0.90), F.S);
    shelfRun(add, ...nat(r, -0.88, 0.0), F.E, 2, 2.1);
    add('filing_cabinet', ...nat(r, 0.82, 0.60), F.W);
  }
};