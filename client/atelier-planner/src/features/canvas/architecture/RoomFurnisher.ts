import { ROOM_ZONES } from './SpatialConfig';

export interface LayoutEntry { type: string; x: number; z: number; r?: number; ws?: boolean; dy?: number; }

export function getAutoLayout(): LayoutEntry[] {
  const c = (id: string) => {
    const z = ROOM_ZONES.find(r => r.id === id)!;
    return {
      x: (z.minX + z.maxX) / 2,
      z: (z.minZ + z.maxZ) / 2,
      w: z.maxX - z.minX,
      d: z.maxZ - z.minZ
    };
  };

  const L: LayoutEntry[] = [];
  const add = (type: string, x: number, z: number, r = 0, ws = false, dy = 0) => L.push({ type, x, z, r, ws, dy });

  // ── OFFICE FLOOR (mid-right) ──
  const of = c('office_floor');
  add('workstation_set', of.x - of.w * 0.15, of.z - of.d * 0.15, 0, true);
  add('workstation_set', of.x + of.w * 0.15, of.z - of.d * 0.15, 0, true);
  add('workstation_set', of.x - of.w * 0.15, of.z + of.d * 0.15, Math.PI, true);
  add('workstation_set', of.x + of.w * 0.15, of.z + of.d * 0.15, Math.PI, true);
  add('wall_screen', of.x, of.z - of.d * 0.35, 0);
  add('plant_large', of.x + of.w * 0.35, of.z + of.d * 0.35);

  // ── AGENT SPACE (mid-left) ──
  const as = c('agent_space');
  add('workstation_set', as.x - as.w * 0.15, as.z - as.d * 0.15, 0, true);
  add('workstation_set', as.x + as.w * 0.15, as.z - as.d * 0.15, 0, true);
  add('workstation_set', as.x - as.w * 0.15, as.z + as.d * 0.15, Math.PI, true);
  add('workstation_set', as.x + as.w * 0.15, as.z + as.d * 0.15, Math.PI, true);
  add('wall_screen', as.x, as.z - as.d * 0.35, 0);
  add('plant_large', as.x + as.w * 0.35, as.z + as.d * 0.35);

  // ── MEETING ROOM (bottom-center) ──
  const mr = c('meeting_room');
  add('conference_table', mr.x, mr.z, 0);
  add('wall_screen', mr.x, mr.z - mr.d * 0.35, 0);
  add('plant_large', mr.x - mr.w * 0.35, mr.z + mr.d * 0.35);
  add('plant_large', mr.x + mr.w * 0.35, mr.z + mr.d * 0.35);

  // ── KNOWLEDGE HUB (bottom-left) ──
  const kh = c('knowledge_hub');
  add('bookshelf_large', kh.x - kh.w * 0.35, kh.z - kh.d * 0.2, Math.PI / 2);
  add('bookshelf_large', kh.x - kh.w * 0.35, kh.z + kh.d * 0.2, Math.PI / 2);
  add('bookshelf_large', kh.x, kh.z + kh.d * 0.35, Math.PI);
  add('archive_server', kh.x + kh.w * 0.35, kh.z - kh.d * 0.35, -Math.PI / 2);
  add('reading_table', kh.x + kh.w * 0.15, kh.z - kh.d * 0.1, 0);
  add('plant_large', kh.x + kh.w * 0.35, kh.z + kh.d * 0.35);

  // ── AI CLUB LOUNGE (bottom-right) ──
  const ac = c('ai_club');
  add('lounge_sofa', ac.x, ac.z + ac.d * 0.2, Math.PI);
  add('coffee_table', ac.x, ac.z - ac.d * 0.1, 0);
  add('lounge_chair', ac.x - ac.w * 0.3, ac.z, Math.PI / 2);
  add('lounge_chair', ac.x + ac.w * 0.3, ac.z, -Math.PI / 2);
  add('counter', ac.x + ac.w * 0.35, ac.z - ac.d * 0.22, -Math.PI / 2);
  add('espresso_machine', ac.x + ac.w * 0.35, ac.z - ac.d * 0.22, -Math.PI / 2, false, 0.2);
  add('plant_large', ac.x - ac.w * 0.35, ac.z + ac.d * 0.35);

  // ── RECEPTION (front-center) ──
  const rc = c('reception');
  add('reception_desk', rc.x, rc.z - rc.d * 0.1, 0);
  add('plant_large', rc.x - rc.w * 0.35, rc.z - rc.d * 0.2);
  add('plant_large', rc.x + rc.w * 0.35, rc.z - rc.d * 0.2);
  add('waiting_bench', rc.x - rc.w * 0.25, rc.z + rc.d * 0.25, Math.PI / 2);
  add('waiting_bench', rc.x + rc.w * 0.25, rc.z + rc.d * 0.25, -Math.PI / 2);

  // ── COMMAND HUB (center) ──
  const ch = c('command_hub');
  add('command_console', ch.x, ch.z, Math.PI);
  add('wall_screen', ch.x, ch.z - ch.d * 0.35, 0);

  // ── HOME WORKSPACE (top-left) ──
  const hw = c('home_workspace');
  add('workstation_set', hw.x - hw.w * 0.1, hw.z - hw.d * 0.1, 0, true);
  add('bookshelf_large', hw.x - hw.w * 0.35, hw.z + hw.d * 0.2, Math.PI / 2);
  add('reading_table', hw.x + hw.w * 0.2, hw.z + hw.d * 0.1, 0);
  add('plant_large', hw.x + hw.w * 0.35, hw.z - hw.d * 0.3);

  // ── WORKSPACE SHOWCASE (top-right) ──
  const sc = c('showcase');
  add('rect_table', sc.x - sc.w * 0.1, sc.z - sc.d * 0.1, 0);
  add('rect_table', sc.x + sc.w * 0.2, sc.z + sc.d * 0.2, -0.4);
  add('wall_screen', sc.x, sc.z - sc.d * 0.35, 0);
  add('plant_large', sc.x + sc.w * 0.35, sc.z + sc.d * 0.35);

  // ── BRAIN CHAMBER (top-center) ──
  const bc = c('brain_chamber');
  add('plant_large', bc.x - bc.w * 0.3, bc.z + bc.d * 0.35);
  add('plant_large', bc.x + bc.w * 0.3, bc.z + bc.d * 0.35);

  return L;
}