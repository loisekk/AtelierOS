import type { RoomBuilder } from '../layoutTypes';
import { cGaze, img } from '../coords';

// ── RECEPTION v3.4: image-space — curved desk at rot 0 (arc bulges down, toward
// the entrance — a catalog quirk, kept approved), receptionist chair inside the
// nook gazing the entrance, welcome greens, pendant over the desk. ──
export const reception: RoomBuilder = (add, r) => {
  add('reception_desk', ...img(r, 0, 0.15), 0, false, 0, true);  // 1 arc at rot 0, faces the entrance (essential)
  add('chair', ...img(r, 0, -0.12), cGaze('down'));              // 2 receptionist gazes the entrance
  add('pendant', ...img(r, 0, 0.15));                            // 3 pendant over the desk
  add('plant_large', ...img(r, -0.55, 0.72));                    // 4,5 welcome greens
  add('plant_large', ...img(r, 0.55, 0.72));
};