# System Patterns

## Feature-based frontend layout
```
src/app/App.tsx                    # orchestrator, modals, gateway message routing
src/features/canvas/engine/        # AtelierEngine, ScreenManager, AgentController, Navigation
src/features/canvas/architecture/  # BuildingLoader, SpatialConfig, RoomScanner(zones), RoomFurnisher,
                                   #   WorkstationRegistry, ObjectRegistry, MaterialTheme, roomLabels
src/features/canvas/architecture/layout/       # coords.ts, builders.ts, layoutTypes.ts, roomLayouts.ts (barrel),
                                               #   userDefaultLayout.ts (v4.0 boot layout), rooms/*.ts
src/features/furniture/            # catalog.ts (ITEM_CATALOG), templates.ts (TEMPLATES), factories/avatars.ts
src/features/workspace/            # components (TopBar/LeftPanel/RightPanel/modals/RotationHud), hooks (useAtelier/useGateway/useVoice)
src/features/ai-agents/types.ts    # AgentStatus, PlacedItemMeta, CatalogItem, Task
```

## Layout pipeline (v4.0.0 — RoomFurnisher.ts)
1. **Zones-first**: `ROOM_ZONES` (SpatialConfig) is the ONLY valid ruler;
   `MEASURED` rects are a fallback safety net (inherited v3.3 errors).
2. Preset `default` → `USER_DEFAULT_LAYOUT` (hand-placed world coords, no
   composition, no clamping; point-in-rect census for stats).
3. Presets standard/dense/sparse → per-room `RoomBuilder` under `layout/rooms/`
   (barrel `roomLayouts.ts`); every add passes the **10% inset clamp** of the
   zone rect (`clampToRoom`, ±0.40 of half-axes).
4. Fault-tolerant `add()`: unknown catalog key = warn-once + skip + counted,
   never aborts; `sparse` keeps only `essential` items.
5. Engine `autoFurnish()` places each entry via `placeItem`, sets `meta.ws`,
   registers manual workstations; auto furniture is marked `userData.fixed`
   (deletable only in Customize Mode).

## Image-space authoring (coords.ts, v3.4) — CRITICAL convention
Rooms are authored as the eye sees the reference image, mapped ONCE in `img(r,hx,hz)`:
`hx` = image right → world **−Z**; `hz` = image down → world **+X** (reception side).
Facing helpers: `fFace('up'|'down'|'left'|'right')` for furniture fronts
(+Z at rot 0); `fGaze`/`gazeDeg` for workstation sitter gaze; `cGaze` for
chairs (front = −Z at rot 0). Compass degrees via `deg/degC`
(deg(d) = π − d·π/180 for furniture). NEVER author rooms in raw world axes —
that caused four iterations of transposed furniture.

## Builders (builders.ts)
## Screen architecture — the `isScreen` contract (currently BROKEN)
- **Consumers**: AtelierEngine.placeItem (794: collect screens of a desk for
  avatar linking; 827: create canvas screenData for terminal|status screens),
  ScreenManager.updateAgentScreenStatus ('status'), updateAgentLog ('terminal'),
  and `linkedScreens` fan-out.
- **Producers**: NONE. No catalog factory (mkMonitor, wall_screen) nor any
  other code sets `userData.isScreen` / `screenType` / `screenData`; templates.ts
  does not tag screens either. ⇒ Desk monitor streaming is inert; the only
  live screens are scene-level fixtures: HUD (`initHUD`/`drawSystemHUD`) and
  the DAG screen (`createDAGScreen`, 1024×512 canvas, mount from DAG_SCREEN_MOUNT).
- Rule for fix D: screen meshes need `screenGlowMat.clone()` (shared material!)
  + `userData.isScreen`, `screenType`, and the placeItem texture-init must
  initialize `screenData` for the new type.

