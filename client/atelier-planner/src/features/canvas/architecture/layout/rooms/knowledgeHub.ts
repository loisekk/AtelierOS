import type { RoomBuilder } from '../layoutTypes';
import { fFace, img } from '../coords';
import { cluster, shelfRun } from '../builders';

// ── KNOWLEDGE HUB v3.4: image-space — library wall on the left, study counter on
// the right, reading nooks between, top feature screen + bookcase. ──
export const knowledgeHub: RoomBuilder = (add, r, preset) => {
  shelfRun(add, ...img(r, -0.84, -0.1), fFace('right'), 4, 1.15);             // 1-4 library wall, left
  add('reception_desk', ...img(r, 0.8, 0.1), fFace('left'), false, 0, true);  // 5 study counter faces the room (essential)
  add('reading_table', ...img(r, -0.25, -0.55), fFace('right'));              // 6 quiet reading table (2 baked chairs)
  add('reading_table', ...img(r, 0.25, 0.6), fFace('right'));                 // 7 reading table 2 (2 baked chairs)
  cluster(add, ...img(r, -0.35, 0.45), 4);                                    // 8-12 study cluster (table + 4 chairs)
  add('lounge_sofa', ...img(r, 0.45, -0.5), fFace('left'));                   // 13 reading sofa gazes the nook
  add('coffee_table', ...img(r, 0.18, -0.5));                                 // 14
  add('plant_large', ...img(r, -0.78, -0.8));                                 // 15,16 corner greens
  add('plant_large', ...img(r, 0.6, -0.8));
  add('wall_screen', ...img(r, 0.1, -0.9), fFace('down'));                    // 17 top feature screen
  add('bookshelf_large', ...img(r, 0.5, -0.86), fFace('down'));               // 18 top wall bookcase
  if (preset === 'dense') {                                                   // ── dense extras ──
    shelfRun(add, ...img(r, -0.4, -0.86), fFace('down'), 2, 1.15);            // 19,20 top dense shelving
    add('plant_large', ...img(r, -0.78, 0.8));                                // 21,22
    add('plant_large', ...img(r, 0.78, 0.8));
  }
};