import type { RoomBuilder } from '../layoutTypes';
import { fFace, img } from '../coords';
import { shelfRun } from '../builders';

// ── AI CLUB LOUNGE v3.4: image-space — 4 sofas gazing the social coffee table,
// top-wall shelving accents, pendant over the center. ──
export const aiClub: RoomBuilder = (add, r, preset) => {
  const c = img(r, 0, 0.1);                                   // social center
  const R = Math.min(r.w, r.d) * 0.26;                        // sofa ring radius (world units)
  add('coffee_table', ...c, 0, false, 0, true);               // 1 social center (essential)
  add('lounge_sofa', c[0] - R, c[1], fFace('down'));          // 2 top sofa — faces the table
  add('lounge_sofa', c[0] + R, c[1], fFace('up'));            // 3 bottom sofa — faces the table
  add('lounge_sofa', c[0], c[1] - R, fFace('right'));         // 4 right sofa — faces the table
  add('lounge_sofa', c[0], c[1] + R, fFace('left'));          // 5 left sofa — faces the table
  shelfRun(add, ...img(r, 0, -0.86), fFace('down'), 2, 1.2);  // 6,7 top-wall shelving accents
  add('pendant', ...img(r, 0, 0.1));                          // 8 pendant over the social center
  add('plant_large', ...img(r, -0.78, 0.8));                  // 9,10 corner greens
  add('plant_large', ...img(r, 0.78, 0.8));
  if (preset === 'dense') {                                   // ── v2.1 side greens ──
    add('plant_large', ...img(r, -0.78, -0.4));               // 11
    add('plant_large', ...img(r, 0.78, -0.4));                // 12
  }
};