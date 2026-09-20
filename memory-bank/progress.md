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
- [x] Commit green-state checkpoint: **21 commits, exactly 1 file each**
      (11 v4.0 files + 7 memory-bank files + gitignore/types bundling note:
      first accidental 3-file commit was squashed away by the sequential
      re-commit chain after soft reset).
- [x] A: initBrain zone-center placement (immune to tripo_node null anchor)
      + BRAIN_DAIS_Y preserved — committed "AtelierEngine: zone-center brain
      placement (v4.1) + RoomBoards hooks".
- [x] C: `shelfWall` clamping builder + swap 7 call-sites — committed
      (builders + 6 room files).
- [x] D: RoomBoards.ts module (self-contained: zone lookup, room log buffers,
      lazy canvas init, drawBoard), catalog isScreen/screenType tagging +
      screenGlowMat.clone() (repairs Phase 11), engine hooks in
      updateAgentLog/updateAgentStatus/autoFurnish/clearAll + placeItem
      room_board init — all committed.
- [x] Gates: `bun run typecheck` exit 0 · `bun run lint` exit 0 (post A+C+D).
- [x] Browser-independent work complete; banner system v2 shipped:
      roomLabels.ts rewritten (banners derived from ROOM_ZONES centers,
      transparent dark-glass pill style, returns toggleable group),
      RoomBoards header mirrors banner (title + accent subtitle),
      AtelierEngine.setRoomLabelsVisible(), TopBar "Labels" toggle wired
      through App state. Gates: typecheck 0, lint 0. Committed ×5 (1 file each).
- [x] Browser verify: resetOffice() → validateLayout() → screenshots
      (chamber A+B, shelves C, banners centered + transparent + toggle);
      manual log test:
      `updateAgentLog('<agentId>','TEST: board routing works')` → board lights up.
- [x] v4.2 GEOMETRIC GROUND TRUTH PASS (banner/brain/chair re-anchor):
      raycast + vertex-fit measurement of the merged tripo GLB revealed:
      · brain_chamber ZONE rect center (−16.25, 0) is INSIDE the rotunda wall
        (raycast first-hit 14.14 = wall top);
      · true rotunda dais: level = floorY + 0.73 spanning x −15…−7, center
        triangulated (wall Kasa fit −10.65/−0.33 · chord fit −11.1/0.4 ·
        dais probes) → **BRAIN_ANCHOR = (−11.1, −0.3)** in SpatialConfig;
      · the ENTIRE east half (NE library / SE lounge clusters) is REAL
        interior floor (footprint x −21.9…22.5, z −21.1…20.3) — the 41
        OUTSIDE-building errors were false (strict rect test).
      Fixes committed ×10 (1 file each): BRAIN_ANCHOR export · initBrain
      anchored to it · brainChamber dais ring (R 3.6, dy 0.73, verified
      on-dais 11.416–11.426) · userDefaultLayout + user-layout.json ring
      re-anchor (6→8 chairs, parity) · roomLabels v3 (furniture-centroid
      banners + brain pin) · inferRoom + zoneIdAt nearest-zone fallback
      (10m edge distance). Gates 0/0. validateLayout: **182 OK · 0 err ·
      0 warn** (first fully-clean run). Top-view screenshot verified:
      brain centered on dais, 8 chairs ringing it, all 10 banners over
      their rooms.
      NOTE: user-layout.json is DOUBLE-ENCODED (a JSON string wrapping
      escaped JSON) — scripted edits must operate on the escaped form.
- [x] v4.2.1 AGENT + PROJECTOR OVERHAUL (7 commits, gates 0/0, live-verified):
      · AGENTS = BODY ONLY — frontend_desk factory spawns chair + seated
        humanoid (userData.isAgent/agentRole), no bundled workstation;
      · POINT-SPAWN — role branch of placeItem seats the agent AT the clicked
        point (getAvailableWorkstation teleport-hire removed); drop ≤1.6m from
        a manual ws desk → mirrors desk transform + links its screens;
      · AVATAR ANATOMY — old knee pivoted shin −90° (legs stuck out at seat
        height = "ugly legs"); now thigh horizontal → knee, shin vertical →
        floor, shoe flat; arms reach keyboard (+z); avatar rotated π so eyes
        face monitors; returnAgentToDesk uses the same seated pose;
      · ALWAYS-CLICKABLE agents outside Customize Mode (select/configure,
        never draggable) in onPointerDown picking;
      · PROJECTOR SCREEN — the wall-welded DAG fixture (createDAGScreen) is
        GONE; new `projector_screen` Display catalog item (placeable, movable,
        rotatable, deletable) adopts the SHARED DAG canvas via
        ScreenManager.adoptDAGCanvas()/registerDAGScreen(); updateDAG redraws
        all registered screens; autoFurnish ships one at Command Hub
        (−4.5, −2.4, dy 0.735 = hub platform height, facing hub);
      · BANNERS restyled to image-3 (compact dark pill 0.82α, title, divider,
        accent sub);
      · live verify: agent at exact click point (6,12), projector streaming
        DAG canvas, validateLayout 184 OK · 0 err · 0 warn.
