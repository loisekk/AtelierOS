# Tech Context

## Repos / roots
- Repo root: `C:\Users\yashb\Desktop\open-agents` (branch `main`).
- Frontend app: `client/atelier-planner` (Vite, port 5173).
- Bun mock gateway: `client/atelier-planner/server` (port 8787 — mock only;
  the real hook `useGateway.ts` connects to ws://127.0.0.1:8000/ws/cognitive).
- Cognitive engine: `python_engine` (FastAPI + LangGraph + LiteLLM, port 8000).
- Memory stack: `docker-compose.yml` — Redis 6379, Qdrant 6333/6334,
  Neo4j 7474/7687 (neo4j/password, APOC).
- Root PNGs = calibration references: `zones-overlay-top-v341.png`,
  `brain-calibrated-top.png`, `brain-circle-fits-top.png`, `wall-dots-top.png`.

## Stack
- React 19.2, TypeScript ~6.0.2, Vite 8, Tailwind 3.4, three 0.185
  (@types/three 0.185), jsPDF, express+ws deps (server), Bun runtime for server.
- Python: FastAPI, LangGraph (`graph.py` → `cognitive_app`, `TaskState`),
  litellm (`router.py`), docker SDK (Alpine micro-VMs), python-dotenv for
  `python_engine/.env` (ANTHROPIC_API_KEY / OPENAI_API_KEY).

## Commands
```powershell
# Frontend (run inside client/atelier-planner) — LOCKED: Bun 1.4 (never npm run)
bun install; bun run dev          # vite @ :5173
bun run typecheck                 # tsc -b  (MUST be 0 errors)
bun run lint                      # eslint . (MUST be 0 errors)
bun run layout:census             # bun scripts/layout-census.ts (data-level layout census)

# Cognitive engine
cd python_engine; python -m venv venv; venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Memory stack
docker compose up -d
```

## GLB / building-load quirks catalog (verified — BuildingLoader.ts + engine)
1. **Single merged Tripo mesh**: the GLB is ONE mesh named
   `tripo_node_*` (dump: size 45×19.52×44.88, category UNKNOWN, position y≈9.77
   pre-centering). Consequences: `detectBrainAnchor()` finds NO meshes matching
   `/brain|neuron|neural|core_/i` → returns **null** → brain goes to
   `BRAIN_FALLBACK` (not core_-averaged roof — that was the v3.2-era hypothesis);
   auto GLB-desk detection is useless → v4.0 uses MANUAL workstation registration.
2. **MeshoptDecoder** must be set on GLTFLoader (`loader.setMeshoptDecoder(MeshoptDecoder)`)
   — GLB is Meshopt-compressed; without it the load fails.
3. **Scale→bbox→Y=0 order** (BuildingLoader 63–77): scale to targetWidth 45 FIRST,
   recompute bbox, then center X/Z and drop `y -= box.min.y`. Reordering breaks
   floor detection.
4. **`WORLD.floorY` is mutable + GLB-synced** (multi-raycast `detectFloorHeight`,
   lowest horizontal surface ≥ 0; fallback size.y·0.2). Never hardcode interior
   floor height; every placement derives from `WORLD.floorY`.
5. **brainLight null-guard**: `brainLight` is a real PointLight null-guarded in
   animate (Quirk #1 fix preserved) — React 19 strict double-mount previously
   crashed on unguarded engine lights; keep the guard.
6. **`window.atelierEngine`** exposed in App.tsx — ALL console diagnostics depend
   on it; console commands are CASE-SENSITIVE (`resetOffice` not `ResetOffice`).
7. **tsconfig split rule**: project references split (`tsc -b`); don't merge
   configs — the typecheck gate depends on the split.
8. **Barrel rule**: `layout/roomLayouts.ts` re-exports ONLY (nothing else) —
   keeps RoomFurnisher's import stable.
9. **Mis-paste detector**: pasted code that references functions/files that
   don't exist in the tree = stale handoff; audit every paste against disk
   (Rule #1 — applied to the A–F handoff itself).
10. **Two-dev-server trap**: the Bun gateway (server/, :8787) is MOCK only —
    the real client hook connects to ws://127.0.0.1:8000 (python_engine).
    Don't run/point the client at :8787 and expect cognitive behavior.
11. **Render cloning**: React 19 re-renders need fresh arrays/objects —
    `onStatsUpdate(this.placedItems)` must pass a new reference (clone-quirk).
12. **Seated guard**: agent placement anchors to a workstation seat; if no
    anchor is free it warns and places at cursor — never double-seat an agent.

## Browser console API (`window.atelierEngine` — exposed in App.tsx)
- `resetOffice(preset?)` — clearAll → new WorkstationRegistry → autoFurnish →
  initBrain(detectBrainAnchor) → validateLayout. Preset: 'default'|'standard'|'dense'|'sparse'.
- `setPreset('dense')`, `showCanonicalCensus()`, `dumpObjectRegistry()`
  (JSON inventory → clipboard), `validateLayout(true)`,
  `showDefaultAnchors(showAll)`, `debugRooms()`, `showRoomCenters()`,
  `logCameraPosition()`, `calibrateBrain()` / `setBrainCenter(x,z)`,
  `startCalibration()` (waypoint click-tool), `exportLayout()`,
  `hideValidation()`.

## WS protocol (GatewayMessage in useGateway.ts)
Types: `agent_status` (agent_id, status), `terminal_log` (agent_id, log),
`cognitive_step` (step, role, sub_task_id, status, Phase-12 extras:
model, model_tier, cost_usd, result), `cognitive_complete`,
`approval_required` (command, sub_task_id), plus Phase 12 `cost_update`.
Client → server: `{type:'dispatch', task_id, prompt, assignee_ids}`.
python_engine main.py runs one asyncio **outbox** sender task per socket;
malformed frames no longer kill the socket; cost_tracker.subscribe feeds
per-connection cost frames; `GET /analytics/costs` returns cumulative spend.

## Model router (router.py)
`ModelTier` FAST/SMART/HEAVY; registry: FAST = claude-3-5-haiku, gpt-4o-mini;
SMART = claude-sonnet-4, gpt-4o; HEAVY = claude-opus-4, o1 (max_completion_tokens,
no temperature). Complexity keyword scoring → tier; o1-family quirks handled;
streamed calls send `stream_options:{include_usage:true}` so usage isn't $0;
registry price fallback when litellm can't price a model; per-task routers
cached (FIFO, max 256); `verify_environment()` startup check.

## HITL
DANGEROUS_PATTERNS in main.py: `rm -rf`, `DROP TABLE`, `sudo`, `chmod 777`,
`DELETE FROM` (case-insensitive). Match → sandbox run paused, approval frame
sent → App.tsx modal → resume.

## Gotchas
- `WORLD.floorY` is mutable at runtime — synced from the loaded GLB
  (`building.userData.floorY`); never hardcode interior floor height.
- DAG screen mount is GLB-probed constants in `DAG_SCREEN_MOUNT`
  (x=−4.5, zWall=−3.76, hubFloorOffset=0.735, eye=1.8).
- Shared `screenGlowMat` in catalog.ts means cloning (`.clone()`) is MANDATORY
  before assigning any canvas texture to a screen mesh.
