import { BOUNDS } from '../../canvas/architecture/SpatialConfig';

/** Orthographic 2D camera — pan, cursor-anchored wheel zoom, fit-to-office.
 *  Owns ONLY the world↔screen transform; never touches application state. */
export class Camera2D {
  /** World point at screen center. */
  cx = 0; cz = 0;
  /** Pixels per world unit. */
  scale = 10;
  private W = 1; private H = 1;

  get width() { return this.W; }
  get height() { return this.H; }

  /** keep=false (or first sizing) → refit the whole office; keep=true →
   *  preserve user pan/zoom across window resizes. */
  resize(w: number, h: number, keep = false) {
    const first = this.W <= 1;
    this.W = w; this.H = h;
    if (!keep || first) this.fit();
  }

  fit() {
    const spanX = BOUNDS.maxX - BOUNDS.minX;
    const spanZ = BOUNDS.maxZ - BOUNDS.minZ;
    this.cx = (BOUNDS.minX + BOUNDS.maxX) / 2;
    this.cz = (BOUNDS.minZ + BOUNDS.maxZ) / 2;
    this.scale = Math.min(this.W / spanX, this.H / spanZ) * 0.92;
  }

  pan(dxScreen: number, dyScreen: number) {
    this.cx -= dxScreen / this.scale;
    this.cz -= dyScreen / this.scale;
  }

  zoomAt(px: number, py: number, factor: number) {
    const before = this.screenToWorld(px, py);
    this.scale = Math.max(3, Math.min(60, this.scale * factor));
    const after = this.screenToWorld(px, py);
    this.cx += before.x - after.x;
    this.cz += before.z - after.z;
  }

  toScreenX(wx: number) { return (wx - this.cx) * this.scale + this.W / 2; }
  toScreenY(wz: number) { return (wz - this.cz) * this.scale + this.H / 2; }

  screenToWorld(px: number, py: number) {
    return { x: (px - this.W / 2) / this.scale + this.cx, z: (py - this.H / 2) / this.scale + this.cz };
  }
}
