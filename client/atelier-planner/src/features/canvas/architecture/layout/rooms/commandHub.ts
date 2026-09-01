import type { RoomBuilder } from '../layoutTypes';
import { nat, F, FC } from '../coords';
import { backCorners } from '../builders';

// ── COMMAND HUB: north console, 2 operators, centered table (8 baked chairs) ──
export const commandHub: RoomBuilder = (add, r, preset) => {
  add('command_console', ...nat(r, 0, -0.65), 0);           // approved orientation
  add('chair', ...nat(r, -0.15, -0.35), FC.N);              // operator 1 — faces the console
  add('chair', ...nat(r, 0.15, -0.35), FC.N);               // operator 2
  add('conference_table', ...nat(r, 0, 0.10), 0);           // centered beneath the console
  if (preset !== 'sparse') {
    add('archive_server', ...nat(r, -0.80, 0.30), F.E);
    add('archive_server', ...nat(r, 0.80, 0.30), F.W);
    backCorners(add, r, 0.44, 0.38);
  }
  if (preset === 'dense') add('filing_cabinet', ...nat(r, 0.88, -0.10), F.W); // legacy v2.1
};