// TEMP diagnostic for Phase 14.6 — headless replica of
// AtelierEngine.probeFloorPlan(). Not part of the app; delete after use.
//   bun scripts\_floorplan-probe.ts
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { BRAIN_ANCHOR, ROOM_ZONES } from '../src/features/canvas/architecture/SpatialConfig';

const GLB = 'c:/Users/yashb/Desktop/open-agents/client/atelier-planner/public/models/agent-build-v1.glb';
const OUT = 'c:/Users/yashb/Desktop/open-agents/client/atelier-planner/.floorplan-probe.json';
const t0 = Date.now();
const log = (...a: unknown[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// ── 1. Parse GLB (JSON chunk + BIN chunk) ──
const buf = readFileSync(GLB);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
const jsonLen = buf.readUInt32LE(12);
if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error('bad JSON chunk');
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binHead = 20 + jsonLen;
const binLen = buf.readUInt32LE(binHead);
if (buf.readUInt32LE(binHead + 4) !== 0x004e4942) throw new Error('bad BIN chunk');
const bin = buf.subarray(binHead + 8, binHead + 8 + binLen);
log('GLB parsed', json.meshes.length, 'mesh(es)');

// ── 2. Meshopt-decode the POSITION + index bufferViews ──
type Ext = { byteOffset: number; byteLength: number; mode: string; byteStride: number; count: number; filter?: string };
type BV = { byteLength: number; extensions: { EXT_meshopt_compression: Ext } };
await MeshoptDecoder.ready;
const decodeBV = (i: number) => {
  const bv = json.bufferViews[i] as BV;
  const e = bv.extensions.EXT_meshopt_compression;
  const target = new Uint8Array(bv.byteLength);
  const src = new Uint8Array(bin.subarray(e.byteOffset, e.byteOffset + e.byteLength));
  (MeshoptDecoder as unknown as {
    decodeGltfBuffer: (t: Uint8Array, c: number, s: number, src: Uint8Array, m: string, f?: string) => void;
  }).decodeGltfBuffer(target, e.count, e.byteStride, src, e.mode, e.filter);
  return target;
};
const rawPos = new Float32Array(decodeBV(1).buffer);   // bufferView 1 = POSITION
const indices = new Uint32Array(decodeBV(4).buffer);   // bufferView 4 = triangles
const vertCount = json.accessors[0].count as number;
if (rawPos.length !== vertCount * 3) throw new Error('position length mismatch');
log('decoded', vertCount, 'verts /', indices.length, 'indices');


// ── 3. Replicate loadBuildingGLB: scale to width 45, center XZ, drop minY to 0 ──
let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, minz = Infinity, maxz = -Infinity;
for (let i = 0; i < rawPos.length; i += 3) {
  const x = rawPos[i], y = rawPos[i + 1], z = rawPos[i + 2];
  if (x < minx) minx = x;
  if (x > maxx) maxx = x;
  if (y < miny) miny = y;
  if (y > maxy) maxy = y;
  if (z < minz) minz = z;
  if (z > maxz) maxz = z;
}
const scale = 45 / (maxx - minx);
const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
const world = new Float32Array(rawPos.length);
for (let i = 0; i < rawPos.length; i += 3) {
  world[i] = (rawPos[i] - cx) * scale;
  world[i + 1] = (rawPos[i + 1] - miny) * scale;
  world[i + 2] = (rawPos[i + 2] - cz) * scale;
}
log('scale', scale.toFixed(4), '| plan size', ((maxx - minx) * scale).toFixed(2), 'x', ((maxz - minz) * scale).toFixed(2));

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(world, 3));
geo.setIndex(new THREE.BufferAttribute(indices, 1));
const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
const buildingRoot = new THREE.Group();
buildingRoot.add(mesh);

// ── 4. Replicate BuildingLoader.detectFloorHeight (multi-raycast, lowest hit ≥ 0) ──
const box = new THREE.Box3().setFromObject(buildingRoot);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());
const rayPositions = [
  new THREE.Vector3(center.x, box.max.y + 10, center.z),
  new THREE.Vector3(center.x + 5, box.max.y + 10, center.z + 5),
  new THREE.Vector3(center.x - 5, box.max.y + 10, center.z - 5),
  new THREE.Vector3(center.x + 5, box.max.y + 10, center.z - 5),
  new THREE.Vector3(center.x - 5, box.max.y + 10, center.z + 5),
];

