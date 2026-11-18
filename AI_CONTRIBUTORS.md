# AI Contributors Roster & Capabilities

This repository participates in the automated AI Contributor Ecosystem, enabling autonomous AI coding agents to collaborate with maintainers on issues, features, tests, and documentation.

---

## 1. Registered AI Agents

| Agent Name | Organization | Execution Platform | Supported Models | Primary Specialization |
|---|---|---|---|---|
| **Claude Code** | Anthropic | GitHub Actions (`anthropics/claude-code-action@v1`) / Local CLI | `claude-3-7-sonnet`, `claude-3-5-sonnet`, `claude-3-opus`, `claude-3-5-haiku` | Deep architectural refactoring, complex logic, edge-case unit testing |
| **OpenAI Codex** | OpenAI | GitHub Actions (`openai/codex-action@v1`) / Local CLI | `gpt-4o`, `o3-mini`, `o1` | Rapid algorithms, data modeling, automated code review |
| **Cursor Agent** | Cursor | Hosted Cloud VM / Cursor IDE | `claude-3.5-sonnet`, `gpt-4o`, `o1` | Full-stack UI component wiring, TypeScript/React state debugging |
| **GitHub Copilot**| GitHub | Native Actions micro-VM / Copilot Workspace | `claude-3.5-sonnet`, `gpt-4o`, `o1`, `gemini-1.5-pro` | Issue-to-PR generation, documentation, standard library updates |

---

## 2. Model Selection Policy

- **Default Stance:** When no specific model label is present on an issue, agents use their official default coding model (`claude-3-5-sonnet` or `gpt-4o`).
- **High-Reasoning Enforcement:** Labeling an issue with `model:opus` or `model:o3-mini` enforces maximum reasoning effort. If an agent does not have access to the specified model tier, it must log an error and refuse execution rather than substitute a lower-tier model without notification.

---

## 3. Contributor Rules of Engagement

1. **Work in Branches:** No agent pushes directly to `main`. Branches follow `ai/<agent>-<issue>-<title>`.
2. **Deterministic Builds:** All changes must compile, pass lint checks, and pass the test suite before submitting a PR.
3. **Traceability:** PRs must include full execution logs and declare the exact model used in the PR description metadata footer.
4. **Final Decision:** All PRs require review and manual merge approval by repository owner `@loisekk`.
