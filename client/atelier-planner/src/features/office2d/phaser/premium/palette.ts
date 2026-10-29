/** ── Premium 2D palette (v2 sheet) ─────────────────────────────────────
 *  Single token source for the premium bake, sprites and label pills.
 *  Derived from the 3D target (warm beiges, two-tone extruded walls,
 *  violet brain core) + the Atelier brand swatches. No literal colours in
 *  the painters — everything reads from here so the sheet, the live layers
 *  and the 3D keep reading as ONE product.
 *
 *  NEW FILE — office2d/phaser/premium/palette.ts */

export const P2 = {
  // sheet (the drafting-paper stage the model sits on)
  paper: '#F2E8D9',
  grid: 'rgba(146, 113, 78, 0.09)',
  frame: 'rgba(74, 56, 38, 0.40)',
  ink: '#3E2E20',
  inkSoft: 'rgba(62, 46, 32, 0.55)',

  // floors
  floorBase: '#E9DCC3',
  aoTop: 'rgba(74, 52, 28, 0.10)', // inset ambient shadow where floor meets walls
  rooms: {
    home_workspace: '#EBDCC0',
    brain_chamber: '#E6DAE9',
    showcase: '#E8D8C6',
    agent_space: '#ECDFC8',
    command_hub: '#DFE4E0',
    office_floor: '#E9DCC3',
    knowledge_hub: '#E4D8C6',
    meeting_room: '#E8DCC8',
    ai_club: '#E7D6E2',
    reception: '#F0E1C8',
  } as Record<string, string>,

  // per-room floor materials (pattern families) — tuned to stay legible
  // from fit-view down to max zoom (wood planks / carpet stipple / tile grid)
  materials: {
    wood: 'rgba(120, 84, 48, 0.17)',
    woodEdge: 'rgba(120, 84, 48, 0.26)',
    carpet: 'rgba(110, 78, 52, 0.13)',
    tile: 'rgba(120, 100, 70, 0.15)',
  },

  // walls — two-face extrusion (light from NW)
  wallTop: '#F0E4CF',
  wallSide: '#C7B49B',
  wallLine: 'rgba(74, 56, 38, 0.50)',
  wallShadow: 'rgba(60, 40, 20, 0.16)',

  // furniture symbol tokens
  fur: {
    wood: '#D8C4A4',
    woodFace: '#B49B78',
    fabric: '#C9A26B',
    fabricFace: '#A9865B',
    leaf: '#6B8E4E',
    leafDeep: '#577441',
    pot: '#A9714B',
    screen: '#2A2826',
    screenGlow: 'rgba(127, 216, 232, 0.75)',
    ink: 'rgba(62, 46, 32, 0.60)',
  },

  // CEO brain rotunda
  brain: {
    dais: '#F2ECF7',
    daisRing: 'rgba(124, 58, 237, 0.20)',
    glow: 'rgba(167, 95, 255, 0.30)',
  },

  // live layers (JS-side — used by OfficeScene)
  label: {
    bg: 0x2a2826,
    bgAlpha: 0.88,
    fg: '#FFFFFF',
    sub: 'rgba(255, 255, 255, 0.62)',
    accent: 0xb96d3d,
  },
  egress: 0xe2542c,
} as const;
