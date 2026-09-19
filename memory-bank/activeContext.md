# Active Context — Decoded Work Items A–F (with verified code state)

Working tree note: **10 modified + 3 untracked files** = in-flight v4.0 work
(hand-placed default layout, RotationHud, user-layout.json). COMMIT BEFORE EDITS:
`git add -A; git commit -m "green state checkpoint"`.

## Task decode & status

| # | Symptom | Status |
|---|---|---|
| A | Brain platform/ring/particles on the ROOF (img-1) | Fixable now — root cause VERIFIED below |
| B | 8 seats not around CEO Brain (img-3) | Follows from A + `resetOffice()`; v3.4 ring chairs exist in data |
| C | Shelf runs pierce walls (img-4) | Fixable now — new clamping builder |
| D | Wall screens = live room boards (img-2) | Buildable now; design below; `isScreen` gap VERIFIED |
| E | Fullscreen "big view" board | DEFERRED (only after D confirmed) |
| F | Background + panels match img-5 | BLOCKED — needs 5 UI files from user: `styles/index.css`, `TopBar.tsx`, `LeftPanel.tsx`, `RightPanel.tsx`, `CanvasViewport.tsx` (if it exists). Deferral decision was by user instruction: big-screen viewer only after D confirmed. |
| E | **Task E — fullscreen "big screen" board viewer** | DEFERRED by user instruction (only after D works). DESIGN (keep — lives only in session history): raycast-click a room_board mesh → fullscreen HTML overlay rendering the same `RoomBoardData` at full canvas size (room name, agents+statuses, logs). Build after D is confirmed working. |

---

## A — Brain as furniture (verified against AtelierEngine.ts)

**Root cause — REVISED by `dumpObjectRegistry()` evidence (this session):**
the clipboard JSON contains a **single merged mesh** `tripo_node_22cabdfa…`
(size 45×19.52×44.88, category UNKNOWN). There are NO `brain|neuron|neural|core_*`
meshes in the GLB at all → `detectBrainAnchor()` returns **null** → the brain
renders at `BRAIN_FALLBACK` (−11.2, 2.6, 0.4). The "core_ averaging" mechanism
was the v3.2-era hypothesis; the real floating/roof behavior comes from the
fallback path (fallback Y=2.6 + accent light + HUD riding `WORLD.floorY`).
The zone-center fix below is immune to this — it never consults mesh names.
The regex tighten (Edit 3) is hygiene, kept.

**Current code (lines 509–512):**
```ts
private initBrain(anchor: THREE.Vector3 | null) {
  const src = anchor ?? BRAIN_FALLBACK;
  const g = this.brainGroup = new THREE.Group();
  g.position.set(src.x, WORLD.floorY + BRAIN_DAIS_Y, src.z);   // dais offset — KEEP it
```
⚠️ Plan drift: an earlier draft said `WORLD.floorY` — the dais offset
(`BRAIN_DAIS_Y = 0.73`) MUST be preserved.

**Edit 1 — import** (line 9): add `ROOM_ZONES` to the SpatialConfig import list.

**Edit 2 — initBrain head:**
```ts
private initBrain(anchor: THREE.Vector3 | null) {
  // BRAIN AS FURNITURE: deterministic placement at the brain_chamber zone
  // center. detectBrainAnchor() can average rooftop core_* meshes and land
  // the group ON THE ROOF (img-1 bug). The detected anchor now only decides
  // whether the procedural brain mesh is built. calibrateBrain() stays the
  // manual override.
  const zone = ROOM_ZONES.find(z => z.id === 'brain_chamber');
  const src = zone
    ? new THREE.Vector3((zone.minX + zone.maxX) / 2, WORLD.floorY, (zone.minZ + zone.maxZ) / 2)
    : (anchor ?? BRAIN_FALLBACK);
  const g = this.brainGroup = new THREE.Group();
  g.position.set(src.x, WORLD.floorY + BRAIN_DAIS_Y, src.z);
  // below unchanged: accent light, platform, ring, particles/light,
  // brainAnchor = dais + 2.4, screenManager.positionHUD same line
```
brain_chamber zone: minX −22.5, maxX −10, minZ −7.5, maxZ 7.5 → center
(−16.25, 0) — matches the MEASURED rect center the v3.4 ring was authored for
(brainChamber.ts: ring R = 0.72 × min dim around (−16.25, 0)). ✅ coherent.

