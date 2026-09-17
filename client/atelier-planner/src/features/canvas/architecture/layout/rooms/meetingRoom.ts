import type { RoomBuilder } from '../layoutTypes';
import { fFace, img } from '../coords';

// ── MEETING ROOM v3.4: image-space — ONE centered table (8 baked chairs), top
// presentation wall, corner greens, left bookcase, dense bottom lounge. ──
export const meetingRoom: RoomBuilder = (add, r, preset) => {
  add('conference_table', ...img(r, 0, 0), fFace('down'), false, 0, true);  // 1 centered table (essential, 8 baked chairs)
  add('wall_screen', ...img(r, 0, -0.9), fFace('down'));                    // 2 presentation wall
  add('plant_large', ...img(r, -0.78, -0.8));                               // 3-6 corner greens
  add('plant_large', ...img(r, 0.78, -0.8));
  add('plant_large', ...img(r, -0.78, 0.8));
  add('plant_large', ...img(r, 0.78, 0.8));
  add('bookshelf_large', ...img(r, -0.86, 0), fFace('right'));              // 7 left-wall bookcase
  if (preset === 'dense') {                                                 // ── v2.1 dense lounge ──
    add('lounge_sofa', ...img(r, 0, 0.82), fFace('up'));                    // 8 bottom lounge sofa
    add('coffee_table', ...img(r, 0, 0.62));                                // 9 lounge coffee table
  }
};