import * as THREE from 'three';

export interface WorkstationAnchor {
  id: string;
  position: THREE.Vector3;
  occupied: boolean;
  manual?: boolean;
  rotY?: number;
  deskItemId?: string; // Links to the placedItem ID of the desk
}

export class WorkstationRegistry {
  private anchors: WorkstationAnchor[] = [];

  constructor(building: THREE.Object3D) {
    building.updateMatrixWorld(true);
    const _box = new THREE.Box3();
    const _size = new THREE.Vector3();

    building.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.name || '').toLowerCase();

      const isDeskName = /desk|workstation|console/.test(name);
      let isDeskShape = false;
      if (!isDeskName) {
        _box.setFromObject(mesh);
        _box.getSize(_size);
        isDeskShape = _size.y < 0.15 && _box.min.y > 0.4 && _box.min.y < 1.2 && _size.x > 0.8 && _size.z > 0.4;
      }
      if (!isDeskName && !isDeskShape) return;

      const position = new THREE.Vector3();
      mesh.getWorldPosition(position);
      if (this.tooClose(position)) return;

      this.anchors.push({
        id: `glb_${this.anchors.length}_${position.x.toFixed(1)}_${position.z.toFixed(1)}`,
        position: position.clone(),
        occupied: false,
      });
    });
  }

  private tooClose(p: THREE.Vector3, minDist = 1.4): boolean {
    return this.anchors.some(a => a.position.distanceTo(p) < minDist);
  }

  registerManualWorkstation(position: THREE.Vector3, rotY = 0, deskItemId?: string): string {
    const id = `manual_${this.anchors.length}_${position.x.toFixed(1)}_${position.z.toFixed(1)}`;
    this.anchors.push({ id, position: position.clone(), occupied: false, manual: true, rotY, deskItemId });
    return id;
  }

  getAvailableWorkstation(): WorkstationAnchor | null {
    const available = this.anchors.find(a => !a.occupied);
    if (available) {
      available.occupied = true;
      return available;
    }
    return null;
  }

  releaseWorkstation(id: string): void {
    const anchor = this.anchors.find(a => a.id === id);
    if (anchor) anchor.occupied = false;
  }

  removeWorkstation(id: string): void {
    this.anchors = this.anchors.filter(a => !(a.id === id && !a.occupied));
  }

  getAllAnchors(): WorkstationAnchor[] { return [...this.anchors]; }
}