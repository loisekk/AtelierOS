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
- [x] v4.2.8 + zones v1.3 + banners v4.4 — REFERENCE-PLAN ROOM IDENTITY
      (user goal; gates typecheck 0):
      · User: "the display is rendering the reception, which is wrong" — the
        middle front room must be MEETING ROOM; Reception = the GATE ONLY
        (no room, no screens). Knowledge Hub = front-left corner room,
        AI Club = front-right corner room (reference 2D floor plan).
      · ROOM_ZONES v1.3: front rooms span their FULL building extent
        (knowledge/ai_club maxX 11→22.5; meeting_room capped 15). v1.2's
        cap left the corner wings outside every zone → boards fell through
        to the nearest-zone fallback and the meeting room's east board
        probed into the reception rect → RECEPTION board in the middle
        front room. knowledge camera rig recentered on the corner wing.
      · RoomBoards v4.2.8: zoneIdForScreen NEVER returns 'reception' via
        facing-probe — a drifting probe falls back to the zone the screen
        stands in. A screen shows RECEPTION only if it physically stands
        in the gate.
      · ROOM_BANNERS unchanged content-wise; roomBannerFor already keys
        the board headers, so middle-front board now reads MEETING ROOM.
      · roomLabels v4.4: banners re-anchored IN-ROOM — just inside each
        room's rear (minX) wall, z-centered, hover 2.8 (brain keeps its
        measured rotunda rim override −16.0, −0.3, hover 4.8). v4.3's
        rear-edge + hover 4.2 projected above the outer walls on the
        default office rig (elev ≈ 31°); low in-room hover = reference
        img 3 look. Static placement + opacity-only close-orbit fade kept.
      · Parallel session's Phase 13 work (PostFX, campus sky, theme/UI,
        reception gate dressing) left UNCOMMITTED in the tree on purpose.
- [ ] F: theme files from user (index.css, TopBar, LeftPanel, RightPanel,
      CanvasViewport) → apply.
- [ ] F: theme files from user (index.css, TopBar, LeftPanel, RightPanel,
      CanvasViewport) → apply.
- [ ] E: fullscreen board viewer (deferred until D confirmed in browser;
      design in activeContext.md).
- [ ] Phase 13: real CLI adapters (Bun.spawn opencode/claude).
- [ ] Phase 14: navmesh pathfinding (@recast-navigation/three).
- [x] Phase 13 G (fix) + H/I (apply) — GLASS UI SHELL + CINEMATIC ENVIRONMENT
      (user request; gates tsc -b 0 · eslint 0):
      · User screenshot showed the shell broken: left panel stretched across
        ~85% of the window, right panel squeezed at the edge, canvas crushed.
        Root cause: the Phase 13 G rewrite gave LeftPanel a width:100% aside
        and TopBar an absolute .topbar-glass, but App.tsx still used the OLD
        flex-column/flex-row shell — component/CSS contract mismatch.
      · App.tsx → full-bleed glass shell: .workspace-full root, canvas
        container as .stage-full (edge-to-edge behind everything), LeftPanel
        wrapped in .floating-left, RightPanel in .floating-right, HUD chips
        in .stage-hud-layer. TopBar/LeftPanel unchanged (already glass).
      · RightPanel: both roots glassified (.glass-card column, old .panel +
        borderLeft + opaque background dropped); fixed stray "</div>h" typo.
      · index.css: RESTORED .hud-tl/tr/bl/bc anchor rules (the glass-theme
        edit had deleted them — chips stacked in the stage corner) and added
        .stage-full > canvas absolute-inset rule (old .stage contract).
      · Phase H1/H2/H3/H4 (bloom PostFX, dusk sky, campus, warm sun) was
        already inline in AtelierEngine from the parallel session — kept and
        EXTRACTED into new architecture/CampusEnvironment.ts (setupSky +
        setupCampus(scene, building), self-disposing) with the MISSING I3
        pieces added: entrance walkway (stone tiles, +X toward the gate) and
        10 emissive path lights (bloom-glow, zero PointLights). Engine now
        calls setupSky in the constructor and setupCampus in the GLB .then()
        (needs the building bbox); makeSkyTexture/buildCampus deleted;
        campus disposed explicitly before the generic scene traverse.
      · MaterialTheme v3 — the plan's two discoveries applied: (1) the
        building is ONE merged tripo mesh, so per-mesh classify always fell
        to flat tan → VERTEX-COLOR BAKING (paintMergedMesh classifies every
        vertex by world normal + height: oak floor / cream walls / walnut
        wainscot / soffit / ceiling) onto a shared vertexColors 'painted'
        material; (2) the brain-chamber darkening Pass-0 name-regex was dead
        code → now ZONE-BASED (ROOM_ZONES 'brain_chamber' rect) and applied
        in the vertex paint (dusk-violet lerp 0.72, y < 4.2).
      · Tree foliage: per-instance leaf tints added; base leaf material set
        to white (material.color multiplies instanceColor).
      · NOT staged: .gitignore (unrelated edit ignoring memory-bank/ +
        .verify/ — conflicts with the log discipline; left uncommitted).
      · Gates: tsc -b exit 0 · eslint 0/0. Visual verification (bun run dev:
        glass panels over full-bleed stage, dusk campus, walkway + path
        lights, vertex-painted walls, violet brain rotunda) PENDING user.