// ── 5. Replicate BuildingLoader.detectFloorHeight (multi-raycast, lowest hit ≥ 0) ──
buildingRoot.updateMatrixWorld(true);
let lowestFloorY = Infinity;
for (const rayPos of rayPositions) {
  const raycaster = new THREE.Raycaster(rayPos, new THREE.Vector3(0, -1, 0));
  const hits = raycaster.intersectObjects([mesh], false);
  for (const h of hits) if (h.point.y >= 0 && h.point.y < lowestFloorY) lowestFloorY = h.point.y;
}
const floorY = lowestFloorY !== Infinity ? lowestFloorY : size.y * 0.2;
log('detectFloorHeight →', floorY.toFixed(3), lowestFloorY === Infinity ? '(raycast missed — fallback)' : '');

// ── 6. EXACT copy of AtelierEngine.probeFloorPlan() ──
const q = 0.25;
const lo = floorY, hi = floorY + 2.6; // level-1 wall band
const v = new THREE.Vector3();
const wall: { x: number; z: number }[] = [];
const floor: { x: number; z: number }[] = [];

buildingRoot.updateMatrixWorld(true);
buildingRoot.traverse(n => {
  const m = n as THREE.Mesh;
  if (!m.isMesh) return;
  const pos = m.geometry.attributes.position;
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
    if (v.y > lo + 0.1 && v.y <= hi) {
      wall.push({ x: Math.round(v.x / q) * q, z: Math.round(v.z / q) * q });
    } else if (Math.abs(v.y - lo) <= 0.06) {
      floor.push({ x: Math.round(v.x / q) * q, z: Math.round(v.z / q) * q });
    }
  }
});
log('wall verts', wall.length, '· floor verts', floor.length);

// ── rotunda fit: wall verts 5.4…6.8 from BRAIN_ANCHOR ──
const near = wall.filter(p => {
  const d = Math.hypot(p.x - BRAIN_ANCHOR.x, p.z - BRAIN_ANCHOR.z);
  return d >= 5.4 && d <= 6.8;
});
let rotunda: { cx: number; cz: number; r: number; n: number } | null = null;
if (near.length > 20) {
  const rcx = near.reduce((s, p) => s + p.x, 0) / near.length;
  const rcz = near.reduce((s, p) => s + p.z, 0) / near.length;
  const r = near.reduce((s, p) => s + Math.hypot(p.x - rcx, p.z - rcz), 0) / near.length;
  rotunda = { cx: +rcx.toFixed(2), cz: +rcz.toFixed(2), r: +r.toFixed(2), n: near.length };
}
log('rotunda', JSON.stringify(rotunda));

// ── wall segments (rotunda excluded so the circle doesn't smear runs) ──
const inRotunda = (p: { x: number; z: number }) =>
  rotunda && Math.hypot(p.x - rotunda.cx, p.z - rotunda.cz) < rotunda.r + 1.2;
const segments = (axis: 'x' | 'z') => {
  const lines = new Map<number, number[]>();
  for (const p of wall) {
    if (inRotunda(p)) continue;
    const key = axis === 'x' ? p.z : p.x;      // the fixed coordinate
    const val = axis === 'x' ? p.x : p.z;      // along the run
    const arr = lines.get(key) ?? [];
    arr.push(val); lines.set(key, arr);
  }
  const out: [number, number, number, number][] = [];
  for (const [key, vals] of lines) {
    if (vals.length < 2) continue;
    vals.sort((a, b) => a - b);
    let start = vals[0];
    for (let i = 1; i <= vals.length; i++) {
      if (i === vals.length || vals[i] - vals[i - 1] > 2 * q) {
        if (vals[i - 1] - start >= 0.5) out.push([key, start, vals[i - 1], vals.length]);
        start = vals[i];
      }
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
};

// ── floor plate: overall + per-zone real extents ──
const extent = (pts: { x: number; z: number }[]) => pts.length ? {
  minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)),
  minZ: Math.min(...pts.map(p => p.z)), maxZ: Math.max(...pts.map(p => p.z)), n: pts.length,
} : null;
const zoneFloors: Record<string, ReturnType<typeof extent>> = {};
for (const zn of ROOM_ZONES) {
  zoneFloors[zn.id] = extent(floor.filter(p =>
    p.x >= zn.minX && p.x <= zn.maxX && p.z >= zn.minZ && p.z <= zn.maxZ));
}

