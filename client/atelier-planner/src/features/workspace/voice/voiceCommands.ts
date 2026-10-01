import type { PlacedItemMeta } from '../../ai-agents/types';
import type { AtelierEngine } from '../../canvas/engine/AtelierEngine';

/**
 * Phase 15A — Voice Command Router.
 *
 * Pure, framework-free module: transcript in → side effects via the context
 * out. First matching intent wins (VIEW → MEETING → LAYOUT → MOVE → STATUS →
 * DISPATCH). Returns true when the transcript was handled as a command — the
 * caller (App.handleTranscript) then SKIPS its default dispatch-to-first path;
 * false lets free speech fall through to the legacy behavior.
 */

export type VoiceView = 'office' | 'ceo' | 'command' | 'knowledge' | 'top';

export interface VoiceCommandContext {
  employees: PlacedItemMeta[];                                  // role items only
  dispatch: (prompt: string, assigneeIds: string[]) => void;
  engine: AtelierEngine | null;
  setView: (v: VoiceView) => void;
  speak: (text: string, agentId?: string) => void;              // 15B hook below
  toast: (msg: string) => void;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lowercase fuzzy name match against `config?.name ?? name`.
 *  Full-name contains first, then whole-word first-name fallback. */
function resolveEmployees(transcript: string, employees: PlacedItemMeta[]): PlacedItemMeta[] {
  const t = transcript.toLowerCase();
  return employees.filter(e => {
    const name = (e.config?.name ?? e.name).toLowerCase().trim();
    if (!name) return false;
    if (t.includes(name)) return true;
    const first = name.split(/\s+/)[0];
    return first.length >= 3 && new RegExp(`\\b${esc(first)}\\b`).test(t);
  });
}

const HAS_COLLECTIVE = /\b(everyone|everybody|all|team|crew|all of you|you all|y'all)\b/i;

/** MOVE destination vocabulary → engine waypoint keys (Navigation.ts). */
function destFor(transcript: string): 'meeting_table' | 'knowledge_center' | 'ceo_center' | 'desk' | null {
  const t = transcript.toLowerCase();
  if (/\bdesk(s)?\b/.test(t) && /\b(back|return|home|your)\b/.test(t)) return 'desk';
  if (/\b(meeting|standup|stand-up|conference)\b/.test(t)) return 'meeting_table';
  if (/\b(knowledge|library|bookshelf|research)\b/.test(t)) return 'knowledge_center';
  if (/\b(brain|ceo)\b/.test(t)) return 'ceo_center';
  if (/\bdesk(s)?\b/.test(t)) return 'desk';
  return null;
}

/** Build the dispatch prompt: strip the trigger verb, matched names and
 *  collective filler. Falls back to the full transcript when nothing useful
 *  survives (the model needs SOMETHING to work with). */
function buildPrompt(transcript: string, matched: PlacedItemMeta[], employees: PlacedItemMeta[]): string {
  let rest = transcript
    .replace(/^(?:please\s+)?(?:task|assign|ask|tell|have|get|give|delegate|dispatch)\s+/i, '')
    .replace(/^(?:the\s+)?(?:team|everyone|everybody|all|all of you|y'all|you all)\s+(?:to\s+)?/i, '');
  const seen = new Set<string>();
  for (const e of [...matched, ...employees]) {
    const name = (e.config?.name ?? e.name).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    rest = rest.replace(new RegExp(`\\b${esc(name)}\\b`, 'gi'), ' ');
  }
  rest = rest.replace(/^\s*to\s+/i, '')
    .replace(/^(?:the\s+)?(?:team|everyone|everybody|all)\s+(?:to\s+)?/i, '')
    .replace(/[,.]$/, '').replace(/\s+/g, ' ').trim();
  return rest || transcript.trim();
}

/**
 * Returns true if the transcript was handled as a command (App skips default dispatch).
 */
export function routeVoiceCommand(transcript: string, ctx: VoiceCommandContext): boolean {
  const t = transcript.toLowerCase().trim();
  if (!t) return false;
  const { employees, engine, setView, speak, toast, dispatch } = ctx;
  const named = resolveEmployees(t, employees);
  const collectAll = HAS_COLLECTIVE.test(t);

  // ── 1 · VIEW ──────────────────────────────────────────────────────────────
  const view: VoiceView | null =
    /\b(top view|bird'?s[ -]?eye|birds[ -]?eye|birdseye|overhead)\b/.test(t) ? 'top' :
    /\b(brain|ceo)\b/.test(t) && /\b(show|view|go to|switch|camera|see)\b/.test(t) ? 'ceo' :
    /\bcommand (view|center|deck)\b/.test(t) ? 'command' :
    /\bknowledge (view|center)\b/.test(t) ? 'knowledge' :
    /\b(office view|show the (office|floor))\b/.test(t) ? 'office' : null;
  if (view) {
    setView(view);
    const line = `Switching to ${view === 'ceo' ? 'the brain' : view} view.`;
    speak(line);
    toast(`View → ${view}`);
    return true;
  }

  // ── 2 · MEETING ───────────────────────────────────────────────────────────
  if (/\bstand-?up\b/.test(t) || /\bstand up\b/.test(t) || /\bgather (the|your) (team|crew)\b/.test(t) || /\bteam meeting\b/.test(t)) {
    if (employees.length === 0) {
      speak('Nobody has been hired yet.');
      toast('Hire employees before starting a meeting!');
      return true;
    }
    if (!engine) { toast('Engine still loading — try again in a moment.'); return true; }
    engine.startMeeting(employees.map(e => e.id));
    speak('Gathering the team.');
    toast('Team gathering in the Meeting Room…');
    return true;
  }

  // ── 3 · LAYOUT ────────────────────────────────────────────────────────────
  if (/\breset (the )?(office|layout|floor plan)\b/.test(t) || /\b(reset|restore) (the )?(default|canonical) layout\b/.test(t)) {
    if (!engine) { toast('Engine still loading — try again in a moment.'); return true; }
    engine.resetOffice();
    speak('Office reset to the default layout.');
    toast('Office reset to canonical default layout');
    return true;
  }

  // ── 4 · MOVE ──────────────────────────────────────────────────────────────
  const wantsMove = /\b(walk|go|head|move|run|send)\b/.test(t) ||
    /\bback to (your|the) desks?\b/.test(t) ||
    /\breturn to (your|the) desks?\b/.test(t);
  if (wantsMove) {
    const dest = destFor(t);
    if (dest) {
      const targets = named.length > 0 ? named : (collectAll ? employees : []);
      if (targets.length > 0) {
        if (!engine) { toast('Engine still loading — try again in a moment.'); return true; }
        for (const e of targets) {
          if (dest === 'desk') engine.returnAgentToDesk(e.id);
          else engine.walkAgentTo(e.id, dest);
        }
        const who = targets.length === 1
          ? (targets[0].config?.name ?? targets[0].name)
          : `${targets.length} teammates`;
        const line = dest === 'desk'
          ? `${who} heading back to ${targets.length === 1 ? 'their' : 'their'} desks.`
          : `${who} walking to the ${dest.replace(/_/g, ' ')}.`;
        speak(line, targets[0]?.id);
        toast(line);
        return true;
      }
      // Destination recognized but no name & no collective — ambiguous; fall through.
    }
  }

  // ── 5 · STATUS ────────────────────────────────────────────────────────────
  const wantsStatus = /\bstatus\b/.test(t) ||
    /\b(what'?s|whats|what is)\b[^.?!]*\b(working on|doing)\b/.test(t) ||
    /\bhow'?s (the|your) (team|day)\b/.test(t) ||
    /\bwhat are\b[^.?!]*\b(working on|doing)\b/.test(t);
  if (wantsStatus) {
    const targets = named.length > 0 ? named : employees;
    if (targets.length === 0) {
      speak('There is no team yet.');
      toast('No employees to report on.');
      return true;
    }
    let line: string;
    if (targets.length === 1) {
      const e = targets[0];
      line = `${e.config?.name ?? e.name} is ${e.status ?? 'idle'}.`;
      speak(line, e.id);
    } else {
      const counts = new Map<string, number>();
      for (const e of targets) {
        const s = e.status ?? 'idle';
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      const breakdown = [...counts.entries()].map(([s, n]) => `${n} ${s}`).join(', ');
      line = `Team status — ${targets.length} agents: ${breakdown}.`;
      speak(line);
    }
    toast(line);
    return true;
  }

  // ── 6 · DISPATCH ──────────────────────────────────────────────────────────
  const wantsDispatch = /^(?:please\s+)?(?:task|assign|ask|tell|have|get|give|delegate|dispatch)\b/.test(t) ||
    /\b(team|everyone|all)\s+to\b/.test(t);
  if (wantsDispatch) {
    const targets = named.length > 0 ? named : employees;   // no name matched → all agents
    if (targets.length === 0) {
      speak('Nobody has been hired yet.');
      toast('Hire an employee first!');
      return true;
    }
    const prompt = buildPrompt(transcript, named, employees);
    dispatch(prompt, targets.map(e => e.id));
    const who = named.length > 0
      ? named.map(e => e.config?.name ?? e.name).join(' and ')
      : 'the whole team';
    const line = `Dispatched to ${who}.`;
    speak(line, named[0]?.id);
    toast(line);
    return true;
  }

  return false;
}
