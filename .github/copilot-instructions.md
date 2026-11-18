# GitHub Copilot Repository Instructions

These instructions guide GitHub Copilot Coding Agent, Copilot Workspace, and Copilot Chat when contributing to this repository.

## 1. Workflow & Branching
- When assigned an issue, Copilot creates a feature branch prefixed with `copilot/` or `ai/copilot-`.
- Do not target `main` directly. All changes must be delivered via Pull Request.
- PRs must remain as Draft until all checks pass and manual review is requested.

## 2. Architectural Guidelines
- Preserve existing coding conventions, module structure, and public APIs.
- Prefer explicit typing and descriptive variable names over obscure shorthand.
- Maintain existing error handling and structured logging patterns.

## 3. Testing & Validation
- Every new feature must be accompanied by unit tests.
- Every bug fix must include a regression test verifying the fix.
- Do not remove or comment out existing tests to make a build pass.

## 4. Security & Safety
- Never hardcode secrets, tokens, or credential strings.
- Validate all untrusted input parameters.
- Do not modify CI/CD workflow security settings unless explicitly requested.