const result = {
  floorY: +floorY.toFixed(4), bbox: extent(floor), rotunda,
  floorPlate: extent(floor), zoneFloors,
  wallsAlongX: segments('x'),  // [z, x0, x1, n] — walls running E–W
  wallsAlongZ: segments('z'),  // [x, z0, z1, n] — walls running N–S
  wallVertexCount: wall.length, floorVertexCount: floor.length,
};
writeFileSync(OUT, JSON.stringify(result, null, 1));

// ── 7. ASCII occupancy maps — visual verification of the traced plan ──
// Every dump carries its own legend + world-coordinate ruler (see asciiMap);
// '+' marks all four ROOM_ZONES rect corners (empty cells only).
const MAP_MINX = -24, MAP_MAXX = 24, MAP_MINZ = -22, MAP_MAXZ = 21;
const MAP_GUT = 7; // width of the 'z= -22 ' row gutter

/** Two ruler rows aligned to WORLD metres, not to character columns:
 *  a tick every 5 m, a '|' + label every 10 m. */
const rulerRows = (cols: number, cell: number): string[] => {
  const text = new Array<string>(cols).fill(' ');
  const marks = new Array<string>(cols).fill(' ');
  for (let c = 0; c < cols; c++) {
    const x = MAP_MINX + c * cell;
    if (x % 10 === 0) marks[c] = '|';
    else if (x % 5 === 0) marks[c] = "'";
  }
  for (let c = 0; c < cols; c++) {
    const x = MAP_MINX + c * cell;
    if (x % 10 !== 0) continue;
    const s = String(x);
    const start = Math.max(0, Math.min(cols - s.length, c - Math.floor(s.length / 2)));
    for (let k = 0; k < s.length; k++) text[start + k] = s[k];
  }
  const gut = ' '.repeat(MAP_GUT);
  return [`${gut}${text.join('')}`, `${gut}${marks.join('')}`];
};

/** Occupancy grid -> a SELF-DESCRIBING ascii block.
 *  ONE axis convention everywhere (probe dumps + scripts/_map-ruler.ts):
 *    COLUMNS = X, left to right, growing east     (x = MAP_MINX + col * cell)
 *    ROWS    = Z, top to bottom, growing south    (z = MAP_MINZ + row * cell)
 *  so NORTH (-Z) is the TOP row and EAST (+X) the RIGHT column.
 *  NOTE the v0 probe shipped maps with NO axis labels at all, which is why
 *  every dump here now carries its own legend + ruler. */
const asciiMap = (pts: { x: number; z: number }[], cell: number, title: string) => {
  const W = Math.round((MAP_MAXX - MAP_MINX) / cell), H = Math.round((MAP_MAXZ - MAP_MINZ) / cell);
  const g: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill('.'));
  const put = (x: number, z: number, ch: string, onlyEmpty = false) => {
    const c = Math.floor((x - MAP_MINX) / cell), r = Math.floor((z - MAP_MINZ) / cell);
    if (c < 0 || c >= W || r < 0 || r >= H) return;
    if (onlyEmpty && g[r][c] !== '.') return;
    g[r][c] = ch;
  };
  for (const p of pts) put(p.x, p.z, '#');
  // ROOM_ZONES rect corners — all four, and never drawn over measured geometry
  for (const zn of ROOM_ZONES) {
    put(zn.minX, zn.minZ, '+', true); put(zn.maxX, zn.minZ, '+', true);
    put(zn.minX, zn.maxZ, '+', true); put(zn.maxX, zn.maxZ, '+', true);
  }
  const head = [
    `# ${title}`,
    `# x = columns ${MAP_MINX}..${MAP_MAXX - cell} (left->right, east = +x)`,
    `# z = rows    ${MAP_MINZ}..${MAP_MAXZ - cell} (top->bottom, north = -z)`,
    `# '#' measured vertex cell | '+' ROOM_ZONES corner (empty cells only) | '.' empty`,
  ];
  const rows = g.map((r, i) => `z=${`${MAP_MINZ + i * cell}`.padStart(4, ' ')} ${r.join('')}`);
  return [...head, ...rulerRows(W, cell), ...rows, ...rulerRows(W, cell)].join('\n');
};
const DIR = 'c:/Users/yashb/Desktop/open-agents/client/atelier-planner';
writeFileSync(`${DIR}/.floorplan-wall-1m.txt`,
  asciiMap(wall, 1, `wall band (floor+0.1..+2.6m) — real partitions + envelope (${wall.length} verts)`));
