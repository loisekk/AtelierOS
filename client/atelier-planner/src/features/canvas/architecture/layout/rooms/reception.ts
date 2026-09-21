import type { RoomBuilder } from '../layoutTypes';
import { cGaze, img } from '../coords';

// ── RECEPTION v3.5 (Phase 13): image-space — curved desk at rot 0 (arc bulges
// down, toward the entrance — a catalog quirk, kept approved), receptionist
// chair inside the nook gazing the entrance, welcome greens, pendant over the
// desk, ATELIER entrance mat at the gate + flanking path lights (emissive,
// glows via PostFX bloom). ──
export const reception: RoomBuilder = (add, r) => {
  add('entrance_mat', ...img(r, 0, 0.86), 0, false, 0, true);     // ATELIER mat at the gate (essential — ships in every preset)
  add('reception_desk', ...img(r, 0, 0.15), 0, false, 0, true);   // 1 arc at rot 0, faces the entrance (essential)
  add('chair', ...img(r, 0, -0.12), cGaze('down'));               // 2 receptionist gazes the entrance
  add('pendant', ...img(r, 0, 0.15));                             // 3 pendant over the desk
  add('plant_large', ...img(r, -0.55, 0.72));                     // 4,5 welcome greens
  add('plant_large', ...img(r, 0.55, 0.72));
  add('path_light', ...img(r, -0.62, 0.9));                       // 6,7 flanking the gate walkway (emissive caps)
  add('path_light', ...img(r, 0.62, 0.9));
};