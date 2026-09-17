import type { RoomBuilder } from '../layoutTypes';
import { gazeDeg, img } from '../coords';
import { podGaze, ring } from '../builders';

// ── CEO BRAIN CORE v3.4: image-space — CEO desk at the bottom rim gazing up at
// the brain, 8-seat inward polar ring centered on the measured brain center
// (dump: chairs at R≈3.8–4.4 around (−16.25, 0) = the MEASURED rect center). ──
export const brainChamber: RoomBuilder = (add, r) => {
  podGaze(add, ...img(r, 0, 0.72), gazeDeg('up'), true);   // 1 CEO desk at front rim, faces the brain (essential)
  ring(add, r, { count: 8, radius: 0.72, phase: 0.5 });    // 2-9 8-seat inward polar ring (R = 0.36 × min dimension)
  add('plant_large', ...img(r, -0.7, 0.75));               // 10 bottom-left green
  add('plant_large', ...img(r, 0.7, 0.75));                // 11 bottom-right green
};