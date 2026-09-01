import type { RoomBuilder } from '../layoutTypes';
import { nat, deg, F, FC } from '../coords';
import { shelfRun, cluster, backCorners } from '../builders';

// ── KNOWLEDGE HUB: north docs wall, west shelving, east study counter, round nook ──
export const knowledgeHub: RoomBuilder = (add, r, preset) => {
  shelfRun(add, ...nat(r, 0, -0.80), F.S, 3, 2.1);
  shelfRun(add, ...nat(r, -0.86, 0.10), F.E, 2, 2.1);
  add('rect_table', ...nat(r, 0.72, 0.15), F.W);
  add('laptop', ...nat(r, 0.72, 0.15), 0.4, false, 0.77);
  add('chair', ...nat(r, 0.55, -0.10), FC.E);
  add('chair', ...nat(r, 0.55, 0.15), FC.E);
  add('chair', ...nat(r, 0.55, 0.40), FC.E);
  cluster(add, ...nat(r, -0.30, 0.10), 3);
  add('lounge_sofa', ...nat(r, 0.10, 0.35), F.E);
  if (preset !== 'sparse') {
    add('lounge_chair', ...nat(r, -0.45, 0.55), deg(45));
    add('archive_server', ...nat(r, 0.72, -0.45), F.W);
    backCorners(add, r, 0.44, 0.44);
  }
  if (preset === 'dense') {
    shelfRun(add, ...nat(r, 0.88, -0.15), F.W, 2, 2.1);
    add('reading_table', ...nat(r, -0.15, -0.35), 0);
  }
};