**Edit 3 — regex (line 502):** `/brain|neuron|neural/i` (drop `core_`).

**Visual check:** ring R ≈ 0.72 × 6.25 ≈ 4.5; platform 3.6 wide. If chairs
overlap the platform edge, lower the `ring` radius fraction in
`layout/rooms/brainChamber.ts`.

## B — Seats around the brain

The live scene may still run the old preset. Data-level truth (verified):
`brainChamber.ts` v3.4 = 1 CEO desk (`podGaze`, essential) + `ring(add, r,
{count: 8, radius: 0.72, phase: 0.5})` + 2 plants. Chairs sit on the interior
floor via GLB floorY sync — they CANNOT be on the roof. Diagnose with:
```js
window.atelierEngine.resetOffice()        // 'default' preset → USER_DEFAULT_LAYOUT
window.atelierEngine.showCanonicalCensus()
```
If the 8 chairs still don't ring the brain after reset, check whether
USER_DEFAULT_LAYOUT (v4.0) contains the ring entries or was hand-baked without
them; screenshot + SpatialConfig state closes the case.

## C — Shelves can never clip walls (verified call-sites, v3.4 actual)

`shelfRun` (builders.ts:27) is bounds-blind. ACTUAL call-sites today
(v3.4 image-space, gaps 1.15–1.2 — NOT the 2.1 from the old plan; agentSpace
has NO shelfRun):
- `knowledgeHub.ts:8` — `shelfRun(add, ...img(r,-0.84,-0.1), fFace('right'), 4, 1.15)`
- `knowledgeHub.ts:20` — `shelfRun(add, ...img(r,-0.4,-0.86), fFace('down'), 2, 1.15)`
- `aiClub.ts:15`, `commandHub.ts:12`, `homeWorkspace.ts:11`,
  `officeFloor.ts:13`, `showcase.ts:13` — count 2, gap 1.2 each.

**Add to builders.ts** (image-space anchor, matching v3.4 call style):
```ts
import { degC, wsFacing, img } from './coords';

/** Wall-aligned bookshelf run that CLAMPS ITS COUNT to the room rect.
 *  A count-4 × 1.15 run spans ~5.35m and pierces walls in narrow rooms
 *  (img-4 bug). Computes the max shelves that fit (SHELF_W 1.9 from
 *  bookshelf_large, WALL_MARGIN 0.55) and keeps them centered on the run. */
export function shelfWall(
  add: AddFn, r: RoomRect,
  hx: number, hz: number, rot: number,
  count = 3, gap = 2.1,
) {
  const SHELF_W = 1.9;
  const WALL_MARGIN = 0.55;
  const [x, z] = img(r, hx, hz);
  const alongX = Math.abs(Math.sin(rot)) < 0.5;
  const runHalf = (alongX ? r.w : r.d) / 2 - WALL_MARGIN;
  const maxCount = Math.max(1, Math.floor(((runHalf - SHELF_W / 2) * 2) / gap) + 1);
  shelfRun(add, x, z, rot, Math.min(count, maxCount), gap);
}
```
Then swap the 7 call-sites above to `shelfWall(add, r, <hx>, <hz>, <rot>, <count>, <gap>)`.

**Honest limit:** fixes RUN clipping unconditionally. If single shelves still
poke out, ROOM_ZONES rects are wider than the real rooms → fix SpatialConfig
(rects) + possible waypoint recalibration. Validate with `validateLayout()`
red spheres (should drop vs. the pre-fix run).

## D — Live room boards (greenfield; `isScreen` gap VERIFIED)

**Verified discrepancy (grep across src):** `isScreen` is READ in 4 places
(AtelierEngine 794, 827; ScreenManager 144, 161) and WRITTEN in **zero**;
templates.ts does not tag screens. ⇒ Phase 11 desk-screen streaming is inert;
the D edits repair it as a side effect.

