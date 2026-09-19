# Project Brief — Atelier AI Company OS

## One-liner
A 3D Visual Operating System for autonomous AI teams: the CEO dispatches tasks
to a purple "Brain Core" in a 3D HQ; a Python/LangGraph backend decomposes them
into a DAG; human-like 3D agents sit at desks, stream real terminal logs on
their monitors, walk between rooms, and execute code in Docker micro-VMs.

## Identity
- Not a dashboard — a **spatial diorama** of a premium AI company headquarters.
- Custom GLB architecture model (`agent-build-v1.glb`), warm PBR theme,
  ACES Filmic tone mapping, cream `#F1E7D8` / terracotta `#B96D3D` UI.

## Core capabilities (contract with the user)
1. **Cognitive engine**: prompt → stateful multi-actor DAG (LangGraph), routed
   per-step to cost-tiered models (LiteLLM FAST/SMART/HEAVY), live cost tracking.
2. **Cinematic 3D HQ**: GLB building, camera rigs (office/ceo/command/knowledge/top),
   camera limits that never go under the floor slab.
3. **Living agents**: workstation registry auto-seats agents at desks; agents
   walk (waypoint BFS) between rooms; statuses drive avatar + screens.
4. **Micro-VM security + HITL**: commands run in isolated Alpine containers;
   `rm -rf`, `DROP TABLE`, `sudo`, `chmod 777`, `DELETE FROM` trigger CEO approval.
5. **Dynamic canvas textures**: agent monitors and the Command Hub DAG screen
   stream real logs/status/DAG state (see systemPatterns.md — currently PARTIAL).
6. **Spatial calibration**: click-to-map waypoints, brain center calibration,
   room-zone debug overlay for any new GLB.

## Constraints (hard rules)
- **Zero-error gate**: `bun run typecheck` and `bun run lint` must stay 0/0
  after every change.
- **Green-state checkpoint**: `git add -A; git commit` BEFORE multi-file edits.
- No new frontend libraries beyond the current stack (React 19, three.js,
  Vite, Tailwind, Bun) unless explicitly requested.
- Catalog furniture shares module-level materials — never dispose them
  (see systemPatterns.md "Dispose rules").
- Layout system changes must keep the engine `LayoutEntry` shape unchanged.
- The workspace has **uncommitted v4.0 work** (hand-placed default layout) —
  do not clobber; commit first.

## Out of scope (for now)
- Phase 13: real CLI adapters (`Bun.spawn` opencode/claude) replacing mock sandbox.
- Phase 14: navmesh pathfinding (`@recast-navigation/three`) replacing BFS.
- Task E ("big screen" fullscreen board viewer) — explicitly deferred until
  Task D works.
