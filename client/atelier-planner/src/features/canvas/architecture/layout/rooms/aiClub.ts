import type { RoomBuilder } from '../layoutTypes';
import { nat, F } from '../coords';
import { backCorners } from '../builders';

// ── AI CLUB LOUNGE: 4 sofas facing the social center, coffee table, shelf + sign ──
export const aiClub: RoomBuilder = (add, r, preset) => {
  add('coffee_table', ...nat(r, -0.15, 0.15));             // social center
  add('lounge_sofa', ...nat(r, -0.15, -0.55), F.S);        // north — faces the table
  add('lounge_sofa', ...nat(r, 0.55, 0.10), F.W);          // east — faces the table
  add('lounge_sofa', ...nat(r, -0.75, 0.10), F.E);         // west — faces the table
  add('lounge_sofa', ...nat(r, -0.15, 0.75), F.N);         // south — faces the table
  add('bookshelf_large', ...nat(r, 0.82, 0.45), F.W);
  add('wall_screen', ...nat(r, 0.20, -0.88), F.S);         // AI Club feature display
  if (preset !== 'sparse') {
    backCorners(add, r, 0.44, 0.44);
    add('pendant', ...nat(r, -0.15, 0.15));
  }
  if (preset === 'dense') {                                // ── legacy v2.1 side tables ──
    add('round_table', ...nat(r, 0.60, -0.68), 0);
    add('coffee_table', ...nat(r, -0.60, 0.55), 0);
  }
};