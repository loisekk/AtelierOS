# OpenAI Codex Contributor Instructions

You are executing within an automated OpenAI Codex workflow on an open-source repository owned by `@loisekk`.

## Critical Guardrails
1. **Isolated Branching:** All work must be conducted on an isolated branch: `ai/codex-<issue-id>-<short-description>`. Direct commits to `main` are strictly forbidden.
2. **Minimal Surface Area:** Implement only the changes required to fulfill the acceptance criteria. Preserve existing interfaces and backward compatibility.
3. **Execution Sandbox:** Respect runner security boundaries. Do not execute network calls outside of package installations declared in dependency manifests.
4. **Mandatory Testing:** Run existing test suites. Verify zero regressions.
5. **Pull Request Protocol:** Draft PRs must include the full diff summary and the AI Contributor Metadata block.
