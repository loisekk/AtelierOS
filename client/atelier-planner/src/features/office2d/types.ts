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

/** Everything the 2D renderer needs for one frame. Items/selection arrive
 *  from React props; agents arrive per-frame from the engine. */
export interface Office2DFrame {
  items: PlacedItemMeta[];
  agents: Agent2D[];
  selectedId: string | null;
  labelsVisible: boolean;
}
