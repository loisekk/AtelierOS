# Atelier AI Company OS — Memory Bank

This is the project's persistent memory. Read these files at the start of every
session (or when context is lost) before touching any code.

| File | Read when | Contains |
|---|---|---|
| `projectbrief.md` | First, always | What Atelier is, scope, success criteria, constraints |
| `productContext.md` | First, always | Why it exists, user flows, UX problems being solved |
| `techContext.md` | Before coding | Stack, commands, ports, message protocol, calibration tools |
| `systemPatterns.md` | Before changing engine/layout/screen code | Architecture, layout pipeline, facing conventions, screen contract, gotchas |
| `activeContext.md` | Every session | Current sprint: decoded work items A–F, verified root causes, exact diffs to apply |
| `progress.md` | Every session | What works, what's in flight, task board |

## Rules of this bank

1. `activeContext.md` and `progress.md` are **living** — update them after every
   meaningful change (task done, root cause verified, new bug found).
2. Root causes in `activeContext.md` are written against **verified code state**
   (file + line refs). If code drifts, re-verify before re-applying a diff.
3. Never assume a file's content from a pasted plan — open it. (History lesson:
   the decoded plan referenced shelf runs with gap 2.1 and an agentSpace shelf
   site that do not exist in the v3.4/v4.0 code.)
