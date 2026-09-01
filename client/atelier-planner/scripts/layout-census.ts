/// <reference types="node" />
// scripts/layout-census.ts — browser-free verification of the canonical layout.
// No engine, no browser: validates the v3.2 layout module directly.
//
// Usage:
//   bun run layout:census            → standard preset (default)
//   bun run layout:census dense      → dense preset (full v2.1 richness)
//   bun run layout:census sparse     → sparse preset (essentials)
//   bun run layout:census all        → all three censuses in one run

import { getLayoutStats, DEFAULT_OFFICE_LAYOUT_VERSION } from '../src/features/canvas/architecture/RoomFurnisher';
import type { LayoutPreset } from '../src/features/canvas/architecture/RoomFurnisher';

const PRESETS = ['standard', 'dense', 'sparse'] as const;

function printCensus(preset: LayoutPreset): void {
  const stats = getLayoutStats(preset);
  let total = 0;
  let wsTotal = 0;

  console.log(`\n🏛️ Canonical layout v${DEFAULT_OFFICE_LAYOUT_VERSION} — preset '${preset}'`);
  console.log('─'.repeat(70));
  for (const [room, s] of Object.entries(stats)) {
    total += s.count;
    wsTotal += s.ws;
    const types = Object.entries(s.types).map(([t, n]) => `${t}×${n}`).join(', ');
    console.log(`  ${room.padEnd(16)} ${String(s.count).padStart(3)} items  ${String(s.ws).padStart(2)} ws  [${types}]`);
  }
  console.log('─'.repeat(70));
  console.log(`  TOTAL: ${total} items · ${wsTotal} screen-linked workstations`);
}

const arg = (process.argv[2] ?? 'standard').toLowerCase();

if (arg === 'all') {
  for (const p of PRESETS) printCensus(p);
  console.log('');
} else if ((PRESETS as readonly string[]).includes(arg)) {
  printCensus(arg as LayoutPreset);
  console.log('');
} else {
  console.error(`\n❌ Unknown preset '${arg}'.`);
  console.error(`   Usage: bun run layout:census [standard | dense | sparse | all]`);
  process.exit(1);
}