import type { PlacedItemMeta, AgentStatus } from '../ai-agents/types';

/** Live projection of an employee — produced by the engine each frame,
 *  never stored here. This is a RENDERING projection, not app state. */
export interface Agent2D {
  id: string;
  name: string;
  role?: string;
  status: AgentStatus | undefined;
  x: number;            // world coords — renderer owns the world→screen transform
  z: number;
  seated: boolean;
}

/** Everything the 2D renderer needs for one frame. Items/selection/brain
 *  arrive from React props; agents + t arrive per-frame from the renderer. */
export interface Office2DFrame {
  items: PlacedItemMeta[];
  agents: Agent2D[];
  selectedId: string | null;
  labelsVisible: boolean;
  /** Phase 14.5 — [Zones] overlay toggle: dims the plan and outlines every
   *  zone rect. A visual layer only, no state mutation. */
  zonesVisible: boolean;
  /** Phase 14.5 — currently hovered agent id (drives the glyph highlight;
   *  the tooltip itself is DOM, rendered by Office2DCanvas). */
  hoveredId: string | null;
  /** Phase 14.4 — CEO Brain live state: true while any task runs or a HITL
   *  approval pends (drives the rotunda core pulse + neural orbits). */
  brainActive: boolean;
  /** Phase 14.4 — renderer clock in SECONDS. Drives every live animation in
   *  the 2D view; supplied by Office2DRenderer's rAF loop, never by React. */
  t: number;
}