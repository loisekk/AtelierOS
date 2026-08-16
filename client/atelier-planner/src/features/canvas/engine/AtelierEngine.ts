import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ITEM_CATALOG } from '../../furniture/catalog';
import type { PlacedItemMeta, AgentStatus, AgentConfig } from '../../ai-agents/types';
import { createBuilding } from '../architecture/buildingGenerator';
import { addRoomLabels } from '../architecture/roomLabels';
import { ScreenManager } from './ScreenManager';
import { AgentController } from './AgentController';

interface EngineCallbacks {
  onStatsUpdate: (items: PlacedItemMeta[]) => void;
  onSelect: (id: string | null) => void;
}

export class AtelierEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orthoCamera: THREE.OrthographicCamera;
  private activeCamera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private floor!: THREE.Mesh;
  private selectionRing!: THREE.Mesh;
  private egressGroup: THREE.Group | null = null;
  private egressArrows: THREE.Mesh[] = [];
  private ghostItem: THREE.Group | null = null;

  public placedItems: PlacedItemMeta[] = [];
  private meshes = new Map<string, THREE.Group>();
  private avatars = new Map<string, THREE.Group>();
  private selectedId: string | null = null;
  private draggingId: string | null = null;
  private dragOffset = new THREE.Vector3();

  private brandColor = '#C75D3F';
  private history: { type: 'place' | 'delete'; item: PlacedItemMeta }[] = [];

  public selectedItemType: string | null = null;
  public view: 'office' | 'ceo' | 'command' | 'knowledge' | 'top' = 'office';
  private callbacks: EngineCallbacks;

  private brainCore!: THREE.Mesh;
  private brainParticles!: THREE.Points;
  private brainLight!: THREE.PointLight;

  // Modular Managers
  private screenManager: ScreenManager;
  private agentController: AgentController;

  private animFrameId = 0;
  private onPointerDown!: (e: PointerEvent) => void;
  private onPointerMove!: (e: PointerEvent) => void;
  private onPointerUp!: (e: PointerEvent) => void;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF5F1EA);
    this.scene.fog = new THREE.Fog(0xF5F1EA, 60, 140);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(35, 25, 35); 

    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 30;
    this.orthoCamera = new THREE.OrthographicCamera(-frustumSize * aspect / 2, frustumSize * aspect / 2, frustumSize / 2, -frustumSize / 2, 0.1, 1000);
    this.orthoCamera.position.set(15, 50, 0.01);
    this.activeCamera = this.camera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(15, 0, 0);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.update();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -40; sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40; sunLight.shadow.camera.bottom = -40;
    this.scene.add(sunLight);
    
    const buildingElements = createBuilding(this.scene);
    this.floor = buildingElements.floor;
    this.brainLight = buildingElements.brainLight;
    addRoomLabels(this.scene);
    
    // Initialize Managers
    this.screenManager = new ScreenManager();
    this.screenManager.initHUD(this.scene);
    this.screenManager.initDAGScreen(this.scene);

    this.agentController = new AgentController(this.scene, this.screenManager, this.placedItems, this.meshes, this.avatars);

    this.setupBrainCore();
    this.setupSelectionRing();
    this.setupEventListeners();
    this.animate();
  }

  // Delegated methods to Managers
  public updateDAG(steps: any[]) { this.screenManager.updateDAG(this.scene, steps); }
  public updateAgentLog(agentId: string, log: string) {
    const mesh = this.meshes.get(agentId); if (mesh) this.screenManager.updateAgentLog(mesh, log);
  }
  public startMeeting(agentIds: string[]) { this.agentController.startMeeting(agentIds); }
  public walkAgentTo(agentId: string, dest: string) { this.agentController.walkAgentTo(agentId, dest); }
  public returnAgentToDesk(agentId: string) { this.agentController.returnAgentToDesk(agentId); }
  public updateAgentStatus(id: string, status: AgentStatus) {
    this.agentController.updateAgentStatus(id, status, this.callbacks);
    if (this.selectedId === id) this.setSelected(id);
  }

  private setupBrainCore() {
    const geometry = new THREE.IcosahedronGeometry(1.5, 5);
    const positions = geometry.attributes.position;
    const vector = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i);
      vector.multiplyScalar(1 + Math.sin(vector.x * 4) * 0.1 + Math.cos(vector.y * 3) * 0.1);
      positions.setXYZ(i, vector.x, vector.y, vector.z);
    }
    geometry.computeVertexNormals();

    this.brainCore = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x4c1d95, emissive: 0x7C3AED, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.3 }));
    this.brainCore.position.set(15, 2.5, -15);
    this.brainCore.castShadow = true;
    this.scene.add(this.brainCore);

    const wireframe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0EA5E9, wireframe: true, transparent: true, opacity: 0.5 }));
    this.brainCore.add(wireframe);

    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(600 * 3);
    for(let i=0; i<600*3; i++) posArray[i] = (Math.random() - 0.5) * 5;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    this.brainParticles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x7C3AED, size: 0.08, transparent: true, opacity: 0.8 }));
    this.brainParticles.position.copy(this.brainCore.position);
    this.scene.add(this.brainParticles);
  }

  private setupSelectionRing() {
    this.selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 48), new THREE.MeshBasicMaterial({ color: this.brandColor, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.12;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
  }

  public setBrandColor(color: string) {
    this.brandColor = color;
    (this.selectionRing.material as THREE.MeshBasicMaterial).color.set(color);
    this.placedItems.forEach(item => {
      this.meshes.get(item.id)?.traverse(c => {
        if (c instanceof THREE.Mesh && c.userData.brand) (c.material as THREE.MeshStandardMaterial).color.set(color);
      });
    });
  }

  public setSelectedItemType(type: string | null) {
    this.selectedItemType = type;
    if (type) this.setSelected(null);
    if (this.ghostItem) { this.scene.remove(this.ghostItem); this.ghostItem = null; }
  }

  private getMouseIntersection(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.activeCamera as THREE.PerspectiveCamera);
    return this.raycaster.intersectObject(this.floor)[0];
  }

  private setupEventListeners() {
    let pointerDownPos: { x: number, y: number } | null = null;
    let pointerMoved = false;

    this.onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerMoved = false;
      if (this.selectedItemType) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.activeCamera as THREE.PerspectiveCamera);

      const hits = this.raycaster.intersectObjects(Array.from(this.meshes.values()), true);
      if (hits.length > 0) {
        let n: THREE.Object3D | null = hits[0].object;
        while (n) {
          if (n.userData.placedId) { 
            if (this.selectedId === n.userData.placedId) this.setSelected(null);
            else { this.setSelected(n.userData.placedId); this.draggingId = n.userData.placedId; }
            break; 
          }
          n = n.parent;
        }
        if (this.draggingId) {
          this.controls.enabled = false;
          const hit = this.raycaster.intersectObject(this.floor)[0];
          const item = this.placedItems.find(i => i.id === this.draggingId);
          if (hit && item) this.dragOffset.set(hit.point.x - item.position.x, 0, hit.point.z - item.position.z);
        }
      } else {
        this.setSelected(null);
      }
    };

    this.onPointerMove = (e) => {
      if (pointerDownPos) {
        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        if (dx * dx + dy * dy > 9) pointerMoved = true;
      }

      if (this.draggingId) {
        const hit = this.getMouseIntersection(e);
        if (hit) {
          const item = this.placedItems.find(i => i.id === this.draggingId);
          const mesh = this.meshes.get(this.draggingId);
          if (item && mesh) {
            item.position.x = Math.max(26, Math.min(44, hit.point.x - this.dragOffset.x));
            item.position.z = Math.max(-14, Math.min(14, hit.point.z - this.dragOffset.z));
            mesh.position.set(item.position.x, 0, item.position.z);
          }
        }
        return;
      }

      if (this.selectedItemType) {
        const hit = this.getMouseIntersection(e);
        if (!hit) return;
        if (!this.ghostItem) {
          this.ghostItem = ITEM_CATALOG[this.selectedItemType].factory(this.brandColor);
          this.ghostItem.traverse(c => {
            if (c instanceof THREE.Mesh) {
              const m = c.material.clone() as THREE.MeshStandardMaterial;
              m.transparent = true; m.opacity = 0.45;
              c.material = m; c.castShadow = false;
            }
          });
          this.scene.add(this.ghostItem);
        }
        this.ghostItem.position.set(Math.max(26, Math.min(44, hit.point.x)), 0, Math.max(-14, Math.min(14, hit.point.z)));
      }
    };

    this.onPointerUp = (e) => {
      if (this.draggingId) {
        this.controls.enabled = true;
        if (pointerMoved) this.callbacks.onStatsUpdate(this.placedItems);
        this.draggingId = null; pointerDownPos = null; return;
      }
      if (this.selectedItemType && !pointerMoved && pointerDownPos) {
        const hit = this.getMouseIntersection(e);
        if (hit) this.placeItem(this.selectedItemType, hit.point);
      }
      pointerDownPos = null;
    };

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  public placeItem(type: string, pos: THREE.Vector3, rotY = 0, config?: AgentConfig) {
    const item = ITEM_CATALOG[type];
    const mesh = item.factory(this.brandColor);
    const position = { x: pos.x, z: pos.z };
    mesh.position.set(position.x, 0, position.z);
    mesh.rotation.y = rotY;

    const id = Math.random().toString(36).substr(2, 9);
    mesh.userData.placedId = id;
    this.scene.add(mesh);
    this.meshes.set(id, mesh);

    mesh.traverse(c => {
      if (c.userData.isAvatar) this.avatars.set(id, c as THREE.Group);
      if (c instanceof THREE.Mesh && c.userData.isScreen && (c.userData.screenType === 'terminal' || c.userData.screenType === 'status')) {
        const screenData = this.screenManager.createScreenTexture();
        (c.material as THREE.MeshStandardMaterial).map = screenData.texture;
        (c.material as THREE.MeshStandardMaterial).emissiveMap = screenData.texture;
        (c.material as THREE.MeshStandardMaterial).needsUpdate = true;
        c.userData.screenData = screenData;
      }
    });

    this.screenManager.updateAgentScreenStatus(mesh, 'idle');
    this.screenManager.drawSystemHUD(this.screenManager.dagNodes.filter(n => n.status === 'working').length, 14200, this.placedItems.filter(i => i.role).length);

    const meta: PlacedItemMeta = { id, type, name: config?.name || item.name, price: item.price, seats: item.seats, position, rotation: rotY, role: item.role, status: item.role ? 'idle' : undefined, config };
    this.placedItems.push(meta);
    this.history.push({ type: 'place', item: meta });
    this.callbacks.onStatsUpdate(this.placedItems);
  }

  public setSelected(id: string | null) {
    this.selectedId = id;
    this.selectionRing.visible = !!id;
    if (id) {
      const item = this.placedItems.find(i => i.id === id);
      if (item) {
        this.selectionRing.position.set(item.position.x, 0.12, item.position.z);
        const ringMat = this.selectionRing.material as THREE.MeshBasicMaterial;
        if (item.status === 'working') ringMat.color.set(0x059669);
        else if (item.status === 'error') ringMat.color.set(0xDC2626);
        else if (item.status === 'waiting') ringMat.color.set(0xD97706);
        else if (item.status === 'celebrate') ringMat.color.set(0x0EA5E9);
        else ringMat.color.set(this.brandColor);
      }
    }
    this.callbacks.onSelect(id);
  }

  public updateAgentConfig(id: string, config: AgentConfig) {
    const item = this.placedItems.find(i => i.id === id);
    if (item) { item.config = config; item.name = config.name; this.callbacks.onStatsUpdate(this.placedItems); }
  }

  public deleteSelected() {
    if (!this.selectedId) return;
    const id = this.selectedId;
    const mesh = this.meshes.get(id);
    if (mesh) { this.scene.remove(mesh); this.meshes.delete(id); }
    this.avatars.delete(id);
    const idx = this.placedItems.findIndex(i => i.id === id);
    if (idx > -1) { this.history.push({ type: 'delete', item: this.placedItems[idx] }); this.placedItems.splice(idx, 1); }
    this.setSelected(null);
    this.callbacks.onStatsUpdate(this.placedItems);
  }

  public clearAll() {
    this.meshes.forEach(m => this.scene.remove(m));
    this.meshes.clear(); this.avatars.clear();
    this.placedItems = []; this.history = [];
    this.setSelected(null); this.callbacks.onStatsUpdate(this.placedItems);
  }

  public undo() {
    const last = this.history.pop();
    if (!last) return;
    if (last.type === 'place') {
      const mesh = this.meshes.get(last.item.id);
      if (mesh) this.scene.remove(mesh);
      this.meshes.delete(last.item.id); this.avatars.delete(last.item.id);
      this.placedItems = this.placedItems.filter(i => i.id !== last.item.id);
    } else if (last.type === 'delete') {
      const mesh = ITEM_CATALOG[last.item.type].factory(this.brandColor);
      mesh.userData.placedId = last.item.id;
      mesh.position.set(last.item.position.x, 0, last.item.position.z);
      this.scene.add(mesh); this.meshes.set(last.item.id, mesh);
      mesh.traverse(c => {
        if (c.userData.isAvatar) this.avatars.set(last.item.id, c as THREE.Group);
        if (c instanceof THREE.Mesh && c.userData.isScreen) {
          const screenData = this.screenManager.createScreenTexture();
          (c.material as THREE.MeshStandardMaterial).map = screenData.texture;
          (c.material as THREE.MeshStandardMaterial).emissiveMap = screenData.texture;
          (c.material as THREE.MeshStandardMaterial).needsUpdate = true;
          c.userData.screenData = screenData;
        }
      });
      this.screenManager.updateAgentScreenStatus(mesh, last.item.status || 'idle');
      this.placedItems.push(last.item);
    }
    this.callbacks.onStatsUpdate(this.placedItems);
  }

  public setView(view: 'office' | 'ceo' | 'command' | 'knowledge' | 'top') {
    this.view = view;
    if (view === 'top') {
      this.activeCamera = this.orthoCamera; this.controls.object = this.orthoCamera;
      this.orthoCamera.position.set(15, 50, 0.01); this.controls.target.set(15, 0, 0);
      this.orthoCamera.zoom = 1; this.orthoCamera.updateProjectionMatrix(); this.controls.update(); return;
    }

    this.activeCamera = this.camera; this.controls.object = this.camera;
    let target;
    if (view === 'office') target = { pos: new THREE.Vector3(36, 20, 35), lookAt: new THREE.Vector3(36, 0, 0), fov: 40 };
    else if (view === 'ceo') target = { pos: new THREE.Vector3(15, 6, 0), lookAt: new THREE.Vector3(15, 2.5, -15), fov: 35 };
    else if (view === 'command') target = { pos: new THREE.Vector3(15, 12, 15), lookAt: new THREE.Vector3(15, 1, 2), fov: 45 };
    else if (view === 'knowledge') target = { pos: new THREE.Vector3(-11.5, 12, 15), lookAt: new THREE.Vector3(-11.5, 1, 10), fov: 45 };
    else target = { pos: new THREE.Vector3(15, 60, 0.01), lookAt: new THREE.Vector3(15, 0, 0), fov: 34 };
    
    const start = { pos: this.camera.position.clone(), target: this.controls.target.clone(), fov: this.camera.fov };
    const startTime = performance.now();
    this.controls.enabled = false;
    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / 1200);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(start.pos, target.pos, eased);
      this.controls.target.lerpVectors(start.target, target.lookAt, eased);
      this.camera.fov = start.fov + (target.fov - start.fov) * eased;
      this.camera.updateProjectionMatrix(); this.controls.update();
      if (t < 1) requestAnimationFrame(animate); else this.controls.enabled = true;
    };
    animate();
  }

  public toggleFireEgress(show: boolean) {
    if (show) {
      if (this.egressGroup) return;
      this.egressGroup = new THREE.Group(); this.egressArrows = [];
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(30, 0.02, -14), new THREE.Vector3(30, 0.02, 10), new THREE.Vector3(35, 0.02, 14), new THREE.Vector3(40, 0.02, 14)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.06, 8, false), new THREE.MeshBasicMaterial({ color: this.brandColor, transparent: true, opacity: 0.35 }));
      tube.userData.egressPath = true; this.egressGroup.add(tube);
      for (let i = 0; i < 6; i++) {
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 8), new THREE.MeshBasicMaterial({ color: this.brandColor }));
        arrow.userData.phase = i / 6; arrow.userData.curve = curve;
        this.egressGroup.add(arrow); this.egressArrows.push(arrow);
      }
      this.scene.add(this.egressGroup);
    } else {
      if (this.egressGroup) { this.scene.remove(this.egressGroup); this.egressGroup = null; this.egressArrows = []; }
    }
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = 0.016;
    const t = now * 0.001;

    if (this.egressArrows.length > 0) {
      this.egressArrows.forEach(arrow => {
        const mat = arrow.material as THREE.MeshBasicMaterial;
        arrow.userData.phase = (arrow.userData.phase + dt * 0.35) % 1;
        const pos = arrow.userData.curve.getPoint(arrow.userData.phase);
        const tangent = arrow.userData.curve.getTangent(arrow.userData.phase).normalize();
        arrow.position.copy(pos); arrow.position.y = 0.1;
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        mat.opacity = 0.4 + Math.sin(arrow.userData.phase * Math.PI) * 0.6;
        mat.transparent = true;
      });
    }

    if (this.selectionRing.visible) {
      const s = 1 + Math.sin(now * 0.006) * 0.06;
      this.selectionRing.scale.set(s, s, 1);
    }

    if (this.screenManager.hudMesh) {
      this.screenManager.hudMesh.lookAt(this.activeCamera.position);
      this.screenManager.hudMesh.position.y = 5 + Math.sin(t * 1.5) * 0.1;
    }

    // Update Agents via AgentController
    this.agentController.update(dt, t, this.callbacks);

    if (this.brainCore) {
      this.brainCore.rotation.y += 0.003;
      this.brainParticles.rotation.y -= 0.001;
      this.brainParticles.rotation.x += 0.0005;
      const pulse = 1 + Math.sin(t * 1.5) * 0.05;
      this.brainCore.scale.set(pulse, pulse, pulse);
      this.brainLight.intensity = 3 + Math.sin(t * 2) * 1.5;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  }

  public resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const aspect = w / h; const frustumSize = 30;
    this.orthoCamera.left = -frustumSize * aspect / 2; this.orthoCamera.right = frustumSize * aspect / 2;
    this.orthoCamera.top = frustumSize / 2; this.orthoCamera.bottom = -frustumSize / 2;
    this.orthoCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.meshes.forEach(m => {
      m.traverse(c => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          const mat = Array.isArray(c.material) ? c.material : [c.material];
          mat.forEach(material => material.dispose());
        }
      });
    });
    this.meshes.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}