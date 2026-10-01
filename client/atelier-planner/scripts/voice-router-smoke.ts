/** Phase 15A smoke test — runs routeVoiceCommand against sample transcripts.
 *  Run: bun scripts/voice-router-smoke.ts  (exits 1 on any failed expectation) */
import { routeVoiceCommand } from '../src/features/workspace/voice/voiceCommands';
import type { VoiceCommandContext, VoiceView } from '../src/features/workspace/voice/voiceCommands';
import type { PlacedItemMeta } from '../src/features/ai-agents/types';

const maya: PlacedItemMeta = { id: 'a1', type: 'employee', name: 'Employee', price: 0, seats: 0, position: { x: 0, z: 0 }, rotation: 0, role: 'Engineer', status: 'working', config: { name: 'Maya', harness: 'h', model: 'm', provider: 'p' } };
const dev: PlacedItemMeta = { id: 'a2', type: 'employee', name: 'Employee', price: 0, seats: 0, position: { x: 1, z: 1 }, rotation: 0, role: 'Developer', status: 'idle', config: { name: 'Dev', harness: 'h', model: 'm', provider: 'p' } };

type Call = string;
let calls: Call[] = [];
const engineCalls: Call[] = [];
const engine = {
  startMeeting: (ids: string[]) => engineCalls.push(`meeting(${ids.join(',')})`),
  resetOffice: () => engineCalls.push('reset'),
  walkAgentTo: (id: string, d: string) => engineCalls.push(`walk:${id}->${d}`),
  returnAgentToDesk: (id: string) => engineCalls.push(`desk:${id}`),
} as never;

function ctx(employees = [maya, dev]): VoiceCommandContext {
  calls = [];
  engineCalls.length = 0;
  return {
    employees,
    dispatch: (prompt, ids) => calls.push(`dispatch[${ids.join(',')}]="${prompt}"`),
    engine,
    setView: (v: VoiceView) => calls.push(`view:${v}`),
    speak: (t) => calls.push(`speak:"${t}"`),
    toast: (m) => calls.push(`toast:"${m}"`),
  };
}

let failures = 0;
function check(label: string, got: boolean, expect: boolean, detail?: string) {
  if (got !== expect) { failures++; console.error(`✗ ${label} — expected ${expect}, got ${got}${detail ? ` [${detail}]` : ''}`); }
  else console.log(`✓ ${label}`);
}

// 1 · VIEW
{
  const c = ctx();
  const h = routeVoiceCommand('show me the top view', c);
  check('VIEW top view → handled', h, true);
  check('VIEW calls setView(top)', calls.some(x => x === 'view:top'), true, calls.join(' | '));
  check('VIEW speaks', calls.some(x => x.startsWith('speak:')), true);
}
{
  const c = ctx();
  const h = routeVoiceCommand("bird's eye", c);
  check("VIEW bird's eye handled", h, true);
  check("VIEW bird's eye → top", calls.some(x => x === 'view:top'), true, calls.join(' | '));
}
{
  const c = ctx();
  routeVoiceCommand('show me the brain', c);
  check('VIEW brain → ceo', calls.some(x => x === 'view:ceo'), true, calls.join(' | '));
}

// 2 · MEETING
{
  const c = ctx();
  const h = routeVoiceCommand('start a standup', c);
  check('MEETING handled', h, true);
  check('MEETING startMeeting(all)', engineCalls.includes('meeting(a1,a2)'), true, engineCalls.join(' | '));
  check('MEETING speaks "Gathering"', calls.some(x => x.includes('Gathering')), true, calls.join(' | '));
}
{
  const c = ctx();
  const h = routeVoiceCommand('gather the team', c);
  check('MEETING gather the team', h && engineCalls.includes('meeting(a1,a2)'), true, engineCalls.join(' | '));
}

// 3 · LAYOUT
{
  const c = ctx();
  const h = routeVoiceCommand('reset the office', c);
  check('LAYOUT handled', h, true);
  check('LAYOUT resetOffice', engineCalls.includes('reset'), true, engineCalls.join(' | '));
}

// 4 · MOVE
{
  const c = ctx();
  const h = routeVoiceCommand('Maya, walk to the meeting room', c);
  check('MOVE handled', h, true);
  check('MOVE Maya → meeting_table', engineCalls.includes('walk:a1->meeting_table'), true, engineCalls.join(' | '));
  check('MOVE only Maya', !engineCalls.some(x => x.includes('a2')), true, engineCalls.join(' | '));
}
{
  const c = ctx();
  const h = routeVoiceCommand('everyone back to your desks', c);
  check('MOVE everyone desks handled', h, true);
  check('MOVE all → desk', engineCalls.includes('desk:a1') && engineCalls.includes('desk:a2'), true, engineCalls.join(' | '));
}

// 5 · STATUS
{
  const c = ctx();
  const h = routeVoiceCommand("what's Maya working on?", c);
  check('STATUS handled', h, true);
  check('STATUS names Maya + status', calls.some(x => x.includes('Maya is working')), true, calls.join(' | '));
}
{
  const c = ctx();
  const h = routeVoiceCommand('team status', c);
  check('STATUS team summary', h && calls.some(x => x.includes('2 agents')), true, calls.join(' | '));
}

// 6 · DISPATCH
{
  const c = ctx();
  const h = routeVoiceCommand('task Maya to refactor auth', c);
  check('DISPATCH handled', h, true);
  check('DISPATCH to Maya only', calls.some(x => x.startsWith('dispatch[a1]=')), true, calls.join(' | '));
  check('DISPATCH prompt stripped', calls.some(x => x.includes('="refactor auth"')), true, calls.join(' | '));
}
{
  const c = ctx();
  const h = routeVoiceCommand('have the team review the API', c);
  check('DISPATCH team → all', h && calls.some(x => x.startsWith('dispatch[a1,a2]=')), true, calls.join(' | '));
  check('DISPATCH team prompt', calls.some(x => x.includes('="review the API"')), true, calls.join(' | '));
}

// Fallback — free speech must NOT be swallowed
{
  const c = ctx();
  const h = routeVoiceCommand('the weather is nice today', c);
  check('FREE SPEECH → false', h, false);
  check('FREE SPEECH no side effects', calls.length === 0, true, calls.join(' | '));
}

// Empty team guard
{
  const c = ctx([]);
  const h = routeVoiceCommand('start a standup', c);
  check('MEETING empty team handled+toasted', h && calls.some(x => x.includes('Hire employees')), true, calls.join(' | '));
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nAll voice-router smoke checks passed.');
