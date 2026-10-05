// TEMP: re-render a .floorplan-*.txt occupancy map with world-coordinate
// rulers, so the ASCII maps can be read without guessing which column is x=0.
//   bun scripts\_map-ruler.ts .floorplan-band-top.txt
//
// AXIS CONVENTION — the single convention shared with asciiMap() in
// _floorplan-probe.ts (keep the two in sync):
//   COLUMNS = X, left -> right, growing EAST     (x = MINX + col * cell)
//   ROWS    = Z, top  -> bottom, growing SOUTH   (z = MINZ + row * cell)
//   so NORTH (−Z) is the TOP row, EAST (+X) the RIGHT column, and x=0 / z=0
//   are marked '|' on the rulers.
//
// Reads both flavours of dump:
//   · the new self-describing dumps (legend lines starting '#', rows 'z=  -7 …')
//   · the legacy bare grids written by the v0 probe
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: bun scripts\\_map-ruler.ts <map.txt>');
  process.exit(1);
}

const raw = readFileSync(path, 'utf8').replace(/\r/g, '').split('\n');

// ── split the dump into legend / grid rows / noise ──
const notes: string[] = [];
const grid: { z: number | null; row: string }[] = [];
for (const line of raw) {
  if (!line.length) continue;
  const tagged = line.match(/^z=\s*(-?\d+)\s(.*)$/);
  if (tagged) { grid.push({ z: Number(tagged[1]), row: tagged[2] }); continue; }
  if (line.startsWith('#')) { notes.push(line.slice(1).trim()); continue; }
  if (/^[.#+]+$/.test(line.trim()) && line.trim().length > 16) {
    grid.push({ z: null, row: line }); continue;
  }
  // otherwise it is one of the embedded ruler lines -> ignore, we print our own
}
if (!grid.length) { console.error(`no grid rows found in ${path}`); process.exit(2); }

const COLS = grid[0].row.length;
// extents come from the embedded legend when present, else the v0 defaults
const numAfter = (re: RegExp, fallback: number): number => {
  const hit = notes.map(n => n.match(re)).find(Boolean);
  return hit ? Number(hit[1]) : fallback;
};
const NUM = String.raw`(-?\d+(?:\.\d+)?)`;
const MINX = numAfter(new RegExp(`x = columns\\s+${NUM}\\.\\.`), -24);
const MAXX = numAfter(new RegExp(`x = columns\\s+-?\\d+(?:\\.\\d+)?\\.\\.${NUM}`), 23);
const MINZ = numAfter(new RegExp(`z = rows\\s+${NUM}\\.\\.`), -22);
const CELL = (MAXX - MINX + 1) / COLS;

const GUT = 7; // matches 'z= -22 ' in the dumps
const ruler = (): [string, string] => {
  const text = new Array<string>(COLS).fill(' ');
  const marks = new Array<string>(COLS).fill(' ');
  for (let c = 0; c < COLS; c++) {
    const x = MINX + c * CELL;
    if (x % 10 === 0) marks[c] = '|';
    else if (x % 5 === 0) marks[c] = "'";
  }
  for (let c = 0; c < COLS; c++) {
    const x = MINX + c * CELL;
    if (x % 10 !== 0) continue;
    const s = String(Math.round(x));
    const start = Math.max(0, Math.min(COLS - s.length, c - Math.floor(s.length / 2)));
    for (let k = 0; k < s.length; k++) text[start + k] = s[k];
  }
  const gut = ' '.repeat(GUT);
  return [`${gut}${text.join('')}`, `${gut}${marks.join('')}`];
};

const basename = path.replace(/\\/g, '/').split('/').pop();
console.log(`\n${basename}  ·  ${COLS} cols × ${grid.length} rows  ·  ${CELL} m/cell`);
for (const n of notes) console.log(`  # ${n}`);
console.log(`  x →  ${MINX} … ${Math.round(MINX + (COLS - 1) * CELL)}   (left→right = EAST +X)`);
console.log(`  z ↓  ${MINZ} … ${Math.round(MINZ + (grid.length - 1) * CELL)}   (top→bottom = SOUTH; NORTH is −Z, at the top)`);
const [t1, t2] = ruler();
console.log(t1);
console.log(t2);
grid.forEach((g, i) => {
  const z = g.z ?? MINZ + i * CELL;
  console.log(`z=${`${Math.round(z)}`.padStart(4, ' ')} ${g.row}`);
});
console.log(t2);
console.log(`${' '.repeat(GUT + 7)}↑ EAST +X →    (ticks every 5 m, '|' + label every 10 m)\n`);

