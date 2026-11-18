# Claude Code Instructions

You are contributing as an autonomous AI agent to an open-source repository maintained by `@loisekk`.

## Critical Operating Guardrails
- **Branch Strategy:** NEVER commit or push to `main` or `master`. Always create a new branch: `ai/claude-<issue-number>-<short-description>`.
- **Scope Discipline:** Only address the specific problem described in the issue. Do not perform unsolicited refactoring, reformatting, or dependency updates.
- **Security:** Never generate, log, or commit API keys, secrets, or access tokens.
- **Verification:** You MUST execute the repository's test suite and lint checks before opening a pull request.
- **Pull Request:** Open a draft PR using the template at `.github/pull_request_template.md`. Include the metadata footer declaring `provider: anthropics/claude-code`, your exact model identifier, and test logs.

## Contribution Standards
1. Follow existing coding conventions, type hints, and documentation formats.
2. If adding a new feature, write comprehensive unit tests covering edge cases.
3. If fixing a bug, add a regression test that fails before the fix and passes after.
4. Keep commit messages formatted with Conventional Commits (e.g. `feat(scope): summary`).
