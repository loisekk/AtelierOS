import type { RoomBuilder } from '../layoutTypes';
import { fFace, gazeDeg, img } from '../coords';
import { podGaze, shelfWall } from '../builders';

// ── HOME WORKSPACE v3.4: image-space composition — exec table centered, side
// desk pod behind it (sitter faces the table), left-wall shelving, right sofa
// facing the table. All anchors: img(hx, hz) — right+, down+, as Image 3 shows. ──
export const homeWorkspace: RoomBuilder = (add, r, preset) => {
  add('conference_table', ...img(r, 0, -0.05), fFace('down'), false, 0, true);  // 1 exec table, centered (8 baked chairs, essential)
  podGaze(add, ...img(r, 0, 0.6), gazeDeg('up'), true);                         // 2 side desk pod — sitter faces the table (essential)
  shelfWall(add, r, -0.82, -0.1, fFace('right'), 2, 1.2);                // 3,4 left-wall shelving run
  add('lounge_sofa', ...img(r, 0.7, 0.15), fFace('left'));                      // 5 right sofa faces the table
  add('coffee_table', ...img(r, 0.42, 0.15));                                   // 6
  add('plant_large', ...img(r, -0.78, -0.78));                                  // 7 corner greens
  add('plant_large', ...img(r, 0.78, -0.78));                                   // 8
  add('wall_screen', ...img(r, 0, -0.88), fFace('down'));                       // 9 top wall screen faces the room
  if (preset === 'dense') {                                                     // ── v2.1 richness ──
    add('plant_large', ...img(r, -0.78, 0.78));                                 // 10
    add('plant_large', ...img(r, 0.78, 0.78));                                  // 11
    podGaze(add, ...img(r, -0.5, 0.6), gazeDeg('up'));                          // 12 second pod
  }
};