writeFileSync(`${DIR}/.floorplan-floor-1m.txt`,
  asciiMap(floor, 1, `floor plate — vertices on the floor plane (${floor.length} verts)`));

// ── 8. Vertical band slices — isolate walls (above furniture) from props ──
const band = (loY: number, hiY: number) => {
  const pts: { x: number; z: number }[] = [];
  buildingRoot.updateMatrixWorld(true);
  buildingRoot.traverse(n => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.y > loY && v.y <= hiY) pts.push({ x: Math.round(v.x / q) * q, z: Math.round(v.z / q) * q });
    }
  });
  return pts;
};
const BANDS: [number, number, string][] = [
  [floorY + 0.1, floorY + 1.0, 'low'],
  [floorY + 1.0, floorY + 2.0, 'mid'],
  [floorY + 2.0, floorY + 2.6, 'up'],
  [floorY + 2.6, floorY + 3.4, 'top'],
  [floorY + 3.4, floorY + 4.6, 'hi'],
  [floorY + 4.6, floorY + 6.0, 'ceil'],
];
for (const [a, b, name] of BANDS) {
  const pts = band(a, b);
  writeFileSync(`${DIR}/.floorplan-band-${name}.txt`, asciiMap(pts, 1,
    `band ${name} (floor+${(a - floorY).toFixed(1)}..+${(b - floorY).toFixed(1)}m) — ${pts.length} verts`));
  log(`band ${name}`, `(${(a - floorY).toFixed(1)}–${(b - floorY).toFixed(1)}m)`, pts.length, 'verts');
}
log('band maps →', `${DIR}/.floorplan-band-*.txt`);

// ── 9. Numeric wall extraction from the clean (above-furniture) band ──
const peaks = (vals: number[], bin = 1, top = 16) => {
  const m = new Map<number, number>();
  for (const val of vals) { const k = Math.round(val / bin) * bin; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
};
// Kasa algebraic circle fit → {cx, cz, r}
const circleFit = (pts: { x: number; z: number }[]) => {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, mz = pts.reduce((s, p) => s + p.z, 0) / n;
  let Suu = 0, Svv = 0, Suv = 0, Suuu = 0, Svvv = 0, Suvv = 0, Svuu = 0;
  for (const p of pts) {
    const u = p.x - mx, w = p.z - mz;
    Suu += u * u; Svv += w * w; Suv += u * w;
    Suuu += u * u * u; Svvv += w * w * w; Suvv += u * w * w; Svuu += u * u * w;
  }
  const det = Suu * Svv - Suv * Suv;
  const uc = (0.5 * (Svv * (Suuu + Suvv) - Suv * (Svvv + Svuu))) / det;
  const vc = (0.5 * (Suu * (Svvv + Svuu) - Suv * (Suuu + Suvv))) / det;
  return { cx: +(uc + mx).toFixed(2), cz: +(vc + mz).toFixed(2), r: +Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / n).toFixed(2), n };
};
const hiBand = band(floorY + 3.4, floorY + 4.6);
log('hiBand x-peaks (N–S walls)', JSON.stringify(peaks(hiBand.map(p => p.x))));
log('hiBand z-peaks (E–W walls)', JSON.stringify(peaks(hiBand.map(p => p.z))));
// rotunda region: mid-plan box around the ring seen in the ASCII map
const ringPts = hiBand.filter(p => p.x >= -20 && p.x <= 0 && p.z >= -9 && p.z <= 8);
log('rotunda Kasa fit', JSON.stringify(circleFit(ringPts)));
log('wallsAlongX segs', result.wallsAlongX.length, '| wallsAlongZ segs', result.wallsAlongZ.length);
log('floorPlate', JSON.stringify(result.floorPlate));
log('written →', OUT);