- [x] Phase 13 plan sweep (user pasted full G/H/I spec) — two remaining gaps
      closed (gates tsc -b 0 · eslint 0):
      · I3 wall_sconce was catalog-only, never placed → 3 emissive sconces in
        commandHub v2.2 (bottom wall ×2 facing the room fFace('up'), left
        wall ×1 facing fFace('right')) — kept clear of the right-wall
        shelving run and the top dispatch screens; bloom glows them for free.
      · Phase G "block-divided" panels: RightPanel was ONE big glass card →
        split into per-block cards like LeftPanel: main mode = Company
        Status / Employee Workstation / Live Activity; settings mode =
        Capacity Planner / Fire egress / Live Costing / Placed Items. All
        section headers moved to .panel-section-title (matches LeftPanel +
        the glass tokens); root asides are transparent gap-10 columns so
        .floating-right scrolls the card stack.
      · Verified already-satisfied by earlier commits: H1 PostFX (wired incl.
        ortho setCamera), H2 sky, H3 campus, H4 sun/hemisphere, I1 vertex
        paint + contact shadow, I2 entrance_mat + path lights, glass shell.
        Phase G's "Voice Command card" deferred with voice-to-agents (parked).
      · Not committed: .gitignore edit (memory-bank/.verify ignore) — user
        decision pending; progress.md force-added to keep log history.
- [x] Phase 13 fixes 1–3 + backdrop — OVER-BLOOM TUNE · SOLID PANELS ·
      PREMIUM ORBIT ARC · CITY PANORAMA (user plan; gates tsc -b 0 ·
      eslint 0):
      · Issue 1 over-bloom (building too shiny) — three-knob tune applied in
        plan order: (a) PostFX bloom threshold 0.82→0.92 (only true
        emissives — screens ≥0.95, brain 1.4, sconces 2.0+ — cross it);
        (b) painted material roughness 0.88→0.95, envMapIntensity 0.42→0.28
        (the equirect sky floods the env probe, so matte-first wins);
        (c) scene.environmentIntensity = 0.7 after PMREM (scales all env
        reflections scene-wide, one line). Bloom STRENGTH deliberately kept
        0.32 — screens/brain/pendants must still glow; strength is the blunt
        knob, threshold the surgical one. If still shiny on user screenshot:
        strength → 0.22 is the remaining fallback.
      · Issue 2 panels solid (reverse of glassmorphism — img 2 composition):
        --glass-bg 0.72→0.97, --glass-bg-soft 0.55→0.94, --glass-blur 14→6,
        --glass-border 0.18→0.22 alpha. Card headers/dividers/shadows kept —
        block structure survives. TopBar chips keep the light frost via NEW
        dedicated tokens --chip-bg (0.55) / --chip-blur (14px) wired into
        .glass-chip — they sit over the 3D scene and were never the problem.
      · Issue 3a premium orbit arc: ORBIT_LIMITS (min 18 / max 95 /
        polar 0.18…π/2−0.12 / azimuth ±π/2.6 ≈ ±69° front arc) applied via
        applyOrbitLimits() in the constructor. CAUTION FROM THE PLAN HANDLED:
        setView('top') calls relaxOrbitLimits() (polar→0, azimuth ±∞,
        inspection zoom floor) — the ortho dollhouse and the CEO ~13.3-unit
        close-up rig would both be clamped by the strict arc; CEO branch
        re-lowers minDistance to CAMERA_LIMITS.minDistance and the non-top
        branch re-applies the arc. Per-frame minCameraYOverFloor clamp
        unaffected.
      · Issue 3b backdrop — Option A (cylinder panorama), implemented
        PROCEDURALLY in CampusEnvironment: makeCityStripTexture() draws a
        2048×256 dusk skyline (silhouette blocks + sparse warm lit windows
        over the #8A644C→#D9A06B→#E8C08D gradient), wrap-safe BY CONSTRUCTION
        (seeded building run keeps 60–80px margins from the strip edges →
        the seam is a natural low-rise gap). Mesh: CylinderGeometry
        (r150, h120, open-ended, BackSide, fog:true) spanning y −2…118 —
        building bases at ground level, ~75% fog haze at r150. Parallaxes
        with the camera because it IS in the scene (scene.background image
        explicitly rejected per plan). Swapping in a real generated PNG later
        = replacing this one texture. Campus dispose now also frees
        material.map (city/grass/walkway/shadow canvas textures).
      · .gitignore: REVERTED per user recommendation — memory-bank stays
        tracked in git (continuity lifeline). NOTE: .verify/ is now untracked
        and unignored (visible in git status as ??) — add to .gitignore later
        if it's scratch.
      · Gates: tsc -b 0 · eslint 0. Visual checks pending user: bloom only on
        emissives; panels ceramic-solid vs img 2; orbit clamped to the front
        arc with Top view + CEO view still working; city haze visible behind
        the trees at the default angle.

## Decisions & conventions worth keeping
- ZONES-first layout: ROOM_ZONES is the only valid ruler; MEASURED rects are
  fallback only (they inherited v3.3 misplacement).
- Rooms authored in image space (img()/fFace) — never raw world axes.
- Shared catalog materials: geometry-only disposal; clone before texture work.
- Keep engine LayoutEntry shape unchanged across layout refactors.
