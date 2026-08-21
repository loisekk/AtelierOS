import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEM_CATALOG } from '../../furniture/catalog';
import { createAgentAvatar } from '../../furniture/factories/avatars';
import type { PlacedItemMeta, AgentStatus, AgentConfig } from '../../ai-agents/types';
import { addRoomLabels } from '../architecture/roomLabels';
import { loadBuildingGLB } from '../architecture/BuildingLoader';
import { BOUNDS, BRAIN_FALLBACK, CAMERA_RIGS, EGRESS_POINTS, MEETING_ANCHOR, V, WORLD } from '../architecture/SpatialConfig';
import { WorkstationRegistry } from '../architecture/WorkstationRegistry';
import { debugDrawZones } from '../architecture/RoomScanner';
import { getAutoLayout } from '../architecture/RoomFurnisher';
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

  private buildingRoot!: THREE.Group;
  private floor!: THREE.Mesh;
  private selectionRing!: THREE.Mesh;
  private plinth!: THREE.Mesh;
  private egressGroup: THREE.Group | null = null;
  private egressArrows: THREE.Mesh[] = [];
  private ghostItem: THREE.Group | null = null;
  private zoneDebug: THREE.Group | null = null;
  private buildingTopY = 6;

  public placedItems: PlacedItemMeta[] = [];
  private meshes = new Map<string, THREE.Group>();
  private avatars = new Map<string, THREE.Group>();
  private selectedId: string | null = null;
  private draggingId: string | null = null;
  private dragOffset = new THREE.Vector3();

  private brandColor = '#B96D3D';
  private history: { type: 'place' | 'delete'; item: PlacedItemMeta }[] = [];
  private _autoFurnishing = false;
  public customizing = false; // NEW: Locks furniture by default

  public selectedItemType: string | null = null;
  public view: 'office' | 'ceo' | 'command' | 'knowledge' | 'top' = 'office';
  private callbacks: EngineCallbacks;

  private brainCore: THREE.Mesh | null = null;
  private brainParticles: THREE.Points | null = null;
  private brainLight: THREE.PointLight | null = null;
  private brainAnchor: THREE.Vector3 = BRAIN_FALLBACK.clone();
  private brainAccentLight!: THREE.PointLight;
  private commandAccentLight!: THREE.PointLight;

  private screenManager: ScreenManager;
  private agentController: AgentController;
  private workstationRegistry: WorkstationRegistry | null = null;

  private animFrameId = 0;
  private onPointerDown!: (e: PointerEvent) => void;
  private onPointerMove!: (e: PointerEvent) => void;
  private onPointerUp!: (e: PointerEvent) => void;

  calibrationActive = false;
  private calibQueue: string[] = [];
  private calibPts: Record<string, THREE.Vector3> = {};
  private calibDown = { x: 0, y: 0 };

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8A644C);
    this.scene.fog = new THREE.Fog(0x8A644C, 80, 200);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(30, 24, 30);

    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 52;
    this.orthoCamera = new THREE.OrthographicCamera(-frustumSize * aspect / 2, frustumSize * aspect / 2, frustumSize / 2, -frustumSize / 2, 0.1, 1000);
    this.orthoCamera.position.set(0, 60, 0.01);
    this.activeCamera = this.camera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.update();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const sunLight = new THREE.DirectionalLight(0xFFF2DE, 2.5);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -32; sunLight.shadow.camera.right = 32;
    sunLight.shadow.camera.top = 32; sunLight.shadow.camera.bottom = -32;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    this.scene.add(new THREE.HemisphereLight(0xFFF6E8, 0x8A644C, 0.55));
    this.scene.add(new THREE.AmbientLight(0xF2D0AD, 0.15));

    this.brainAccentLight = new THREE.PointLight(0xA95CFF, 5, 20);
    this.brainAccentLight.position.copy(BRAIN_FALLBACK);
    this.scene.add(this.brainAccentLight);

    this.commandAccentLight = new THREE.PointLight(0x49D8EC, 3, 15);
    this.commandAccentLight.position.set(0, 4, 1.5);
    this.scene.add(this.commandAccentLight);

    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x4B372B, roughness: 0.7, metalness: 0.1 });
    this.plinth = new THREE.Mesh(new THREE.BoxGeometry(90, 1, 60), plinthMat);
    this.plinth.position.set(0, -0.5, 0);
    this.plinth.receiveShadow = true;
    this.scene.add(this.plinth);

    this.buildingRoot = new THREE.Group();
    this.scene.add(this.buildingRoot);

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ visible: false });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    loadBuildingGLB('/models/agent-build-v1.glb').then((building) => {
      this.buildingRoot.add(building);
      this.frameBuilding(building);

      WORLD.floorY = (building.userData.floorY as number) ?? 0;
      this.floor.position.y = WORLD.floorY;
      this.selectionRing.position.y = WORLD.floorY + 0.12;
      this.agentController.floorY = WORLD.floorY;
      console.log(`🏗️ Interior floor height synced: ${WORLD.floorY.toFixed(3)}`);

      this.workstationRegistry = new WorkstationRegistry(building);

      this.autoFurnish();

      // FIX: Pass WORLD.floorY directly. roomLabels.ts will add the config Y offset.
      addRoomLabels(this.scene, WORLD.floorY);

      this.initBrain(this.detectBrainAnchor(building));
      this.screenManager.createDAGScreen(this.scene, MEETING_ANCHOR);
    }).catch(err => console.error("Failed to load building GLB", err));

    this.screenManager = new ScreenManager();
    this.screenManager.initHUD(this.scene);
    this.agentController = new AgentController(this.scene, this.screenManager, this.placedItems, this.meshes, this.avatars);

    this.setupSelectionRing();
    this.setupEventListeners();
    this.animate();
  }

  private clampX = (x: number) => Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
  private clampZ = (z: number) => Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));

  private frameBuilding(building: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(building);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    this.buildingTopY = size.y;

    this.controls.target.copy(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

    this.camera.position.set(center.x + distance * 0.5, center.y + distance * 0.6, center.z + distance);
    this.camera.updateProjectionMatrix();
    this.controls.update();

    this.plinth.scale.set((size.x + 10) / 90, 1, (size.z + 10) / 60);
    this.plinth.position.set(center.x, -0.5, center.z);
  }

  private autoFurnish() {
    if (!this.workstationRegistry) return;
    this._autoFurnishing = true;
    const layout = getAutoLayout();
    layout.forEach(entry => {
      const placedId = this.placeItem(entry.type, new THREE.Vector3(entry.x, WORLD.floorY, entry.z), entry.r ?? 0, undefined, entry.dy ?? 0);
      if (entry.ws) {
        this.workstationRegistry!.registerManualWorkstation(new THREE.Vector3(entry.x, WORLD.floorY, entry.z), entry.r ?? 0, placedId);
      }
    });
    this._autoFurnishing = false;
    this.history = [];
    console.log(`🪑 Auto-furnished ${layout.length} items across all rooms.`);
  }

  public logCameraPosition() {
    const pos = this.camera.position;
    const target = this.controls.target;
    console.log(`--- CAMERA COORDINATES ---`);
    console.log(`Position: (X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)})`);
    console.log(`Target: (X: ${target.x.toFixed(1)}, Y: ${target.y.toFixed(1)}, Z: ${target.z.toFixed(1)})`);
    console.log(`-------------------------`);
  }

  public debugRooms() {
    if (this.zoneDebug) {
      this.scene.remove(this.zoneDebug);
      this.zoneDebug.traverse(c => {
        const m = c as THREE.Mesh;
        if ((m as any).isMesh) {
          m.geometry?.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
      this.zoneDebug = null;
      console.log('🗺️ Room zones removed');
      return;
    }
    this.zoneDebug = debugDrawZones(this.scene);
  }

  private detectBrainAnchor(root: THREE.Object3D): THREE.Vector3 | null {
    const acc = new THREE.Vector3(); let n = 0;
    root.updateMatrixWorld(true);
    root.traverse(nd => {
      if ((nd as THREE.Mesh).isMesh && /brain|neuron|neural|core_/i.test(nd.name)) {
        acc.add(new THREE.Vector3().setFromMatrixPosition(nd.matrixWorld)); n++;
      }
    });
    return n ? acc.divideScalar(n) : null;
  }

  private initBrain(anchor: THREE.Vector3 | null) {
    const p = this.brainAnchor = anchor ?? BRAIN_FALLBACK.clone();
    this.brainAccentLight.position.copy(p); this.brainAccentLight.position.y += 1.5;

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0x554039, roughness: 0.6 }));
    platform.position.set(p.x, WORLD.floorY + 0.15, p.z);
    platform.receiveShadow = true;
    this.scene.add(platform);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06, 12, 48), new THREE.MeshStandardMaterial({ color: 0xA56BFF, emissive: 0xA56BFF, emissiveIntensity: 1.2 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(p.x, WORLD.floorY + 1.4, p.z);
    this.scene.add(ring);

    if (!anchor) {
      const geometry = new THREE.IcosahedronGeometry(2.0, 5);
      const positions = geometry.attributes.position;
      const vector = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        vector.fromBufferAttribute(positions, i);
        vector.multiplyScalar(1 + Math.sin(vector.x * 4) * 0.1 + Math.cos(vector.y * 3) * 0.1);
        positions.setXYZ(i, vector.x, vector.y, vector.z);
      }
      geometry.computeVertexNormals();
      this.brainCore = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x4c1d95, emissive: 0x7C3AED, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.3 }));
      this.brainCore.position.copy(p); this.brainCore.position.y = WORLD.floorY + 2.4;
      this.brainCore.castShadow = true;
      this.scene.add(this.brainCore);
      const wireframe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0EA5E9, wireframe: true, transparent: true, opacity: 0.5 }));
      this.brainCore.add(wireframe);
    }

    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(600 * 3);
    for (let i = 0; i < posArray.length; i++) posArray[i] = (Math.random() - 0.5) * 6;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    this.brainParticles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xC494FF, size: 0.08, transparent: true, opacity: 0.7 }));
    this.brainParticles.position.copy(p); this.brainParticles.position.y = WORLD.floorY + 2.4;
    this.scene.add(this.brainParticles);

    this.brainLight = new THREE.PointLight(0x7C3AED, 3, 15);
    this.brainLight.position.copy(p); this.brainLight.position.y = WORLD.floorY + 2.4;
    this.scene.add(this.brainLight);

    this.screenManager.positionHUD(p);
  }

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

  // NEW: Toggle Customize Mode
  public setCustomizing(mode: boolean) {
    this.customizing = mode;
    if (!mode) this.setSelected(null);
  }

  private setupSelectionRing() {
    this.selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 48), new THREE.MeshBasicMaterial({ color: this.brandColor, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = WORLD.floorY + 0.12;
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
    let pointerDownPos: { x: number; y: number } | null = null;
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
            // NEW: If furniture is fixed and we aren't customizing, ignore click
            if (n.userData.fixed && !this.customizing) break;

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
            item.position.x = this.clampX(hit.point.x - this.dragOffset.x);
            item.position.z = this.clampZ(hit.point.z - this.dragOffset.z);
            mesh.position.set(item.position.x, WORLD.floorY, item.position.z);
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
        this.ghostItem.position.set(this.clampX(hit.point.x), WORLD.floorY, this.clampZ(hit.point.z));
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

  public placeItem(type: string, pos: THREE.Vector3, rotY = 0, config?: AgentConfig, yOffset = 0): string {
    const item = ITEM_CATALOG[type];
    let mesh = item.factory(this.brandColor);
    const y = WORLD.floorY + yOffset; 

    if (item.role) {
      const anchor = this.workstationRegistry?.getAvailableWorkstation();
      if (anchor) {
        if (anchor.manual && anchor.deskItemId) {
          const deskMesh = this.meshes.get(anchor.deskItemId);
          if (deskMesh) {
            const screens: THREE.Mesh[] = [];
            deskMesh.traverse(c => {
              if (c instanceof THREE.Mesh && c.userData.isScreen) screens.push(c);
            });
            mesh = new THREE.Group();
            const av = createAgentAvatar(this.brandColor);
            av.position.set(0, 0.49, 0.4);
            mesh.add(av);
            mesh.position.copy(anchor.position);
            mesh.rotation.y = anchor.rotY ?? 0;
            mesh.userData.linkedScreens = screens; 
          }
        } else {
          mesh.position.set(anchor.position.x, y, anchor.position.z);
          mesh.rotation.y = rotY;
        }
        mesh.userData.workstationId = anchor.id;
      } else {
        console.warn('No available workstation. Placing employee at cursor position.');
        mesh.position.set(this.clampX(pos.x), y, this.clampZ(pos.z));
        mesh.rotation.y = rotY;
      }
    } else {
      mesh.position.set(this.clampX(pos.x), y, this.clampZ(pos.z));
      mesh.rotation.y = rotY;
      // NEW: Mark as fixed if auto-furnishing
      if (this._autoFurnishing) mesh.userData.fixed = true;
    }

    const id = Math.random().toString(36).slice(2, 11);
    mesh.userData.placedId = id;
    this.scene.add(mesh);
    this.meshes.set(id, mesh);

    mesh.traverse(c => {
      if (c.userData.isAvatar) this.avatars.set(id, c as THREE.Group);
      if (c instanceof THREE.Mesh && c.userData.isScreen && (c.userData.screenType === 'terminal' || c.userData.screenType === 'status')) {
        if (!c.userData.screenData) {
          const screenData = this.screenManager.createScreenTexture();
          (c.material as THREE.MeshStandardMaterial).map = screenData.texture;
          (c.material as THREE.MeshStandardMaterial).emissiveMap = screenData.texture;
          (c.material as THREE.MeshStandardMaterial).needsUpdate = true;
          c.userData.screenData = screenData;
        }
      }
    });

    this.screenManager.updateAgentScreenStatus(mesh, 'idle');
    if (!this._autoFurnishing) this.screenManager.drawSystemHUD(this.screenManager.dagNodes.filter(n => n.status === 'working').length, 14200, this.placedItems.filter(i => i.role).length);

    const meta: PlacedItemMeta = {
      id, type,
      name: config?.name || item.name,
      price: item.price, seats: item.seats,
      position: { x: mesh.position.x, z: mesh.position.z },
      rotation: rotY, role: item.role,
      status: item.role ? 'idle' : undefined,
      config
    };
    this.placedItems.push(meta);
    if (!this._autoFurnishing) this.history.push({ type: 'place', item: meta });
    this.callbacks.onStatsUpdate(this.placedItems);
    
    return id;
  }

  public setSelected(id: string | null) {
    this.selectedId = id;
    this.selectionRing.visible = !!id;
    if (id) {
      const item = this.placedItems.find(i => i.id === id);
      if (item) {
        this.selectionRing.position.set(item.position.x, WORLD.floorY + 0.12, item.position.z);
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

  public releaseWorkstation(id: string) {
    const item = this.placedItems.find(i => i.id === id);
    if (item && item.role) {
      const mesh = this.meshes.get(id);
      if (mesh && mesh.userData.workstationId) {
        this.workstationRegistry?.releaseWorkstation(mesh.userData.workstationId);
      }
    }
  }

  public deleteSelected() {
    if (!this.selectedId) return;
    
    // NEW: Prevent deletion if fixed and not customizing
    const mesh = this.meshes.get(this.selectedId);
    if (mesh?.userData.fixed && !this.customizing) {
        console.warn("Cannot delete fixed furniture. Enter Customize Mode first.");
        return;
    }

    const id = this.selectedId;
    if (mesh) { this.scene.remove(mesh); this.meshes.delete(id); }
    this.avatars.delete(id);
    const idx = this.placedItems.findIndex(i => i.id === id);
    if (idx > -1) { this.history.push({ type: 'delete', item: this.placedItems[idx] }); this.placedItems.splice(idx, 1); }
    this.releaseWorkstation(id);
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
      mesh.position.set(last.item.position.x, WORLD.floorY, last.item.position.z);
      this.scene.add(mesh); this.meshes.set(last.item.id, mesh);
      mesh.traverse(c => {
        if (c.userData.isAvatar) this.avatars.set(last.item.id, c as THREE.Group);
        if (c instanceof THREE.Mesh && c.userData.isScreen) {
          if (!c.userData.screenData) {
            const screenData = this.screenManager.createScreenTexture();
            (c.material as THREE.MeshStandardMaterial).map = screenData.texture;
            (c.material as THREE.MeshStandardMaterial).emissiveMap = screenData.texture;
            (c.material as THREE.MeshStandardMaterial).needsUpdate = true;
            c.userData.screenData = screenData;
          }
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
      this.orthoCamera.position.set(...CAMERA_RIGS.top.pos); this.controls.target.set(...CAMERA_RIGS.top.lookAt);
      this.orthoCamera.zoom = 1; this.orthoCamera.updateProjectionMatrix(); this.controls.update(); return;
    }

    this.activeCamera = this.camera; this.controls.object = this.camera;
    let pos: THREE.Vector3, lookAt: THREE.Vector3, fov: number;
    if (view === 'ceo') {
      lookAt = this.brainAnchor.clone();
      pos = this.brainAnchor.clone().add(new THREE.Vector3(0, 3, 13));
      fov = 35;
    } else {
      const rig = CAMERA_RIGS[view];
      pos = V(rig.pos); lookAt = V(rig.lookAt); fov = rig.fov;
    }

    const start = { pos: this.camera.position.clone(), target: this.controls.target.clone(), fov: this.camera.fov };
    const startTime = performance.now();
    this.controls.enabled = false;
    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / 1200);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(start.pos, pos, eased);
      this.controls.target.lerpVectors(start.target, lookAt, eased);
      this.camera.fov = start.fov + (fov - start.fov) * eased;
      this.camera.updateProjectionMatrix(); this.controls.update();
      if (t < 1) requestAnimationFrame(animate); else this.controls.enabled = true;
    };
    animate();
  }

  public toggleFireEgress(show: boolean) {
    if (show) {
      if (this.egressGroup) return;
      this.egressGroup = new THREE.Group(); this.egressArrows = [];
      const curve = new THREE.CatmullRomCurve3(EGRESS_POINTS.map(V));
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

  startCalibration() {
    this.calibQueue = ['office_center', 'office_door', 'spine_center', 'meeting_door', 'meeting_table', 'knowledge_door', 'knowledge_center', 'ceo_door', 'ceo_center'];
    this.calibPts = {};
    this.calibrationActive = true;
    this.renderer.domElement.addEventListener('pointerdown', this.onCalibDown);
    this.renderer.domElement.addEventListener('click', this.onCalibClick);
    console.log('%c[CALIB] Click the floor of: ' + this.calibQueue[0], 'color:#B96D3D;font-weight:bold;font-size:14px');
  }

  private onCalibDown = (e: PointerEvent) => { this.calibDown = { x: e.clientX, y: e.clientY }; };

  private onCalibClick = (e: MouseEvent) => {
    if (!this.calibrationActive || this.calibQueue.length === 0) return;
    if (Math.hypot(e.clientX - this.calibDown.x, e.clientY - this.calibDown.y) > 5) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.buildingRoot.children, true)[0];
    if (!hit) return;
    const key = this.calibQueue.shift()!;
    this.calibPts[key] = hit.point.clone();
    console.log(`✅ ${key} → (${hit.point.x.toFixed(2)}, ${hit.point.y.toFixed(2)}, ${hit.point.z.toFixed(2)})` + (this.calibQueue.length ? ` — next: ${this.calibQueue[0]}` : ''));
    if (this.calibQueue.length === 0) this.finishCalibration();
  };

  private finishCalibration() {
    this.calibrationActive = false;
    this.renderer.domElement.removeEventListener('pointerdown', this.onCalibDown);
    this.renderer.domElement.removeEventListener('click', this.onCalibClick);
    const body = Object.entries(this.calibPts).map(([k, p]) => `  ${k}: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],`).join('\n');
    const out = `// Paste into SpatialConfig.ts → WAYPOINTS\n${body}`;
    navigator.clipboard.writeText(out).catch(() => {});
    console.log(out);
    console.log('%c📋 Copied — paste into SpatialConfig.ts AND into the chat', 'color:#2E7D32;font-weight:bold');
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
        arrow.position.copy(pos); arrow.position.y = WORLD.floorY + 0.1;
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
      this.screenManager.hudMesh.position.y = this.screenManager.hudBaseY + Math.sin(t * 1.5) * 0.1;
    }

    this.agentController.update(dt, t, this.callbacks);

    if (this.brainCore) {
      this.brainCore.rotation.y += 0.003;
      const pulse = 1 + Math.sin(t * 1.5) * 0.05;
      this.brainCore.scale.set(pulse, pulse, pulse);
    }
    if (this.brainParticles) {
      this.brainParticles.rotation.y -= 0.001;
      this.brainParticles.rotation.x += 0.0005;
    }
    if (this.brainLight) this.brainLight.intensity = 3 + Math.sin(t * 2) * 1.5;

    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  }

  public resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const aspect = w / h; const frustumSize = 52;
    this.orthoCamera.left = -frustumSize * aspect / 2; this.orthoCamera.right = frustumSize * aspect / 2;
    this.orthoCamera.top = frustumSize / 2; this.orthoCamera.bottom = -frustumSize / 2;
    this.orthoCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onCalibDown);
    this.renderer.domElement.removeEventListener('click', this.onCalibClick);
    window.removeEventListener('pointerup', this.onPointerUp);

    if (this.zoneDebug) { this.scene.remove(this.zoneDebug); this.zoneDebug = null; }

    this.controls.dispose();
    this.scene.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh || (obj as any).isPoints || (obj as any).isSprite) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m: any) => {
          if (!m) return;
          Object.values(m).forEach((v: any) => { if (v && v.isTexture) v.dispose(); });
          m.dispose();
        });
      }
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}