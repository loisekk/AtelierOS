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

export type AddFn = (type: string, x: number, z: number, r?: number, ws?: boolean, dy?: number) => void;

export type RoomBuilder = (add: AddFn, r: RoomRect, preset: LayoutPreset) => void;

export type LayoutPreset = 'standard' | 'dense' | 'sparse';