- [x] v4.2.2 CEO-BAKE + BOARD/BANNER RE-ANCHOR (5 commits, gates 0/0):
      · DEFAULT = CEO's LIVE arrangement — dumped placedItems (182 items,
        12 ws desks, 2 hand-placed projector_screen: Showcase @dy 0.735,
        Home Workspace @dy 0) → regenerated userDefaultLayout.ts v1.1 +
        user-layout.json parity. NOTE: PS generation must escape
        `` `$true/`$false `` or literals leak into the TS (fixed post-hoc).
      · PROJECTORS ARE LAYOUT ITEMS — autoFurnish's hardcoded Command Hub
        projector ship REMOVED (would duplicate a third one every reset).
      · BOARDS: RoomBoards.zoneIdForScreen — a wall_screen displays the room
        it FACES INTO (plane normal = +z rotated by rotY, probe 2.2m along
        facing). Boundary boards at rect edges were all resolving to the same
        neighbor room → identical content ("two rooms loading the same").
        Live result: ai_club×2, knowledge×2, meeting, reception — all distinct.
      · BANNERS: back to GEOMETRIC room centers (zone rect centers, brain
        pinned to BRAIN_ANCHOR). Centroid anchoring drifted with every
        customize pass (front banner sliding toward the lounge).
      · Verified live: resetOffice → 182 items, projectors in place,
        validateLayout 182 OK · 0 err · 0 warn; top-view screenshot — every
        banner over its room.
- [x] v4.2.4 GROUND-TARGET BANNERS + PARALLAX COMPENSATION (2 commits, gates
      0/0, live-verified office + 2D top):
      · ROOT CAUSE of the "wrong banner rows" report: a static sprite at
        hover height shifts ≈8 ground units up-screen at the oblique dollhouse
        camera (elevation 28–40°) — one full room row. Top-row banners floated
        over the roofline; every other banner sat over the room ABOVE its own.
        No static anchor can satisfy dollhouse + 2D top (ortho = zero parallax).
      · roomLabels v4.2.4 — banners are now GROUND TARGETS (room's rear −X
        wall + 1.75 inset, centered across width) and updateBannerPlacement()
        casts the camera ray through the target onto the hover plane each
        frame → sprite projects EXACTLY onto the target at ANY camera angle.
        Ortho/2D → sprite sits straight above the target. BANNER_HOVER 4.2;
        parallax push capped at 13 units for near-horizontal views.
      · Exceptions: brain_chamber FIXED at rotunda west rim (−16, −0.3, hover
        4.8 — the 14-unit ring would swallow a compensated move; banner stays
        north of the brain); command_hub insets from the rotunda's east face
        (x −4.2) — the brain zone rect minX −10 sits INSIDE the rotunda ring,
        so the zone-derived west wall ≠ the hub's real wall.
      · engine: animate() calls updateBannerPlacement() after controls.update()
        (guarded by roomLabelsGroup); sprites tag userData.zone for lookup —
        index-based children mapping intentionally avoided.
      · Gates: bun run typecheck 0 · bun run lint 0. Live verify:
        .verify/banners-v424-office.jpeg + banners-v424-top.jpeg — every
        banner pinned to its room's top edge, brain banner clear of the
        brain, no roofline floaters at any camera angle.
