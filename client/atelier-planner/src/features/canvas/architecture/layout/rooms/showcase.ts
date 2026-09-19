import type { RoomBuilder } from '../layoutTypes';
import { fFace, img } from '../coords';
import { cluster, shelfWall } from '../builders';

// ── WORKSPACE SHOWCASE v3.4: image-space — two aligned project tables (8 baked
// chairs EACH), pendant over each, right-wall screen, left-wall shelving. ──
export const showcase: RoomBuilder = (add, r, preset) => {
  add('conference_table', ...img(r, 0, -0.38), fFace('down'), false, 0, true);  // 1 collab table, top (essential)
  add('pendant', ...img(r, 0, -0.38));                                          // 2 pendant over the top table
  add('conference_table', ...img(r, 0, 0.32), fFace('down'));                   // 3 collab table, bottom
  add('pendant', ...img(r, 0, 0.32));                                           // 4 pendant over the bottom table
  add('wall_screen', ...img(r, 0.88, -0.3), fFace('left'));                     // 5 right-wall screen faces the room
  shelfWall(add, r, -0.86, 0.1, fFace('right'), 2, 1.2);                 // 6,7 left-wall shelving run
  add('plant_large', ...img(r, -0.78, -0.78));                                  // 8-11 corner greens
  add('plant_large', ...img(r, 0.78, -0.78));
  add('plant_large', ...img(r, -0.78, 0.78));
  add('plant_large', ...img(r, 0.78, 0.78));
  if (preset === 'dense') {                                                     // ── v3.3 demo cluster ──
    cluster(add, ...img(r, 0, 0.82), 4);                                        // 12-16 demo cluster (table + 4 chairs)
  }
};