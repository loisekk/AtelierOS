import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEM_CATALOG } from '../../furniture/catalog';
import type { PlacedItemMeta, AgentStatus, AgentConfig } from '../../ai-agents/types';
import { addRoomLabels, updateBannerPlacement } from '../architecture/roomLabels';
import { loadBuildingGLB } from '../architecture/BuildingLoader';
import { BOUNDS, BRAIN_ANCHOR, BRAIN_DAIS_Y, BRAIN_FALLBACK, CAMERA_LIMITS, CAMERA_RIGS, EGRESS_POINTS, V, WORLD } from '../architecture/SpatialConfig';
import { RoomBoards } from './RoomBoards';
import { WorkstationRegistry } from '../architecture/WorkstationRegistry';
import { debugDrawZones } from '../architecture/RoomScanner';
import { getAutoLayout, getLayoutStats, DEFAULT_OFFICE_LAYOUT_VERSION } from '../architecture/RoomFurnisher';
import type { LayoutPreset } from '../architecture/RoomFurnisher';
import { buildObjectRegistry, validatePlacedItems, generateRoomStats, exportLayoutToFile } from '../architecture/ObjectRegistry';
import { ScreenManager } from './ScreenManager';
import { AgentController } from './AgentController';
import { PostFX } from './PostFX';
import { setupSky, setupCampus, type CampusEnvironment } from '../architecture/CampusEnvironment';
import type { DagStep } from './ScreenManager';

// ── Rotation (Customize Mode): Q/E = ±15° fine, R/Shift+R = ±45° snap, wheel = ±15° ──
const ROT_FINE = Math.PI / 12; // 15°
const ROT_SNAP = Math.PI / 4;  // 45°
const normRot = (v: number): number => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
const toDeg = (v: number): number => Math.round((normRot(v) * 180) / Math.PI);

interface EngineCallbacks {
  onStatsUpdate: (items: PlacedItemMeta[]) => void;
  onSelect: (id: string | null) => void;
  /** Live ghost yaw (0–360°) — drives the rotation HUD readout while placing. */
  onGhostRotate?: (degrees: number) => void;
}

