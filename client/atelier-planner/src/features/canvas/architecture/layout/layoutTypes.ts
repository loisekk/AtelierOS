export interface LayoutEntry {
  type: string;
  x: number;
  z: number;
  r?: number;
  ws?: boolean; // isWorkstation (for screen linking)
  dy?: number;  // vertical offset (e.g., laptops on tables)
}

export interface RoomRect {
  x: number; // center
  z: number; // center
  w: number; // full width
  d: number; // full depth
}

// v3.3 — the trailing `essential` slot carries per-item options:
// the sparse preset keeps ONLY essential items (composer-side fault-tolerant filter).
export type AddFn = (type: string, x: number, z: number, r?: number, ws?: boolean, dy?: number, essential?: boolean) => void;

/** v3.3 — structured per-item options (documented companion of the AddFn essential slot). */
export interface AddOptions {
  scale?: number;
  ws?: boolean;        // registers a workstation anchor (agent seating + navigation)
  essential?: boolean; // survives the 'sparse' preset
  meta?: Record<string, unknown>;
}

export type RoomBuilder = (add: AddFn, r: RoomRect, preset: LayoutPreset) => void;

export type LayoutPreset = 'standard' | 'dense' | 'sparse';