**D1 catalog.ts:** `mkMonitor` screen mesh → `screenGlowMat.clone()` +
`userData.isScreen = true`, `userData.screenType = 'terminal'` (clone is
mandatory — the material is module-level shared). `wall_screen` factory
(lines 123–131) → screen plane gets a clone + `isScreen = true`,
`screenType = 'room_board'` (plane 4.0×2.2 at (0, 1.7, 0.05), unchanged).

**D2 ScreenManager.ts:** add `export interface RoomBoardData { room: string;
agents: { name: string; status: string }[]; logs: string[]; }` and public
`drawRoomBoard(mesh, data)`: traverse meshes gated on isScreen +
room_board + screenData; 512×256 canvas — bg #0A1420, cyan frame
rgba(73,216,236,.7), title = room id (underscores→spaces, uppercase,
#49D8EC, bold 22px Archivo), "AGENTS IN ROOM: N" line, up to 4 agents with
status colors (working #059669, error #DC2626, waiting #D97706, celebrate
#0EA5E9, else #8A8A8A), divider, last 3 logs "> <46ch>" in #0EA5E9 13px
JetBrains Mono; `texture.needsUpdate = true`.

**D3 AtelierEngine.ts:**
1. Field `private roomLogs = new Map<string, string[]>();` + helper
   `zoneIdAt(x, z)` → ROOM_ZONES point-in-rect → zone id | null.
2. placeItem texture-init (line 827): extend the screenType condition with
   `'room_board'`.
3. New public `updateRoomBoards()`: group `wall_screen` placedItems by
   `zoneIdAt(position)`; per room collect agents (placed items with `role`
   in that zone → {name: config?.name || name, status}) + logs from
   roomLogs → `screenManager.drawRoomBoard` per board.
4. Replace `updateAgentLog`: keep the desk-mesh forward (line 564) + push
   the log into roomLogs for the agent's zone (max 6, shift) +
   `this.updateRoomBoards()`.
5. One-liners: `updateRoomBoards()` at end of `autoFurnish()` and
   `updateAgentStatus()`; `this.roomLogs.clear();` inside `clearAll()`.

Zero new message types — data already flows gateway → App.tsx → engine.

**Task E (deferred):** raycast-click a board → fullscreen HTML overlay
rendering RoomBoardData at full size. Build only after D is confirmed.

## F — Theme match (BLOCKED on user files)
Need from the user: `styles/index.css` (CSS vars), `TopBar.tsx`,
`LeftPanel.tsx`, `RightPanel.tsx`, `CanvasViewport.tsx` (if it exists).
Current theme (verified): cream `--bg #F1E7D8`, oat `--bg-2 #E6D5C2`,
terracotta `--accent #B96D3D`, purple `--brain-accent #9B5FD4`.
First ask: restore img-5 exactly, or adopt specific elements?

## Working rules (session-inherited, §11 of the handoff)
1. **Audit every paste against disk** — the A–F handoff itself was stale in 4
   places; this bank's diffs are the audited versions.
2. **Prefer complete-file rewrites** over fragments when a file is small
   (builders/coords/room files) — fragments caused the mis-paste class of bugs.
3. **Verify every edit landed** — re-read or grep the file after editing.
4. **Console commands are case-sensitive** — `window.atelierEngine.resetOffice()`,
   `validateLayout()`, `dumpObjectRegistry()`, `showCanonicalCensus()`.
5. **Bun, never npm** for the frontend gate (LOCKED decision, Bun 1.4).
6. **Commit before multi-file edits** — protect work outranks clean history.

## Execution order
1. Commit green state. 2. Apply A (3 edits) + C (builder + 7 swaps).
3. Apply D (D1–D3). 4. `npm run typecheck && npm run lint` → 0/0.
5. `npm run dev`; `resetOffice()` → `validateLayout()`; screenshots
   (chamber A+B, shelves C); dispatch a task → boards light up (D).
6. Then F when files arrive; E last.


