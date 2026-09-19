# Progress

## Working-tree state (as of this bank's creation)
- HEAD `ecf19b1` "Add zones-overlay-top-v341 calibration reference".
- Modified (uncommitted): App.tsx, ai-agents/types.ts, RoomFurnisher.ts,
  SpatialConfig.ts, WorkstationRegistry.ts, layout/layoutTypes.ts,
  AtelierEngine.ts, ScreenManager.ts, LeftPanel.tsx, hooks/useAtelier.ts.
- Untracked: layout/userDefaultLayout.ts, components/RotationHud.tsx,
  user-layout.json.
- Recent history: v3.4 image-space re-authors of all 10 room layouts,
  zones-first furnishing + label pipeline wiring, Phase 12 router integration
  (model tiers, cost tracking), per-socket outbox + .env loading, router tests.

## Completed (phases 0–12)
- Core AI OS: LangGraph DAG decomposition, Docker micro-VM sandbox, HITL.
- LiteLLM dynamic router (FAST/SMART/HEAVY), live cost tracking, router tests.
- Procedural + GLB building loaders (Meshopt), V2 PBR material theme.
- Workstation registry (auto + manual), room zoning, spatial calibration,
  floor-height sync from GLB.
- RoomFurnisher v3.4.1: zones-first rects, image-space room authoring,
  10% inset clamp, fault-tolerant add, essential/sparse, per-room census.
- v4.0 boot layout: CEO hand-placed office baked to USER_DEFAULT_LAYOUT.
- Canvas textures: HUD (system analytics) + Command Hub DAG screen
  (GLB-probed mount, per-socket cost frames feed it).
- Camera boundary v1 (no under-floor, top-down preserved), per-frame clamp.
- Customize Mode: frozen furniture outside mode, rotate undo (fine/snap/wheel),
  RotationHud ghost degrees, layout export.

## Known broken / in flight
- **isScreen never set anywhere** → desk monitor streaming + linked screens
  inert (repaired by Task D work). VERIFIED via grep.
- **detectBrainAnchor `core_` regex** → brain on roof. VERIFIED (line 502).
- **shelfRun bounds-blind** → wall clipping in 7 room files. VERIFIED call-sites.
- Live-scene staleness: v4.0/v3.4 layout data may not be loaded in the running
  scene until `resetOffice()`.

## Task board
- [x] Decode + root-cause verification for A–D (this bank).
- [x] Audit-revision pass: npm→bun lock, quirks catalog (12), facing
      conventions verified preserved, E/F design decisions captured,
      router.py existence confirmed (Test-Path True),
      **tripo_node single-mesh discovery** (root cause of A revised).
- [ ] Commit green-state checkpoint (13 files of v4.0 work + memory-bank/,
      one file per commit per user instruction; then `bun run typecheck` +
      `bun run lint` to establish where the dirty tree actually stands).
- [ ] A: initBrain zone-center placement (immune to tripo_node null anchor)
      + regex tighten.
- [ ] C: `shelfWall` clamping builder + swap 7 call-sites.
- [ ] D: catalog screen userData (+ clones), drawRoomBoard, roomLogs routing,
      updateRoomBoards + hookups.
- [ ] Verify: typecheck 0/0, lint 0/0, resetOffice + validateLayout, visual
      screenshots (chamber, shelves, boards).
- [ ] F: theme files from user (index.css, TopBar, LeftPanel, RightPanel,
      CanvasViewport) → apply.
- [ ] E: fullscreen board viewer (deferred until D confirmed; design in
      activeContext.md).
- [ ] Phase 13: real CLI adapters (Bun.spawn opencode/claude).
- [ ] Phase 14: navmesh pathfinding (@recast-navigation/three).

## Decisions & conventions worth keeping
- ZONES-first layout: ROOM_ZONES is the only valid ruler; MEASURED rects are
  fallback only (they inherited v3.3 misplacement).
- Rooms authored in image space (img()/fFace) — never raw world axes.
- Shared catalog materials: geometry-only disposal; clone before texture work.
- Keep engine LayoutEntry shape unchanged across layout refactors.