export class AtelierEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orthoCamera: THREE.OrthographicCamera;
  private activeCamera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private postfx!: PostFX;
  private campus: CampusEnvironment | null = null;
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
  private ghostRotY = 0;
  private zoneDebug: THREE.Group | null = null;
  private anchorDebug: THREE.Group | null = null;
  private validationDebug: THREE.Group | null = null;

  public placedItems: PlacedItemMeta[] = [];
  private meshes = new Map<string, THREE.Group>();
  private avatars = new Map<string, THREE.Group>();
  private selectedId: string | null = null;
  private draggingId: string | null = null;
  private dragOffset = new THREE.Vector3();

  private brandColor = '#B96D3D';
  /** 'place'/'delete' undo — plus 'rotate' entries so rotations are fully undoable. */
  private history: (
    | { type: 'place' | 'delete'; item: PlacedItemMeta }
    | { type: 'rotate'; id: string; before: number; after: number }
  )[] = [];
  private _autoFurnishing = false;
  public customizing = false;

  public selectedItemType: string | null = null;
  public view: 'office' | 'ceo' | 'command' | 'knowledge' | 'top' = 'office';
  private callbacks: EngineCallbacks;

  private brainGroup: THREE.Group | null = null;
  private brainCore: THREE.Mesh | null = null;
  private brainParticles: THREE.Points | null = null;
  private brainLight: THREE.PointLight | null = null;
  private brainAnchor: THREE.Vector3 = BRAIN_FALLBACK.clone();
  private brainAccentLight!: THREE.PointLight;
  private commandAccentLight!: THREE.PointLight;

  private screenManager: ScreenManager;
  private agentController: AgentController;
  private roomBoards: RoomBoards | null = null;
  private roomLabelsGroup: THREE.Group | null = null;
  private workstationRegistry: WorkstationRegistry | null = null;

  /** Active canonical layout preset (v3.2 layout system). */
  public layoutPreset: LayoutPreset = 'default';

  private animFrameId = 0;
  private onPointerDown!: (e: PointerEvent) => void;
  private onPointerMove!: (e: PointerEvent) => void;
  private onPointerUp!: (e: PointerEvent) => void;
  private onWheel!: (e: WheelEvent) => void;
  private onKeyDown!: (e: KeyboardEvent) => void;

  calibrationActive = false;
  private calibQueue: string[] = [];
  private calibPts: Record<string, THREE.Vector3> = {};
  private calibDown = { x: 0, y: 0 };

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    setupSky(this.scene); // Phase 13 H2 — warm dusk-gradient sky + matched fog (CampusEnvironment)

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

    // Phase 13 H1 — cinematic post-processing (bloom + tone-mapped output).
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    // Camera boundary v1: underside & void unreachable (dollhouse top view preserved).
    this.controls.minDistance = CAMERA_LIMITS.minDistance;
    this.controls.maxDistance = CAMERA_LIMITS.maxDistance;
    this.controls.minPolarAngle = CAMERA_LIMITS.minPolarAngle;
    this.controls.maxPolarAngle = CAMERA_LIMITS.maxPolarAngle;
    this.controls.update();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const sunLight = new THREE.DirectionalLight(0xFFE4C0, 2.8); // Phase 13 H4: warmer, softer sun
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -32; sunLight.shadow.camera.right = 32;
    sunLight.shadow.camera.top = 32; sunLight.shadow.camera.bottom = -32;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    this.scene.add(new THREE.HemisphereLight(0xC9A97E, 0x6B5A44, 0.6)); // Phase 13 H4: sky/ground match the dusk palette
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
      // Phase 13 H3/I3 — sky-side campus (grass, trees, entrance walkway,
      // emissive path lights, contact shadow). Needs the loaded building for
      // its bbox, hence here — right after frameBuilding.
      this.campus = setupCampus(this.scene, building);

      WORLD.floorY = (building.userData.floorY as number) ?? 0;
      this.floor.position.y = WORLD.floorY;
      this.selectionRing.position.y = WORLD.floorY + 0.12;
      this.agentController.floorY = WORLD.floorY;
      console.log(`🏗️ Interior floor height synced: ${WORLD.floorY.toFixed(3)}`);

      this.workstationRegistry = new WorkstationRegistry(building);
      this.autoFurnish();
      this.roomLabelsGroup = addRoomLabels(this.scene, WORLD.floorY);
      this.initBrain(this.detectBrainAnchor(building));
      // v4.2 — the DAG wall fixture is GONE: the big screen is now a real
      // Display catalog item (projector_screen), shipped by autoFurnish below.
    }).catch(err => console.error("Failed to load building GLB", err));

    this.screenManager = new ScreenManager();
    this.screenManager.initHUD(this.scene);
    this.agentController = new AgentController(this.scene, this.screenManager, this.placedItems, this.meshes, this.avatars);
    this.roomBoards = new RoomBoards(this.screenManager);

    this.setupSelectionRing();
    this.setupEventListeners();
    this.animate();
  }

  // ════════════════════════════════════════════════════════════════════
  // Phase 13 — Cinematic Environment now lives in ../architecture/CampusEnvironment.ts
  // ════════════════════════════════════════════════════════════════════

  private disposeObject(root: THREE.Object3D, disposeMaterials = false) {
    root.traverse(c => {
      if (c instanceof THREE.Mesh || c instanceof THREE.Points) {
        c.geometry?.dispose();
        if (disposeMaterials) {
          const mat = c.material as THREE.Material | THREE.Material[];
          const mats = Array.isArray(mat) ? mat : [mat];
          mats.forEach(m => m?.dispose());
        }
      }
    });
  }

  private clampX = (x: number) => Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
  private clampZ = (z: number) => Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));

  private frameBuilding(building: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(building);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

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

  private autoFurnish(preset: LayoutPreset = this.layoutPreset) {
    if (!this.workstationRegistry) return;
    this._autoFurnishing = true;
    this.layoutPreset = preset;
    const layout = getAutoLayout(preset);
    layout.forEach(entry => {
      const placedId = this.placeItem(entry.type, new THREE.Vector3(entry.x, WORLD.floorY, entry.z), entry.r ?? 0, undefined, entry.dy ?? 0);
      if (entry.ws) {
        // Meta carries ws too (dump/re-bake parity + delete-undo guard).
        const meta = this.placedItems[this.placedItems.length - 1];
        meta.ws = true;
        this.workstationRegistry!.registerManualWorkstation(new THREE.Vector3(entry.x, WORLD.floorY, entry.z), entry.r ?? 0, placedId);
      }
    });
    this._autoFurnishing = false;
    this.history = [];
    // v4.2.2 — projectors are LAYOUT ITEMS now: the baked default carries the
    // CEO's hand-placed projector_screens (Showcase + Home Workspace); the old
    // hardcoded Command Hub ship is gone (it would duplicate a third one).
    const wsCount = layout.filter(e => e.ws).length;
    console.log(`🪑 Auto-furnished ${layout.length} items · ${wsCount} screen-linked desks (canonical v${DEFAULT_OFFICE_LAYOUT_VERSION}, preset '${preset}').`);
    this.roomBoards?.redraw(this.placedItems, this.meshes); // initial "boards online" state
  }

  // ── RESET OFFICE: restore the canonical default layout ──
  // No arg → resets to the CURRENT preset. Pass a preset to switch:
  //   window.atelierEngine.resetOffice('dense')
  public resetOffice(preset: LayoutPreset = this.layoutPreset) {
    this.clearAll();
    if (this.brainGroup) {
      this.disposeObject(this.brainGroup, true); // brain materials are per-instance — safe
      this.scene.remove(this.brainGroup);
      this.brainGroup = null;
      this.brainCore = null;
      this.brainParticles = null;
      this.brainLight = null;
    }
    this.workstationRegistry = new WorkstationRegistry(this.buildingRoot);
    this.autoFurnish(preset);
    this.initBrain(this.detectBrainAnchor(this.buildingRoot));
    this.validateLayout();
    console.log(`🔄 Office reset to canonical default layout v${DEFAULT_OFFICE_LAYOUT_VERSION} (preset: ${preset})`);
  }

  /** Switch layout preset live and rebuild: 'standard' | 'dense' | 'sparse' */
  public setPreset(preset: LayoutPreset) {
    console.log(`🎚️ Switching layout preset → '${preset}'`);
    this.resetOffice(preset);
  }

  /** Per-room canonical census from the v3.2 layout system (pure data). */
  public showCanonicalCensus(): void {
    const stats = getLayoutStats(this.layoutPreset);
    let total = 0, wsTotal = 0;
    console.log(`%c[Canonical Census — v${DEFAULT_OFFICE_LAYOUT_VERSION}, preset '${this.layoutPreset}']`, 'color:#1976D2;font-weight:bold;font-size:14px');
    console.table(Object.entries(stats).map(([room, s]) => {
      total += s.count; wsTotal += s.ws;
      return {
        Room: room,
        Items: s.count,
        Workstations: s.ws,
        Types: Object.entries(s.types).map(([t, n]) => `${t}×${n}`).join(', '),
      };
    }));
    console.log(`TOTAL: ${total} items · ${wsTotal} screen-linked workstations`);
  }

  // ── ENHANCED: Dump object registry with summary ──
  public dumpObjectRegistry() {
    const reg = buildObjectRegistry(this.buildingRoot);
    const summary = {
      total: reg.length,
      structural: reg.filter(o => o.structural).length,
      furniture: reg.filter(o => o.category === 'FURNITURE').length,
      technology: reg.filter(o => o.category === 'TECHNOLOGY').length,
      decoration: reg.filter(o => o.category === 'DECORATION').length,
    };

    console.log(`📦 Object inventory: ${summary.total} meshes`);
    console.table(summary);

    const json = JSON.stringify(reg, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    console.log('%c📋 Full JSON copied to clipboard', 'color:#2E7D32;font-weight:bold');

    return reg;
  }

  // ── ENHANCED: Validate with visual feedback. Now RETURNS the report. ──
  public validateLayout(showVisual = true) {
    const results = validatePlacedItems(this.placedItems);

    const okCount = results.filter(r => r.level === 'OK').length;
    const warnCount = results.filter(r => r.level === 'WARNING').length;
    const errCount = results.filter(r => r.level === 'ERROR').length;

    console.log(`[Layout Validation] ✓ ${okCount} OK · ⚠ ${warnCount} Warnings · ✗ ${errCount} Errors`);
    results.forEach(r => {
      const icon = r.level === 'OK' ? '✓' : r.level === 'WARNING' ? '⚠' : '✗';
      const color = r.level === 'OK' ? '#2E7D32' : r.level === 'WARNING' ? '#F57C00' : '#D32F2F';
      console.log(`%c${icon} ${r.message}`, `color:${color}`);
    });

    if (showVisual) {
      if (this.validationDebug) {
        this.disposeObject(this.validationDebug, true);
        this.scene.remove(this.validationDebug);
        this.validationDebug = null;
      }

      const group = new THREE.Group();
      results.filter(r => r.level !== 'OK' && r.position).forEach(r => {
        const color = r.level === 'WARNING' ? 0xF57C00 : 0xD32F2F;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
        );
        sphere.position.set(r.position!.x, WORLD.floorY + 2.0, r.position!.z);
        group.add(sphere);
      });

      this.scene.add(group);
      this.validationDebug = group;

      if (warnCount + errCount > 0) {
        console.log(`🔴 Visual markers added at ${warnCount + errCount} problem locations`);
        console.log('Run window.atelierEngine.hideValidation() to remove markers');
      }
    }

    return { ok: okCount, warnings: warnCount, errors: errCount, results };
  }

  public hideValidation(): void {
    if (this.validationDebug) {
      this.disposeObject(this.validationDebug, true);
      this.scene.remove(this.validationDebug);
      this.validationDebug = null;
      console.log('🔵 Validation markers removed');
    }
  }

  // ── Room statistics dashboard (placed items) ──
  public showRoomStats(): void {
    const stats = generateRoomStats(this.placedItems);

    console.log('%c[Room Statistics]', 'color:#1976D2;font-weight:bold;font-size:14px');
    console.table(stats.map(s => ({
      Room: s.label,
      Items: s.itemCount,
      Workstations: s.workstationCount,
      'Area (m²)': s.area,
      'Density (items/10m²)': s.density,
    })));
  }

  // ── Export layout to file ──
  public exportLayout(): void {
    const layout = this.placedItems.map(item => ({
      type: item.type,
      position: item.position,
      rotation: item.rotation,
      role: item.role,
    }));

    exportLayoutToFile(layout, 'atelier-office-layout');
    console.log('💾 Layout exported to file');
  }

  // ── ENHANCED: Show all anchors (workstations + brain + all furniture) ──
  public showDefaultAnchors(showAll = false): void {
    if (this.anchorDebug) {
      this.disposeObject(this.anchorDebug, true);
      this.scene.remove(this.anchorDebug);
      this.anchorDebug = null;
      console.log('🧭 Anchors hidden');
      return;
    }

    const g = new THREE.Group();

    // Workstation anchors (green cones)
    const wsMat = new THREE.MeshBasicMaterial({ color: 0x059669 });
    this.workstationRegistry?.getAllAnchors().forEach(a => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.45, 8), wsMat);
      cone.position.set(a.position.x, WORLD.floorY + 0.25, a.position.z);
      g.add(cone);
    });

    // Brain anchor (purple sphere)
    const brain = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: 0xA56BFF }));
    brain.position.copy(this.brainAnchor);
    g.add(brain);

    // All placed items (if showAll=true)
    if (showAll) {
      const itemMat = new THREE.MeshBasicMaterial({ color: 0xFFA726, transparent: true, opacity: 0.6 });
      this.placedItems.forEach(item => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), itemMat);
        sphere.position.set(item.position.x, WORLD.floorY + 1.5, item.position.z);
        g.add(sphere);
      });
    }

    this.scene.add(g);
    this.anchorDebug = g;

    const wsCount = this.workstationRegistry?.getAllAnchors().length || 0;
    console.log(`🧭 Anchors visible: ${wsCount} workstations (green), 1 brain (purple)${showAll ? `, ${this.placedItems.length} items (orange)` : ''}`);
    console.log('Run window.atelierEngine.showDefaultAnchors() again to hide');
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
      this.disposeObject(this.zoneDebug, true);
      this.scene.remove(this.zoneDebug);
      this.zoneDebug = null;
      console.log('🗺️ Room zones removed');
      return;
    }
    this.zoneDebug = debugDrawZones(this.scene);
  }

  public calibrateBrain() {
    console.log('%c🧠 [BRAIN CALIB] Click the CENTER of the circular chamber...', 'color:#A56BFF;font-weight:bold;font-size:14px');
    const onClick = (e: MouseEvent) => {
      const r = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.buildingRoot.children, true)[0];
      if (!hit) return;
      this.setBrainCenter(hit.point.x, hit.point.z);
      console.log(`🧠 Brain centered at (${hit.point.x.toFixed(2)}, ${hit.point.z.toFixed(2)}).`);
    };
    this.renderer.domElement.addEventListener('click', onClick, { once: true });
  }

  public setBrainCenter(x: number, z: number) {
    if (this.brainGroup) this.brainGroup.position.set(x, WORLD.floorY + BRAIN_DAIS_Y, z);
    this.brainAnchor.set(x, WORLD.floorY + BRAIN_DAIS_Y + 2.4, z);
    this.brainAccentLight.position.set(x, WORLD.floorY + BRAIN_DAIS_Y + 3.9, z);
    this.screenManager.positionHUD(new THREE.Vector3(x, WORLD.floorY + BRAIN_DAIS_Y + 2.4, z));
  }

  private detectBrainAnchor(root: THREE.Object3D): THREE.Vector3 | null {
    const acc = new THREE.Vector3(); let n = 0;
    root.updateMatrixWorld(true);
    root.traverse(nd => {
      if (nd instanceof THREE.Mesh && /brain|neuron|neural|core_/i.test(nd.name)) {
        acc.add(new THREE.Vector3().setFromMatrixPosition(nd.matrixWorld)); n++;
      }
    });
    return n ? acc.divideScalar(n) : null;
  }

  private initBrain(anchor: THREE.Vector3 | null) {
    // v4.2 — BRAIN ON THE MEASURED DAIS. Raycast ground truth: the brain_chamber
    // ZONE rect center (−16.25, 0) is inside the rotunda wall (first hit 14.14),
    // while the raised dais (floorY + BRAIN_DAIS_Y) circles (−11.1, −0.3) with
    // R ≈ 4.7. The brain, the 8-seat chair ring, and the CEO banner all derive
    // from BRAIN_ANCHOR so they can never disagree again.
    const src = new THREE.Vector3(BRAIN_ANCHOR.x, 0, BRAIN_ANCHOR.z);
    void anchor;
    const g = this.brainGroup = new THREE.Group();
    g.position.set(src.x, WORLD.floorY + BRAIN_DAIS_Y, src.z);

    this.brainAccentLight.position.set(src.x, WORLD.floorY + BRAIN_DAIS_Y + 3.9, src.z);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0x554039, roughness: 0.6 }));
    platform.position.set(0, 0.15, 0);
    platform.receiveShadow = true;
    g.add(platform);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06, 12, 48), new THREE.MeshStandardMaterial({ color: 0xA56BFF, emissive: 0xA56BFF, emissiveIntensity: 1.2 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 1.4, 0);
    g.add(ring);

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
      this.brainCore.position.set(0, 2.4, 0);
      this.brainCore.castShadow = true;
      g.add(this.brainCore);
      const wireframe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0EA5E9, wireframe: true, transparent: true, opacity: 0.5 }));
      this.brainCore.add(wireframe);
    }

    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(600 * 3);
    for (let i = 0; i < posArray.length; i++) posArray[i] = (Math.random() - 0.5) * 6;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    this.brainParticles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xC494FF, size: 0.08, transparent: true, opacity: 0.7 }));
    this.brainParticles.position.set(0, 2.4, 0);
    g.add(this.brainParticles);

    // Quirk #1 fix preserved: brainLight is a real PointLight (null-guarded in animate).
    this.brainLight = new THREE.PointLight(0x7C3AED, 3, 15);
    this.brainLight.position.set(0, 2.4, 0);
    g.add(this.brainLight);

    this.scene.add(g);
    this.brainAnchor = new THREE.Vector3(src.x, WORLD.floorY + BRAIN_DAIS_Y + 2.4, src.z);
    this.screenManager.positionHUD(new THREE.Vector3(src.x, WORLD.floorY + BRAIN_DAIS_Y + 2.4, src.z));
  }

  public updateDAG(steps: DagStep[]) { this.screenManager.updateDAG(this.scene, steps); }
  public updateAgentLog(agentId: string, log: string) {
    const mesh = this.meshes.get(agentId); if (mesh) this.screenManager.updateAgentLog(mesh, log);
    const item = this.placedItems.find(i => i.id === agentId);
    if (item) this.roomBoards?.routeLog(item.position, log);
    this.roomBoards?.redraw(this.placedItems, this.meshes);
  }
  public startMeeting(agentIds: string[]) { this.agentController.startMeeting(agentIds); }
  public walkAgentTo(agentId: string, dest: string) { this.agentController.walkAgentTo(agentId, dest); }
  public returnAgentToDesk(agentId: string) { this.agentController.returnAgentToDesk(agentId); }
  public updateAgentStatus(id: string, status: AgentStatus) {
    this.agentController.updateAgentStatus(id, status, this.callbacks);
    if (this.selectedId === id) this.setSelected(id);
    this.roomBoards?.redraw(this.placedItems, this.meshes);
  }

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

  /** Toggle room banner sprites (Labels button). Returns the new state. */
  public setRoomLabelsVisible(visible: boolean): boolean {
    if (this.roomLabelsGroup) this.roomLabelsGroup.visible = visible;
    return visible;
  }

  public getRoomLabelsVisible(): boolean {
    return this.roomLabelsGroup?.visible ?? true;
  }

  public setSelectedItemType(type: string | null) {
    this.selectedItemType = type;
    this.ghostRotY = 0;
    this.callbacks.onGhostRotate?.(0);
    this.controls.enableZoom = !type;
    if (type) this.setSelected(null);
    if (this.ghostItem) {
      this.disposeObject(this.ghostItem, true); // ghost materials are clones — safe
      this.scene.remove(this.ghostItem);
      this.ghostItem = null;
    }
  }

  // ── ROTATION (Customize Mode) ────────────────────────────────────────────────
  /** Rotate the placement ghost. Works even before the ghost mesh exists (keys). */
  public rotateGhost(delta: number) {
    this.ghostRotY += delta;
    if (this.ghostItem) this.ghostItem.rotation.y = this.ghostRotY;
    this.callbacks.onGhostRotate?.(toDeg(this.ghostRotY));
  }

  /**
   * Rotate the selected placed item in place (Customize Mode only).
   * Undoable (pushes a 'rotate' history entry) and workstation-safe: a desk
   * linked to a manual ws anchor re-yaws the seat so agents keep facing the
   * monitors. Returns true when a rotation was applied.
   */
  public rotateSelected(delta: number): boolean {
    if (!this.customizing || !this.selectedId) return false;
    const mesh = this.meshes.get(this.selectedId);
    const item = this.placedItems.find(i => i.id === this.selectedId);
    if (!mesh || !item) return false;
    const before = normRot(item.rotation);
    const after = normRot(before + delta);
    mesh.rotation.y = after;
    item.rotation = after;
    this.workstationRegistry?.setRotByDesk(this.selectedId, after);
    this.history.push({ type: 'rotate', id: item.id, before, after });
    this.callbacks.onStatsUpdate(this.placedItems); // clone-quirk: triggers React re-render
    return true;
  }

  private getMouseIntersection(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.activeCamera);
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
      this.raycaster.setFromCamera(this.mouse, this.activeCamera);

      const hits = this.raycaster.intersectObjects(Array.from(this.meshes.values()), true);
      if (hits.length > 0) {
        let n: THREE.Object3D | null = hits[0].object;
        while (n) {
          if (n.userData.placedId) {
            const pid: string = n.userData.placedId;
            const item = this.placedItems.find(i => i.id === pid);
            if (item?.role) {
              // v4.2 — AGENTS ARE ALWAYS CLICKABLE (select/configure), even
              // with furniture frozen outside Customize Mode. Never draggable.
              if (this.selectedId === item.id) this.setSelected(null);
              else this.setSelected(item.id);
            } else if (this.customizing) {
              // v4.0: furniture is FROZEN outside Customize Mode — clicking it can
              // never select or start a drag; camera orbit/pan/zoom stay fully alive.
              if (this.selectedId === n.userData.placedId) this.setSelected(null);
              else { this.setSelected(n.userData.placedId); this.draggingId = n.userData.placedId; }
            } else {
              this.setSelected(null);
            }
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

      if (this.draggingId && this.customizing) {
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
        this.ghostItem.rotation.y = this.ghostRotY;
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
        if (hit) {
          this.placeItem(this.selectedItemType, hit.point, this.ghostRotY);
          this.ghostRotY = 0;
          this.callbacks.onGhostRotate?.(0);
        }
      }
      pointerDownPos = null;
    };

    this.onWheel = (e) => {
      if (this.selectedItemType && this.ghostItem) {
        e.preventDefault();
        this.rotateGhost((e.deltaY > 0 ? -1 : 1) * ROT_FINE);
      } else if (this.customizing && this.selectedId && !this.selectedItemType) {
        // Selected item in Customize Mode: wheel = fine rotation. Camera zoom is
        // disabled for the selection (see setSelected) so the two never fight.
        e.preventDefault();
        this.rotateSelected((e.deltaY > 0 ? -1 : 1) * ROT_FINE);
      }
    };

    this.onKeyDown = (e) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave Ctrl+Z etc. to App
      const delta =
        e.key === 'r' || e.key === 'R' ? (e.shiftKey ? -ROT_SNAP : ROT_SNAP) :
        e.key === 'q' || e.key === 'Q' ? -ROT_FINE :
        e.key === 'e' || e.key === 'E' ? ROT_FINE : 0;
      if (!delta) return;
      // While placing: rotate the ghost. Otherwise: rotate the selected item
      // in place (Customize Mode only — fixed furniture included, matching
      // deleteSelected's customize-mode permissions).
      if (this.selectedItemType || this.ghostItem) this.rotateGhost(delta);
      else if (this.selectedId && this.customizing) this.rotateSelected(delta);
    };

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public placeItem(type: string, pos: THREE.Vector3, rotY = 0, config?: AgentConfig, yOffset = 0): string {
    const item = ITEM_CATALOG[type];
    const mesh = item.factory(this.brandColor);
    const y = WORLD.floorY + yOffset;

    if (item.role) {
      // v4.2 — AGENT = BODY ONLY, placed WHERE THE CEO POINTS. The old flow
      // teleport-hired agents onto the first free workstation (random-looking
      // placement) and bundled a full desk. Now: seat the agent at the cursor
      // — unless dropped right on a manual workstation desk, then mirror the
      // desk's transform (same platform height, facing its monitors) and link
      // its screens so terminal/status streaming keeps working.
      const deskHit = this.placedItems.find(i =>
        i.ws && this.meshes.has(i.id) &&
        Math.hypot(i.position.x - pos.x, i.position.z - pos.z) < 1.6);
      const deskMesh = deskHit ? this.meshes.get(deskHit.id) : null;
      if (deskMesh && deskHit) {
        // Seat on the desk's chair side (+z local = away from its monitors),
        // facing the desk: the agent group's −z (avatar rotated π) → monitors.
        const s = Math.sin(deskMesh.rotation.y), c = Math.cos(deskMesh.rotation.y);
        mesh.position.set(deskMesh.position.x + s * 0.95, deskMesh.position.y, deskMesh.position.z + c * 0.95);
        mesh.rotation.y = deskMesh.rotation.y;
        const screens: THREE.Mesh[] = [];
        deskMesh.traverse(cc => {
          if (cc instanceof THREE.Mesh && cc.userData.isScreen) screens.push(cc);
        });
        mesh.userData.linkedScreens = screens;
      } else {
        mesh.position.set(this.clampX(pos.x), y, this.clampZ(pos.z));
        mesh.rotation.y = rotY;
      }
    } else {
      mesh.position.set(this.clampX(pos.x), y, this.clampZ(pos.z));
      mesh.rotation.y = rotY;
      if (this._autoFurnishing) mesh.userData.fixed = true;
    }

    const id = Math.random().toString(36).slice(2, 11);
    mesh.userData.placedId = id;
    this.scene.add(mesh);
    this.meshes.set(id, mesh);

    mesh.traverse(c => {
      if (c.userData.isAvatar) this.avatars.set(id, c as THREE.Group);
      if (c instanceof THREE.Mesh && c.userData.isScreen &&
          (c.userData.screenType === 'terminal' || c.userData.screenType === 'status' || c.userData.screenType === 'room_board' || c.userData.screenType === 'dag')) {
        if (!c.userData.screenData) {
          if (c.userData.screenType === 'dag') {
            // v4.2 — projector ADOPTS the shared DAG canvas (one live graph on
            // every projector; no per-instance texture).
            const shared = this.screenManager.adoptDAGCanvas();
            (c.material as THREE.MeshBasicMaterial).map = shared.texture;
            (c.material as THREE.MeshBasicMaterial).needsUpdate = true;
            c.userData.screenData = shared;
            this.screenManager.registerDAGScreen(c);
          } else {
            const screenData = this.screenManager.createScreenTexture();
            (c.material as THREE.MeshStandardMaterial).map = screenData.texture;
            (c.material as THREE.MeshStandardMaterial).emissiveMap = screenData.texture;
            (c.material as THREE.MeshStandardMaterial).needsUpdate = true;
            c.userData.screenData = screenData;
          }
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
      y: mesh.position.y, // preserve stacking height (laptops on tables, pendants)
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
    // While an item is selected in Customize Mode the wheel rotates it —
    // disable camera zoom for that selection so the two never fight.
    this.controls.enableZoom = !this.selectedItemType && !(this.customizing && !!id);
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
    const mesh = this.meshes.get(this.selectedId);
    if (mesh?.userData.fixed && !this.customizing) {
      console.warn("Cannot delete fixed furniture. Enter Customize Mode first.");
      return;
    }

    const id = this.selectedId;
    if (mesh) { this.disposeObject(mesh); this.scene.remove(mesh); this.meshes.delete(id); }
    this.avatars.delete(id);
    const idx = this.placedItems.findIndex(i => i.id === id);
    if (idx > -1) { this.history.push({ type: 'delete', item: this.placedItems[idx] }); this.placedItems.splice(idx, 1); }
    this.releaseWorkstation(id);
    this.workstationRegistry?.removeByDesk(id); // desk gone → its free manual seat goes with it
    this.setSelected(null);
    this.callbacks.onStatsUpdate(this.placedItems);
  }

  public clearAll() {
    // Geometry-only disposal: catalog materials are shared module-level — never dispose them.
    this.meshes.forEach(m => { this.disposeObject(m); this.scene.remove(m); });
    this.meshes.clear(); this.avatars.clear();
    this.placedItems = []; this.history = [];
    this.roomBoards?.clear();
    this.setSelected(null); this.callbacks.onStatsUpdate(this.placedItems);
  }

  public undo() {
    const last = this.history.pop();
    if (!last) return;
    if (last.type === 'place') {
      const mesh = this.meshes.get(last.item.id);
      if (mesh) { this.disposeObject(mesh); this.scene.remove(mesh); }
      this.meshes.delete(last.item.id); this.avatars.delete(last.item.id);
      this.placedItems = this.placedItems.filter(i => i.id !== last.item.id);
    } else if (last.type === 'delete') {
      const mesh = ITEM_CATALOG[last.item.type].factory(this.brandColor);
      mesh.userData.placedId = last.item.id;
      // Restore the EXACT placement — stacking height AND rotated yaw come back
      // as they were (delete-undo used to flatten both).
      mesh.position.set(last.item.position.x, last.item.y ?? WORLD.floorY, last.item.position.z);
      mesh.rotation.y = last.item.rotation;
      this.scene.add(mesh); this.meshes.set(last.item.id, mesh);
      this.screenManager.updateAgentScreenStatus(mesh, last.item.status || 'idle');
      this.placedItems.push(last.item);
    } else if (last.type === 'rotate') {
      // Rotation undo: restore the previous yaw on the item, its mesh, and any
      // linked workstation seat — exactly like place/delete undo above.
      const item = this.placedItems.find(i => i.id === last.id);
      const mesh = this.meshes.get(last.id);
      if (item && mesh) {
        item.rotation = last.before;
        mesh.rotation.y = last.before;
        this.workstationRegistry?.setRotByDesk(last.id, last.before);
      }
    }
    this.callbacks.onStatsUpdate(this.placedItems);
  }

  public setView(view: 'office' | 'ceo' | 'command' | 'knowledge' | 'top') {
    this.view = view;
    if (view === 'top') {
      this.activeCamera = this.orthoCamera; this.controls.object = this.orthoCamera;
      this.orthoCamera.position.set(...CAMERA_RIGS.top.pos); this.controls.target.set(...CAMERA_RIGS.top.lookAt);
      this.orthoCamera.zoom = 1; this.orthoCamera.updateProjectionMatrix(); this.controls.update();
      this.postfx.setCamera(this.orthoCamera); // Phase 13 H1 — ortho top view through the composer
      return;
    }

    this.activeCamera = this.camera; this.controls.object = this.camera;
    this.postfx.setCamera(this.camera); // Phase 13 H1 — back to perspective
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
      if (this.egressGroup) {
        this.disposeObject(this.egressGroup, true);
        this.scene.remove(this.egressGroup);
        this.egressGroup = null; this.egressArrows = [];
      }
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
    // Per-frame camera safety net (Camera boundary v1): even pan-drags that dodge
    // OrbitControls' spherical limits can never take the camera under the slab.
    if (this.camera.position.y < WORLD.floorY + CAMERA_LIMITS.minCameraYOverFloor) {
      this.camera.position.y = WORLD.floorY + CAMERA_LIMITS.minCameraYOverFloor;
    }
    // v4.2.4 — banners re-anchor every frame so they stay pinned to their
    // room's top edge under ANY camera (parallax-compensated ground targets).
    if (this.roomLabelsGroup) updateBannerPlacement(this.roomLabelsGroup, this.activeCamera, WORLD.floorY);
    this.postfx.render(); // Phase 13 H1 — composer render (bloom + tonemapped output)
  };

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
    this.postfx.resize(w, h); // Phase 13 H1 — keep the composer buffers in sync
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('pointerdown', this.onCalibDown);
    this.renderer.domElement.removeEventListener('click', this.onCalibClick);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);

    if (this.ghostItem) { this.disposeObject(this.ghostItem, true); this.scene.remove(this.ghostItem); this.ghostItem = null; }
    if (this.zoneDebug) { this.disposeObject(this.zoneDebug, true); this.scene.remove(this.zoneDebug); this.zoneDebug = null; }
    if (this.anchorDebug) { this.disposeObject(this.anchorDebug, true); this.scene.remove(this.anchorDebug); this.anchorDebug = null; }
    if (this.validationDebug) { this.disposeObject(this.validationDebug, true); this.scene.remove(this.validationDebug); this.validationDebug = null; }
    if (this.egressGroup) { this.disposeObject(this.egressGroup, true); this.scene.remove(this.egressGroup); this.egressGroup = null; this.egressArrows = []; }

    this.controls.dispose();
    this.postfx.dispose(); // Phase 13 H1 — release composer render targets
    if (this.campus) { this.campus.dispose(); this.campus = null; } // campus owns its subtree — out before the generic traverse
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose();
        const mat = obj.material as THREE.Material | THREE.Material[];
        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach(m => {
          if (!m) return;
          Object.values(m).forEach(v => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); });
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