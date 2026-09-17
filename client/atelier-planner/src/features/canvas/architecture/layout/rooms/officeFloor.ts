import type { RoomBuilder } from '../layoutTypes';
import { fFace, gazeDeg, img } from '../coords';
import { podGaze, shelfRun } from '../builders';

// ── OFFICE FLOOR v3.4: image-space — exactly 6 desks in 2×3 face-to-face rows
// across the aisle (north row gazes down, south row gazes up). ──
export const officeFloor: RoomBuilder = (add, r, preset) => {
  const xs = [-0.6, 0, 0.6] as const;
  xs.forEach((hx) => {
    podGaze(add, ...img(r, hx, -0.45), gazeDeg('down'), hx !== 0);  // north row gazes down (outer 4 essential)
    podGaze(add, ...img(r, hx, 0.25), gazeDeg('up'));               // south row gazes up
  });
  shelfRun(add, ...img(r, -0.86, -0.1), fFace('right'), 2, 1.2);    // left-wall shelving run
  add('plant_large', ...img(r, 0.8, -0.78));                        // corner greens
  add('plant_large', ...img(r, 0.8, 0.78));
  add('wall_screen', ...img(r, 0.88, 0.2), fFace('left'));          // right-wall screen faces the room
  if (preset === 'dense') {                                         // ── v3.3 row-C extension ──
    xs.forEach((hx) => {
      podGaze(add, ...img(r, hx, 0.75), gazeDeg('up'));             // row C desk
    });
    add('plant_large', ...img(r, -0.8, 0.78));                      // 16
  }
};