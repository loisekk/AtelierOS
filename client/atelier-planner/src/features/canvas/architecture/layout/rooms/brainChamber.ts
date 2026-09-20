import type { RoomBuilder } from '../layoutTypes';
import { gazeDeg, img } from '../coords';
import { podGaze } from '../builders';

// ── CEO BRAIN CORE v4.2: 8-seat ring CONCENTRIC WITH THE MEASURED DAIS.
// The zone rect center (−16.25, 0) is inside the rotunda wall (raycast-verified)
// — anchoring to it sank chairs into the dais edge / wall. All seats now orbit
// BRAIN_ANCHOR at R 3.6 (verified on-dais by raycast: 11.416–11.426, clear
// above) and stand ON the dais via dy = BRAIN_DAIS_Y. ──
import { BRAIN_ANCHOR, BRAIN_DAIS_Y } from '../../SpatialConfig';

export const brainChamber: RoomBuilder = (add, r) => {
  podGaze(add, ...img(r, 0, 0.72), gazeDeg('up'), true);   // 1 CEO desk at front rim, faces the brain (essential)
  const R = 3.6, CX = BRAIN_ANCHOR.x, CZ = BRAIN_ANCHOR.z; // measured dais center
  for (let k = 0; k < 8; k++) {
    const t = ((22.5 + k * 45) * Math.PI) / 180;
    const px = CX + R * Math.sin(t);
    const pz = CZ + R * Math.cos(t);
    // face inward: engine facing = (−sin r, −cos r) → r = atan2(px−CX, pz−CZ)
    add('chair', px, pz, Math.atan2(px - CX, pz - CZ), false, BRAIN_DAIS_Y);
  }
  add('plant_large', ...img(r, -0.7, 0.75));               // bottom-left green
  add('plant_large', ...img(r, 0.7, 0.75));                // bottom-right green
};