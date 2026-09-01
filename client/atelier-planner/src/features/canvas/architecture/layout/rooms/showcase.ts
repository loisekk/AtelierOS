import type { RoomBuilder } from '../layoutTypes';
import { nat, F } from '../coords';
import { backCorners, shelfRun } from '../builders';

// ── WORKSPACE SHOWCASE: 2 aligned project tables (8 baked chairs EACH) + display ──
export const showcase: RoomBuilder = (add, r, preset) => {
  add('conference_table', ...nat(r, 0, -0.30), 0);
  add('laptop', ...nat(r, 0, -0.30), 0.3, false, 0.77);
  add('conference_table', ...nat(r, 0, 0.42), 0);
  add('laptop', ...nat(r, 0, 0.42), -0.3, false, 0.77);
  add('wall_screen', ...nat(r, 0, -0.88), F.S);            // north wall, faces the room
  add('bookshelf_large', ...nat(r, 0.82, 0.10), F.W);
  if (preset !== 'sparse') {
    add('filing_cabinet', ...nat(r, 0.82, 0.55), F.W);
    backCorners(add, r, 0.44, 0.42);
    add('pendant', ...nat(r, 0, -0.30));
    add('pendant', ...nat(r, 0, 0.42));
  }
  if (preset === 'dense') {                                // ── legacy v2.1 wall desks + display shelf ──
    add('workstation_set', ...nat(r, -0.78, -0.10), F.E, true);
    add('workstation_set', ...nat(r, -0.78, 0.45), F.E, true);
    shelfRun(add, ...nat(r, 0.86, -0.55), F.W, 2, 2.1);
  }
};