- [x] v4.2.5 MEASURED-CENTROID BANNER TARGETS (gates 0/0):
      · v4.2.4 fixed the parallax bug but still derived ground targets from
        ROOM_ZONES rects (rear −X wall + 1.75 inset, z-mid) — the rect-center
        failure class again. Static diff vs the validateLayout furniture
        centroid dump: reception 5.75 m, home_workspace 6.38 m, showcase
        5.86 m, command_hub 4.25 m, meeting_room 3.94 m, agent_space 3.55 m,
        ai_club 3.37 m, knowledge_hub 2.96 m, office_floor 1.71 m — only
        brain_chamber (0.39 m) in tolerance.
      · roomLabels v4.2.5 — `export const ROOM_ANCHORS` = furniture centroid
        table (home −14.4/12.9, showcase −14.9/−11.9, agent_space −4.7/12.3,
        command_hub −0.4/−1.9, office_floor −6.6/−11.8, knowledge_hub 5.7/12.2,
        meeting_room 6.2/1.9, ai_club 6.1/−12.2, reception 18.5/0); BANNER_INSET
        rect math deleted; bannerGround(id) reads the table. v4.2.4 parallax
        compensation + per-frame re-anchor untouched (orthogonal concerns).
      · brain_chamber override KEPT at the measured rotunda west rim
        (−16.0, −0.3, hover 4.8, fixed) — the centroid table's (−16.25, 0)
        raycasts at 14.14 = rotunda wall top (SpatialConfig BRAIN_ANCHOR doc);
        0.39 m from the centroid = inside tolerance, banner stays north of
        the brain, clear of the 14-unit ring.
      · SpatialConfig: dead v3-era ROOM_LABELS array (10 hand-tuned old
        coordinates, zero references) deleted — drift bait removed.
      · Gates: bun run typecheck 0 · bun run lint 0. Live verify when the
        dev server is up: every banner should project over its room's
        furniture centroid at any camera angle.
- [x] v4.2.6 CLOSE-ORBIT BANNER FADE (gates 0/0):
      · Runtime label dump (10 sprites, y 14.9/brain 15.5) decoded: app was
        still on v4.2.4 (positions = old rect-inset targets to the decimal;
        floorY ≈ 10.7 = 14.9 − 4.2 hover, consistent with dais raycast
        base+0.73 @ 11.4 → labels were NEVER at roof height). depthTest
        already true (SpriteMaterial default). Zone grid NOT shifted —
        ROOM_ZONES span x −22.5…+22.5 symmetric; the west cluster was the
        BANNER_INSET rear-wall artifact (fixed in v4.2.5). A reload picks
        v4.2.5 up; no SpatialConfig edit warranted.
      · Remaining UX gap (all 10 banners superimposed while orbiting close
        over the open-top diorama): updateBannerPlacement now drives per-
        sprite opacity — ortho 2D top: always full; camera ≥40 from origin
        (default office rig ≈ 43): full; camera ≤22: banners within 25 units
        of the camera stay full, the rest fade to 0 over a 45-unit span
        (smoothstep blend between the two regimes — no popping mid-orbit).
        Explicitly NOT the external proposal's 26/52 thresholds, which would
        fade every banner at the default office camera (label distances
        34–60 there). roomLabels rewrite rejected: it re-derived targets
        from zone-rect centers (the class v4.2.5 removed) and would have
        clobbered the measured brain rim override.
      · Gates: bun run typecheck 0 · bun run lint 0.
- [x] v4.2.7 STATIC BANNERS — parallax compensation REVERTED (user decision;
      gates 0/0):
      · User feedback while orbiting: "all of this stuff is coming to my
        face — really ugly." Root cause: v4.2.4's per-frame parallax
        compensation slides every sprite toward the camera along the view
        ray (capped at 13 units) — the banners literally swoop toward the
        viewer on every orbit. REVERTED: updateBannerPlacement now sets a
        STATIC position (ground target = ROOM_ANCHORS centroid) every
        frame; opacity is the only per-frame property. Accepted trade: at
        oblique dollhouse angles a hover sprite reads a fixed "up-screen"
        offset — constant per camera pose, zero motion.
      · BANNER_PUSH_CAP, fixed-flag and ray/plane intersection removed.
        Brain override unchanged (−16.0, −0.3, hover 4.8 — rim target).
      · v4.2.6 close-orbit fade KEPT (opacity-only, never position):
        ortho 2D top + zoomed-out dollhouse = all full; close orbit = only
        banners within 25 units of the camera stay bright.
      · Reference: user screenshot of the 2D top view — banners centered
        over each room, compact pills, full opacity = the v4.2.5 centroid
        look with static placement.
      · Gates: bun run typecheck 0 · bun run lint 0.
- [ ] F: theme files from user (index.css, TopBar, LeftPanel, RightPanel,
      CanvasViewport) → apply.
- [ ] E: fullscreen board viewer (deferred until D confirmed in browser;
      design in activeContext.md).
- [ ] Phase 13: real CLI adapters (Bun.spawn opencode/claude).
- [ ] Phase 14: navmesh pathfinding (@recast-navigation/three).

## Decisions & conventions worth keeping
- ZONES-first layout: ROOM_ZONES is the only valid ruler; MEASURED rects are
  fallback only (they inherited v3.3 misplacement).
- Rooms authored in image space (img()/fFace) — never raw world axes.
- Shared catalog materials: geometry-only disposal; clone before texture work.
- Keep engine LayoutEntry shape unchanged across layout refactors.