## Facing conventions (v4.0 — PRESERVED, verified coords.ts/builders.ts)
The two-convention system survived v3.4/v4.0 intact:
- **Furniture** (+Z front at rot 0): `deg(d) = π − d·π/180`, compass set `F`.
- **Chairs** (−Z front at rot 0): `degC(d) = −d·π/180`, compass set `FC`.
- builders.ts `ring()` composes chair yaw as `degC(angle+180)` (line 50) —
  inward-facing polar seats; `cGaze(d)` is the v3.4 image-space chair helper.
- Any new builder must pick the right convention by item type, never eyeball
  radians — this was the hardest-won knowledge of the layout saga.

## Brain pipeline
`detectBrainAnchor(root)` (AtelierEngine 498) — averages world positions of GLB
meshes matching `/brain|neuron|neural|core_/i`. **v4.0 reality (quirk #1 in
techContext):** the GLB is a single merged `tripo_node_*` mesh, so this returns
**null** and the brain lands at `BRAIN_FALLBACK` (−11.2, 2.6, 0.4) — which is
WHY it can appear on/above the roof: the fallback Y=2.6 + accent light +
HUD chain ride on `WORLD.floorY`, and a mis-synced floorY or the fallback
itself floats the group. The regex tighten (`core_` removal) is hygiene only;
the REAL fix is the zone-center placement in activeContext.md (Edit 2), which
never consults mesh names. `initBrain(anchor)` (509) — group at
`(src.x, WORLD.floorY + BRAIN_DAIS_Y, src.z)`; platform 3.2/3.6 cylinder,
torus ring R2.6 at y1.4, procedural icosahedron brain (only when no anchor),
particles, brainLight PointLight (pulsed in animate), accent light at +3.9,
HUD positioned at dais + 2.4, `brainAnchor` = dais + 2.4.
Manual overrides: `calibrateBrain()` (one click → setBrainCenter) and
`setBrainCenter(x,z)` move group/anchor/light/HUD consistently.
`resetOffice()` disposes brain (per-instance materials — safe) and re-inits.

## Spatial constants (SpatialConfig.ts)
`BOUNDS` ±23.5/±16.5; `WORLD.floorY` (GLB-synced); `BRAIN_FALLBACK` (−11.2, 2.6, 0.4);
`BRAIN_DAIS_Y` 0.73 (dais = base + 0.73); `CAMERA_LIMITS` (minPolar 0 keeps top-down;
maxPolar π·0.485 keeps above horizon; per-frame minCameraYOverFloor 1.2 clamp);
`CAMERA_RIGS` office/ceo/command/knowledge/top; `WAYPOINTS` (BFS nav graph);
`EGRESS_POINTS`; `ROOM_ZONES` v1.2 (see productContext for axis semantics).

## Workstation / agent flow
`WorkstationRegistry(building)`: auto GLB desks + manual registrations
(`registerManualWorkstation(pos, rot, deskItemId)` mirrors `ws` LayoutEntry).
Agent placement: `placeItem(type with item.role)` pulls an available anchor →
sits avatar at desk (y +0.04, z +0.4), collects `linkedScreens`; `AgentController`
handles walking (BFS over WAYPOINTS), meeting start, status updates; status +
logs flow gateway → App.tsx → engine → ScreenManager (isScreen-gated).

## Undo / history & disposal
History entries: `place`, `delete` (restore exact y + rotation), `rotate`
(before/after; restores via `setRotByDesk` on the registry). `clearAll()`
disposes geometry ONLY. `disposeObject(root, disposeMaterials=false)` —
catalog furniture shares module-level materials; per-instance (brain, ghost,
debug) are safe to dispose. Clone-quirk: `onStatsUpdate(this.placedItems)`
must pass fresh arrays/objects so React re-renders.

## Python engine pattern
graph.py (LangGraph TaskState, sub_tasks list, incremental astream), main.py
per-socket Connection outbox queue (single sender task; no concurrent
send_text), run_task streams cognitive_step frames between agent transitions,
sandbox via docker alpine `containers.run(..., remove=True)`, cost frames via
cost_tracker.subscribe filtered to the socket's active_tasks.