// ── 10. vertical structure: WHERE is the geometry? (world metres) ──
{
  const bins = new Map<number, number>();
  for (let i = 1; i < world.length; i += 3) {
    const k = Math.floor(world[i] / 0.5) * 0.5;
    bins.set(k, (bins.get(k) ?? 0) + 1);
  }
  log('Y histogram (world m · 0.5 m bins) — floor plane marked *:');
  for (const [y, n] of [...bins.entries()].sort((a, b) => a[0] - b[0])) {
    if (n < 300) continue;
    const mark = Math.abs(y - Math.floor(floorY / 0.5) * 0.5) < 0.25 ? '*' : ' ';
    log(`   y=${y.toFixed(1).padStart(6)}${mark} n=${String(n).padStart(7)} ${'#'.repeat(Math.min(64, Math.round(n / 2500)))}`);
  }
}

// ── 11. straight-wall lines — a REAL wall at a fixed coordinate covers a
//        long CONTIGUOUS run along its axis; a ring arc / furniture blob
//        covers at most ~0.5 m at any fixed coord, so coverage separates them.
const CELL = 0.25;
type Line = { at: number; from: number; to: number; cov: number; n: number };
/** Longest CONTIGUOUS run of occupied cells (gaps ≤ 0.75 m bridged). A real
 *  wall is contiguous along its axis; a ring crossing a fixed coordinate is
 *  not (it hits two 1-cell clusters), so contiguity — not span — separates
 *  straight architecture from the rotunda. */
const longestRun = (cells: number[]): [number, number, number] => {
  let bc = 0, bf = 0, bt = 0, cc = 0, cf = 0;
  for (let i = 0; i < cells.length; i++) {
    if (i === 0 || cells[i] - cells[i - 1] > 3) { cf = cells[i]; cc = 1; } else cc++;
    if (cc > bc) { bc = cc; bf = cf; bt = cells[i]; }
  }
  return [bc, bf, bt];
};
const straightLines = (pts: { x: number; z: number }[], axis: 'x' | 'z'): Line[] => {
  const fixed = new Map<number, { runs: Set<number>; n: number }>();
  for (const p of pts) {
    const key = Math.round((axis === 'x' ? p.z : p.x) / CELL);
    const run = Math.round((axis === 'x' ? p.x : p.z) / CELL);
    let e = fixed.get(key);
    if (!e) { e = { runs: new Set<number>(), n: 0 }; fixed.set(key, e); }
    e.runs.add(run); e.n++;
  }
  const raw: Line[] = [];
  for (const [key, e] of fixed) {
    const cells = [...e.runs].sort((a, b) => a - b);
    const [cnt, bf, bt] = longestRun(cells);
    const cov = cnt * CELL;
    if (cov >= 3 && e.n >= 300) raw.push({ at: key * CELL, from: bf * CELL, to: bt * CELL, cov, n: e.n });
  }
  // merge the 2–3 parallel bins that make up one physical wall (≤ 0.5 m apart)
  const out: Line[] = [];
  let cur: Line[] = [];
  const flush = () => {
    if (!cur.length) return;
    const n = cur.reduce((s, l) => s + l.n, 0);
    out.push({
      at: +(cur.reduce((s, l) => s + l.at * l.n, 0) / n).toFixed(2),
      from: +Math.min(...cur.map(l => l.from)).toFixed(2),
      to: +Math.max(...cur.map(l => l.to)).toFixed(2),
      cov: +Math.max(...cur.map(l => l.cov)).toFixed(2),
      n,
    });
    cur = [];
  };
  for (const l of raw.sort((a, b) => a.at - b.at)) {
    if (cur.length && l.at - cur[cur.length - 1].at > 0.51) flush();
    cur.push(l);
  }
  flush();
  return out;
};

