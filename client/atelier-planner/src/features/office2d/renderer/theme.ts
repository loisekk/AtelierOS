/** 2D architectural-illustration palette. ROOM_FLOOR_2D mirrors MaterialTheme
 *  v4's vertex-paint palette so the same room reads as the SAME room in both
 *  modes — that cross-mode consistency is the whole point of Phase 14. */
export const P2D = {
  paper: '#F1E7D8',
  grid: 'rgba(77, 56, 42, 0.045)',
  ink: '#644530',
  inkSoft: 'rgba(100, 69, 48, 0.30)',
  label: '#4D382A',
  sub: '#A4896D',
  accent: '#B96D3D',
  brainCore: '#7F5BB2',
} as const;

export const ROOM_FLOOR_2D: Record<string, string> = {
  home_workspace: '#B5895C', // warm honey oak
  brain_chamber: '#4E4260', // dusk-violet stone
  showcase: '#C9AA7E',      // pale gallery maple
  agent_space: '#8F8272',   // wool-gray carpet
  command_hub: '#5E6B72',   // smoked slate
  office_floor: '#C2A075',  // classic oak
  knowledge_hub: '#A57C53', // walnut library
  meeting_room: '#B48B62',  // boardroom oak
  ai_club: '#9C6F58',      // terracotta lounge
  reception: '#D6BCA0',    // entrance limestone
};

export const STATUS_2D: Record<string, string> = {
  idle: '#A4896D', working: '#4E9B67', waiting: '#D09A46',
  error: '#B85C52', walking: '#49D8EC', celebrate: '#0EA5E9',
};

/** Furniture symbol palette (14.3) — the catalog master materials, softened
 *  for the sheet: oak E0CDA9 · table 9A6B48 · woodDark 5A4030 · fabric 4A4A4A
 *  · metal 8A8A8A · screenGlow 5FE7F2 · bookMats / greenMats sets on top. */
export const PF2D = {
  top: '#F7F1E6',        // white furniture tops (desks, rect & reading tables)
  oak: '#E6D2AC',        // oak (round table)
  wood: '#C9A26E',       // table mat (conference, benches)
  woodDark: '#8F6A48',   // dark wood (bookshelves, coffee table, trunk)
  fabric: '#9E938A',     // upholstery
  fabricDeep: '#867869', // sofa backs / arms
  metal: '#B9B4AE',      // legs, pedestals, server cabinets
  screen: '#4A423A',     // bezels, keyboard, dark bodies
  glow: '#5FE7F2',       // emissive screens (exact catalog emissive)
  glowSoft: 'rgba(95, 231, 242, 0.45)',
  leaf: '#4E7B4C',       // greenMats
  leafDeep: '#3E6E44',
  matFill: 'rgba(88, 55, 36, 0.30)', // entrance mat
  spines: ['#9A5F49', '#7B5240', '#8E6552', '#6B7B5C', '#AF7E5C'], // bookMats
} as const;
