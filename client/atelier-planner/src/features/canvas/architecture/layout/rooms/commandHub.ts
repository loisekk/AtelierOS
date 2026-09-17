import type { RoomBuilder } from '../layoutTypes';
import { fFace, img } from '../coords';
import { shelfRun } from '../builders';

// ── COMMAND HUB v3.4: image-space — curved console up top facing the room,
// central command table, twin dispatch screens, right-wall shelving. ──
export const commandHub: RoomBuilder = (add, r, preset) => {
  add('reception_desk', ...img(r, 0, -0.55), fFace('down'), false, 0, true);   // 1 curved console faces the room (essential)
  add('conference_table', ...img(r, 0, 0.22), fFace('down'), false, 0, true);  // 2 central command table (8 baked chairs, essential)
  add('wall_screen', ...img(r, -0.35, -0.88), fFace('down'));                  // 3 dispatch screen left of the console
  add('wall_screen', ...img(r, 0.35, -0.88), fFace('down'));                   // 4 dispatch screen right of the console
  shelfRun(add, ...img(r, 0.86, 0.2), fFace('left'), 2, 1.2);                  // 5,6 right-wall shelving run
  add('plant_large', ...img(r, -0.8, 0.8));                                    // 7 corner greens
  add('plant_large', ...img(r, 0.8, 0.8));                                     // 8
  if (preset === 'dense') {                                                    // ── v2.1 side greens ──
    add('plant_large', ...img(r, -0.8, -0.2));                                 // 9
    add('plant_large', ...img(r, 0.8, -0.2));                                  // 10
  }
};