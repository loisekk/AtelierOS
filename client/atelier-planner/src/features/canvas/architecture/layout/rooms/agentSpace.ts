import type { RoomBuilder } from '../layoutTypes';
import { gazeDeg, img } from '../coords';
import { cluster, podGaze } from '../builders';

// ── AGENT SPACE v3.4: image-space — two round clusters up top, a 3-desk bottom
// row gazing up at them, a 2-desk mid row gazing down. 7 stations standard. ──
export const agentSpace: RoomBuilder = (add, r, preset) => {
  cluster(add, ...img(r, -0.45, -0.42), 4, true);           // 1-5  W1 — round, 4 chairs (essential)
  cluster(add, ...img(r, 0.45, -0.42), 4, true);            // 6-10 W2 — round, 4 chairs (essential)
  podGaze(add, ...img(r, -0.6, 0.55), gazeDeg('up'));       // 11 W3 — bottom row, sitters face the clusters
  podGaze(add, ...img(r, 0.0, 0.55), gazeDeg('up'));        // 12 W4
  podGaze(add, ...img(r, 0.6, 0.55), gazeDeg('up'));        // 13 W5
  podGaze(add, ...img(r, -0.68, 0.05), gazeDeg('down'));    // 14 W6 — mid row, faces the bottom row
  podGaze(add, ...img(r, 0.68, 0.05), gazeDeg('down'));     // 15 W7
  if (preset === 'dense') {                                 // ── v2.1 extras ──
    cluster(add, ...img(r, 0, 0.05), 4);                    // 16-20 mid-row filler cluster
    add('plant_large', ...img(r, -0.8, 0.8));               // 21
    add('plant_large', ...img(r, 0.8, 0.8));                // 22
  }
};