---
references:
  - "File: /client/atelier-planner/src/data/models.ts"
  - |+
    Reference: <skills>
    Here is a list of skills that contain domain specific knowledge on a variety of topics.
    Each skill comes with a description of the topic and a file path that contains the detailed instructions.
    When a user asks you to perform a task that falls within the domain of a skill, use the #tool:read/readFile tool to acquire the full instructions from the file URI.
    <skill>
    <name>agent-reach</name>
    <description>MUST USE when user wants to research/search/look up/find anything on the internet — e.g. "research this topic", "do a deep dive on X", "search the web for X", "see what people say about X", "look this up".
    Also MUST USE when user mentions any platform or shares any URL/link: Twitter/X, Reddit, YouTube, GitHub, Bilibili, XiaoHongShu, Xiaoyuzhou Podcast, LinkedIn/jobs/recruiting, V2EX, Xueqiu (stocks), RSS.
    13 platforms, multi-backend routing (OpenCLI / per-platform CLIs / APIs). Zero config for 6 channels. Run `agent-reach doctor --json` to see which backend serves each platform right now.
    NOT for: writing reports/analysis/translation (this skill only FETCHES internet content); posting/commenting/liking (write operations); platforms that already have a dedicated skill installed (prefer that skill).
    </description>
    <file>c:\Users\yashb\.agents\skills\agent-reach\SKILL.md</file>
    </skill>
    <skill>
    <name>codebase-design</name>
    <description>Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.</description>
    <file>c:\Users\yashb\.agents\skills\codebase-design\SKILL.md</file>
    </skill>
    <skill>
    <name>codex-review</name>
    <description>A standalone adversarial PLAN-review loop where Claude Code (builder) and OpenAI Codex (read-only critic) tag-team an implementation plan before any code is written. Use this when you ALREADY have a plan or a clear idea and just want the cross-model stress-test — no requirements interview first. Claude drafts/loads the plan into PLAN.md, Codex reviews it in a read-only sandbox and returns VERDICT:APPROVED or VERDICT:REVISE, Claude revises and re-submits to the SAME Codex session (context preserved) until APPROVED or a configurable MAX_ROUNDS cap is hit. Human approves the converged plan before code. Use when the user says "/codex-review", "codex review my plan", "have Codex review my plan", "argue this plan with Codex", "adversarial plan review", "make Claude and Codex argue/fight over the plan", or is about to build something high-stakes (auth, schema, concurrency, migrations, payments) and wants a second-model sanity check on the PLAN before implementation. For a guided requirements interview BEFORE the rev</description>
    <file>c:\Users\yashb\.agents\skills\codex-review\SKILL.md</file>
    </skill>
    <skill>
    <name>context7-mcp</name>
    <description>This skill should be used when the user asks about libraries, frameworks, API references, or needs code examples. Activates for setup questions, code generation involving libraries, or mentions of specific frameworks like React, Vue, Next.js, Prisma, Supabase, etc.</description>
    <file>c:\Users\yashb\.agents\skills\context7-mcp\SKILL.md</file>
    </skill>
    <skill>
    <name>diagnosing-bugs</name>
    <description>Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.</description>
    <file>c:\Users\yashb\.agents\skills\diagnosing-bugs\SKILL.md</file>
    </skill>
    <skill>
    <name>domain-modeling</name>
    <description>Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.</description>
    <file>c:\Users\yashb\.agents\skills\domain-modeling\SKILL.md</file>
    </skill>
    <skill>
    <name>exa-search</name>
    <description>Deep research powered by Exa. Use for lead generation, literature reviews, deep dives, competitive analysis, or any query where one search falls short, including phrases like 'research this', 'find everything about', 'find me all', or 'deep dive on'.</description>
    <file>c:\Users\yashb\.agents\skills\exa-search\SKILL.md</file>
    </skill>
    <skill>
    <name>git-guardrails-claude-code</name>
    <description>Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset in Claude Code.</description>
    <file>c:\Users\yashb\.agents\skills\git-guardrails-claude-code\SKILL.md</file>
    </skill>
    <skill>
    <name>grill-me-codex</name>
    <description>Two-act plan hardening. ACT 1 (you ↔ Claude) — Claude interviews you relentlessly about a plan or design, one question at a time, recommending an answer for each and exploring the codebase when it can answer itself, until every branch of the decision tree is resolved. ACT 2 (Claude ↔ Codex) — Claude writes the locked plan to PLAN.md and OpenAI Codex adversarially reviews it in a read-only sandbox (VERDICT:APPROVED/REVISE), Claude revises and re-submits to the SAME Codex session until APPROVED or a MAX_ROUNDS cap, then you sign off before any code. Use when the user says "/grill-me-codex", "grill me then have codex review", "grill me and stress-test the plan", "interview me about this plan then get a second model on it", or is about to build something high-stakes (auth, schema, concurrency, migrations, payments) and wants both alignment AND a cross-model sanity check before implementation. Builds on Matt Pocock's grill-me (MIT). For the docs-aware variant use /grill-with-docs-codex; if you already have a plan </description>
    <file>c:\Users\yashb\.agents\skills\grill-me-codex\SKILL.md</file>
    </skill>
    <skill>
    <name>grill-with-docs-codex</name>
    <description>Two-act plan hardening with living documentation. ACT 1 (you ↔ Claude) — Claude interviews you relentlessly about a plan, one question at a time, challenging it against your project's existing domain model and glossary (CONTEXT.md), sharpening fuzzy terms, stress-testing with concrete scenarios, cross-referencing code, and updating CONTEXT.md + ADRs inline as decisions crystallise. ACT 2 (Claude ↔ Codex) — Claude writes the locked plan to PLAN.md and OpenAI Codex adversarially reviews it in a read-only sandbox (VERDICT:APPROVED/REVISE), Claude revises and re-submits to the SAME Codex session until APPROVED or a MAX_ROUNDS cap, then you sign off before any code. Use when the user says "/grill-with-docs-codex", "grill me against the docs then have codex review", "stress-test this against our domain model then get a second model on it", or is about to build something high-stakes in a project with established terminology/ADRs and wants alignment, documentation, AND a cross-model sanity check. Builds on Matt Pococ</description>
    <file>c:\Users\yashb\.agents\skills\grill-with-docs-codex\SKILL.md</file>
    </skill>
    <skill>
    <name>grilling</name>
    <description>Interview the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.</description>
    <file>c:\Users\yashb\.agents\skills\grilling\SKILL.md</file>
    </skill>
    <skill>
    <name>migrate-to-shoehorn</name>
    <description>Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests, or needs partial test data.</description>
    <file>c:\Users\yashb\.agents\skills\migrate-to-shoehorn\SKILL.md</file>
    </skill>
    <skill>
    <name>resolving-merge-conflicts</name>
    <description>Use when you need to resolve an in-progress git merge/rebase conflict.</description>
    <file>c:\Users\yashb\.agents\skills\resolving-merge-conflicts\SKILL.md</file>
    </skill>
    <skill>
    <name>scaffold-exercises</name>
    <description>Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises, create exercise stubs, or set up a new course section.</description>
    <file>c:\Users\yashb\.agents\skills\scaffold-exercises\SKILL.md</file>
    </skill>
    <skill>
    <name>setup-pre-commit</name>
    <description>Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit-time formatting/typechecking/testing.</description>
    <file>c:\Users\yashb\.agents\skills\setup-pre-commit\SKILL.md</file>
    </skill>
    <skill>
    <name>tdd</name>
    <description>Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.</description>
    <file>c:\Users\yashb\.agents\skills\tdd\SKILL.md</file>
    </skill>
    <skill>
    <name>understand</name>
    <description>Analyze a codebase to produce an interactive knowledge graph for understanding architecture, components, and relationships</description>
    <file>c:\Users\yashb\.agents\skills\understand\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-chat</name>
    <description>Use when you need to ask questions about a codebase or understand code using a knowledge graph</description>
    <file>c:\Users\yashb\.agents\skills\understand-chat\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-dashboard</name>
    <description>Launch the interactive web dashboard to visualize a codebase's knowledge graph</description>
    <file>c:\Users\yashb\.agents\skills\understand-dashboard\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-diff</name>
    <description>Use when you need to analyze git diffs or pull requests to understand what changed, affected components, and risks</description>
    <file>c:\Users\yashb\.agents\skills\understand-diff\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-domain</name>
    <description>Extract business domain knowledge from a codebase and generate an interactive domain flow graph. Works standalone (lightweight scan) or derives from an existing /understand knowledge graph.</description>
    <file>c:\Users\yashb\.agents\skills\understand-domain\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-explain</name>
    <description>Use when you need a deep-dive explanation of a specific file, function, or module in the codebase</description>
    <file>c:\Users\yashb\.agents\skills\understand-explain\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-knowledge</name>
    <description>Analyze a Karpathy-pattern LLM wiki knowledge base and generate an interactive knowledge graph with entity extraction, implicit relationships, and topic clustering.</description>
    <file>c:\Users\yashb\.agents\skills\understand-knowledge\SKILL.md</file>
    </skill>
    <skill>
    <name>understand-onboard</name>
    <description>Use when you need to generate an onboarding guide for new team members joining a project</description>
    <file>c:\Users\yashb\.agents\skills\understand-onboard\SKILL.md</file>
    </skill>
    <skill>
    <name>project-setup-info-local</name>
    <description>Comprehensive setup steps to help the user create complete project structures in a VS Code workspace; this tool is designed for full project initialization and scaffolding, not for creating individual files. When to use this tool: user wants to create a new complete project from scratch; setting up entire project frameworks (TypeScript projects, React apps, Node.js servers, etc.); initializing Model Context Protocol (MCP) servers with full structure; creating VS Code extensions with proper scaffolding; setting up Next.js, Vite, or other framework-based projects; user asks for "new project", "create a workspace", "set up a [framework] project"; need to establish a complete development environment with dependencies, config files, and folder structure. When NOT to use this tool: creating single files or small code snippets; adding individual files to existing projects; making modifications to existing codebases; user asks to "create a file" or "add a component"; simple code examples or demonstrations; debugging </description>
    <file>c:\Users\yashb\AppData\Local\Programs\Microsoft VS Code\7debcd0e2a\resources\app\extensions\copilot\assets\prompts\skills\project-setup-info-local\SKILL.md</file>
    </skill>
    <skill>
    <name>get-search-view-results</name>
    <description>Get the current search results from the Search view in VS Code</description>
    <file>c:\Users\yashb\AppData\Local\Programs\Microsoft VS Code\7debcd0e2a\resources\app\extensions\copilot\assets\prompts\skills\get-search-view-results\SKILL.md</file>
    </skill>
    <skill>
    <name>agent-customization</name>
    <description>**WORKFLOW SKILL** — Create, update, review, fix, or debug VS Code agent customization files (.instructions.md, .prompt.md, .agent.md, SKILL.md, copilot-instructions.md, AGENTS.md). USE FOR: saving coding preferences; troubleshooting why instructions/skills/agents are ignored or not invoked; configuring applyTo patterns; defining tool restrictions; creating custom agent modes or specialized workflows; packaging domain knowledge; fixing YAML frontmatter syntax. DO NOT USE FOR: general coding questions (use default agent); runtime debugging or error diagnosis; MCP server configuration (use MCP docs directly); VS Code extension development. INVOKES: file system tools (read/write customization files), ask-questions tool (interview user for requirements), subagents for codebase exploration. FOR SINGLE OPERATIONS: For quick YAML frontmatter fixes or creating a single file from a known pattern, edit the file directly — no skill needed.</description>
    <file>c:\Users\yashb\AppData\Local\Programs\Microsoft VS Code\7debcd0e2a\resources\app\extensions\copilot\assets\prompts\skills\agent-customization\SKILL.md</file>
    </skill>
    <skill>
    <name>chronicle</name>
    <description>Analyze Copilot session history for standup reports, usage tips, session search, and session reindexing. Use when the user asks for a standup, daily summary, usage tips, workflow recommendations, wants to search or find past sessions by keyword/file/PR, wants to reindex their session store, or asks about deleting session data.</description>
    <file>c:\Users\yashb\AppData\Local\Programs\Microsoft VS Code\7debcd0e2a\resources\app\extensions\copilot\assets\prompts\skills\chronicle\SKILL.md</file>
    </skill>
    <skill>
    <name>python-fact-grounded-coding</name>
    <description>Use when the user explicitly asks for the Python fact-grounded coding skill, or when a Python coding, debugging, explanation, or bug-fix task should be grounded in verified Pylance facts, runtime values, diagnostics, selected interpreter state, tests, or debugger evidence before changing code or reporting a conclusion.</description>
    <file>c:\Users\yashb\.vscode\extensions\ms-python.vscode-pylance-2026.3.1\skills\python-fact-grounded-coding\SKILL.md</file>
    </skill>
    <skill>
    <name>pylance-docs</name>
    <description>Use when the user explicitly asks for the Pylance docs skill, or when an answer depends on current official Pylance documentation for settings, diagnostics, configuration, troubleshooting, feature behavior, or supported workflows.</description>
    <file>c:\Users\yashb\.vscode\extensions\ms-python.vscode-pylance-2026.3.1\skills\pylance-docs\SKILL.md</file>
    </skill>
    <skill>
    <name>pylance-refactoring</name>
    <description>Use when the user explicitly asks for the Pylance refactoring skill, or when they want named automated Python refactorings applied to one file, many files, a workspace, a folder subset, or a composed cleanup workflow such as workspace-wide unused-import cleanup, wildcard-import conversion followed by unused-import cleanup, inferred type annotations, or Pylance fix-all.</description>
    <file>c:\Users\yashb\.vscode\extensions\ms-python.vscode-pylance-2026.3.1\skills\pylance-refactoring\SKILL.md</file>
    </skill>
    <skill>
    <name>pylance-python-profiling</name>
    <description>Use when the user wants to profile Python code with Pylance: capture CPU time (Tachyon), trace calls (sys.monitoring), or memory (Memray); profile a whole run or a specific region between two source locations; add sub-region markers; and explore the resulting profile (hot functions, call trees, time slices). Also use for the 3.15+ interpreter requirement and related error guidance.</description>
    <file>c:\Users\yashb\.vscode\extensions\ms-python.vscode-pylance-2026.3.1\skills\pylance-python-profiling\SKILL.md</file>
    </skill>
    </skills>


    <agents>
    Here is a list of agents that can be used when running a subagent.
    Each agent has optionally a description with the agent's purpose and expertise. When asked to run a subagent, choose the most appropriate agent from this list.
    Use the #tool:agent/runSubagent tool with the agent name to run the subagent.
    </agents>

generationTime: 2026-09-21T20:26:21.424Z
---
classDiagram
    direction TB

    class ModelOption {
        <<interface>>
        +string id
        +string name
        +Provider provider
        +boolean isFree
    }

    class Provider {
        <<enumeration>>
        OpenRouter
        Anthropic
        OpenAI
        Local
        Custom
    }

    class ModelRegistry {
        <<constant>>
        +ModelOption[] models
    }

    class HarnessOption {
        +string id
        +string name
    }

    class HarnessOptions {
        <<constant>>
        +HarnessOption[] options
    }

    ModelOption --> Provider : uses
    ModelRegistry o-- ModelOption : contains
    HarnessOptions o-- HarnessOption : contains