import type { RoomBuilder } from '../layoutTypes';
import { nat, deg, F } from '../coords';
import { backCorners } from '../builders';

// ── HOME WORKSPACE: CEO desk (sitter south, faces north), reading nook, west sofas ──
export const homeWorkspace: RoomBuilder = (add, r, preset) => {
  add('workstation_set', ...nat(r, 0, -0.20), F.S, true);   // primary CEO desk
  add('reading_table', ...nat(r, 0, 0.50));                 // secondary nook (2 baked chairs)
  add('lounge_sofa', ...nat(r, -0.78, -0.20), F.E);         // west sofa 1
  add('lounge_sofa', ...nat(r, -0.78, 0.42), F.E);          // west sofa 2
  add('lounge_chair', ...nat(r, -0.55, -0.65), deg(45));    // NW armchair
  add('bookshelf_large', ...nat(r, 0.82, -0.10), F.W);      // east display shelving
  if (preset !== 'sparse') {
    add('filing_cabinet', ...nat(r, 0.82, 0.45), F.W);
    backCorners(add, r, 0.42, 0.42);
  }
  if (preset === 'dense') {                                 // ── legacy v2.1 richness ──
    add('conference_table', ...nat(r, 0, -0.62), 0);        // big table top (8 baked chairs)
    add('whiteboard', ...nat(r, 0.35, -0.90), F.S);
    add('coffee_table', ...nat(r, -0.50, 0.10));
  }
};