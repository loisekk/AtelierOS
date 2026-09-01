import type { RoomBuilder } from '../layoutTypes';
import { nat, F } from '../coords';
import { backCorners } from '../builders';

// ── MEETING ROOM: one centered table (8 baked chairs ≈ master's ~10), minimal sides ──
export const meetingRoom: RoomBuilder = (add, r, preset) => {
  add('conference_table', ...nat(r, 0, 0), 0);
  add('laptop', ...nat(r, -0.05, 0), 0.3, false, 0.77);
  add('laptop', ...nat(r, 0.05, 0), -0.3, false, 0.77);
  add('wall_screen', ...nat(r, 0, -0.88), F.S);
  if (preset !== 'sparse') {
    add('filing_cabinet', ...nat(r, 0.82, 0.60), F.W);
    backCorners(add, r, 0.44, 0.40);
  }
  if (preset === 'dense') {                                // ── legacy v2.1 ──
    add('whiteboard', ...nat(r, 0.88, 0.0), F.W);
    add('reading_table', ...nat(r, 0, 0.68), 0);
  }
};