// ── 12. sweep EVERY band — which storey's wall plan is the playable level? ──
const BAND_PTS = new Map<string, { x: number; z: number }[]>();
for (const [a, b, name] of BANDS) BAND_PTS.set(name, band(a, b));
for (const [a, b, name] of BANDS) {
  const pts = BAND_PTS.get(name)!;
  // straightLines(pts,'x') keys on a FIXED Z and runs along X -> an E–W wall.
  // straightLines(pts,'z') keys on a FIXED X and runs along Z -> an N–S wall.
  // v0 named these nn/ew and printed x where z belonged: every line in this
  // section was rotated 90°, and §13's residual filter compared the wrong
  // axes outright.
  const ew = straightLines(pts, 'x'); // E–W walls — at = z (fixed), from/to = x
  const ns = straightLines(pts, 'z'); // N–S walls — at = x (fixed), from/to = z
  log(`── band ${name} (${(a - floorY).toFixed(1)}–${(b - floorY).toFixed(1)}m) ${pts.length}v · ${ns.length} N–S · ${ew.length} E–W`);
  for (const l of ns) log(`     N–S  x=${l.at.toFixed(2).padStart(7)} cov=${l.cov.toFixed(1).padStart(5)}m  z ${l.from.toFixed(2)}…${l.to.toFixed(2)} n=${l.n}`);
  for (const l of ew) log(`     E–W  z=${l.at.toFixed(2).padStart(7)} cov=${l.cov.toFixed(1).padStart(5)}m  x ${l.from.toFixed(2)}…${l.to.toFixed(2)} n=${l.n}`);
}

// ── 13. ring = whatever is NOT on a detected straight line ──
//  A point sits "on a wall" only when it is within 0.6 m of a line measured on
//  the SAME axis: x against the N–S lines (fixed x), z against the E–W lines
//  (fixed z). v0 crossed these axes, so ~57% of every band counted as
//  "residual" and each ring map rendered a 90°-rotated phantom plan instead of
//  the rotunda.
const RING_WINDOW = { minX: -19, maxX: -3, maxZ: 9 }; // rotunda box (BRAIN_ANCHOR −11.1, −0.3)
const ringOf = (name: string) => {
  const pts = BAND_PTS.get(name)!;
  const ew = straightLines(pts, 'x'); // E–W walls — at = z
  const ns = straightLines(pts, 'z'); // N–S walls — at = x
  const off = pts.filter(p =>
    Math.min(...ns.map(l => Math.abs(p.x - l.at))) > 0.6 &&
    Math.min(...ew.map(l => Math.abs(p.z - l.at))) > 0.6);
  const ring = off.filter(p =>
    p.x >= RING_WINDOW.minX && p.x <= RING_WINDOW.maxX && Math.abs(p.z) <= RING_WINDOW.maxZ);
  writeFileSync(`${DIR}/.floorplan-ring-${name}.txt`, asciiMap(off, 1,
    `ring/${name} — off-straight-line residual (${off.length}/${pts.length} of the band)`));
  if (ring.length < 10) {
    log(`── ring/${name}: residual ${off.length}/${pts.length} · window ${ring.length} — too few to fit`);
    return null;
  }
  let f = circleFit(ring);
  log(`── ring/${name}: residual ${off.length}/${pts.length} · window ${ring.length} · Kasa ${JSON.stringify(f)}`);
  for (let k = 0; k < 4; k++) {
    const keep = ring.filter(p => Math.abs(Math.hypot(p.x - f.cx, p.z - f.cz) - f.r) < 0.5);
    if (keep.length < 400) break;
    f = circleFit(keep);
    log(`     trim ${k + 1}: kept ${keep.length}/${ring.length} → ${JSON.stringify(f)}`);
  }
  // Final refit with NO window: keep only the points already on the fitted
  // annulus over the whole band. The −19..−3 window is not centred on the
  // ring, so it can pull the Kasa centre west; this step removes that bias.
  const onRing = off.filter(p => Math.abs(Math.hypot(p.x - f.cx, p.z - f.cz) - f.r) < 0.6);
  if (onRing.length >= 200) {
    const g = circleFit(onRing);
    log(`     windowless refit: ${onRing.length}/${off.length} → ${JSON.stringify(g)}`);
    f = g;
  }
  return f;
};

const RING_BANDS = ['low', 'mid', 'up', 'top', 'hi'] as const;
const ringFits = RING_BANDS.map(n => [n, ringOf(n)] as const);
log('── rotunda circle summary (Kasa fit on the off-wall residual, window −19..−3 × |z|≤9) ──');
for (const [n, f] of ringFits) log(f
  ? `   ring ${n.padEnd(4)} cx=${String(f.cx).padStart(7)} cz=${String(f.cz).padStart(7)} r=${String(f.r).padStart(6)} n=${f.n}`
  : `   ring ${n.padEnd(4)} no fit`);
log(`   reference: BRAIN_ANCHOR = (${BRAIN_ANCHOR.x}, ${BRAIN_ANCHOR.z}) · walls.ts ROTUNDA_R = 6.1`);
