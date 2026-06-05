<!--
Sync Impact Report
==================
Version change: (template placeholders) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (5)
  - Technology Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check gates present)
  - .specify/templates/spec-template.md ✅ aligned (Out of Scope references constitution)
  - .specify/templates/tasks-template.md ✅ aligned (prerequisites updated)
  - .specify/templates/checklist-template.md ✅ no changes required
  - AGENTS.md ✅ aligned (runtime guidance matches principles)
Follow-up TODOs: none
-->

# Scribble Constitution

## Core Principles

### I. TypeScript-First Brownfield

All new and modified code MUST be TypeScript using ES modules in `backend/` and
`frontend/`. Enhance the existing starter; do NOT rewrite the application from
scratch. Prefer immutable data, pure functions where practical, and explicit
types—avoid `any`; use `unknown` only when input is genuinely dynamic. Match
existing directory layout (`src/api`, `src/services`, `src/models` on the backend;
`src/pages`, `src/components`, `src/state` on the frontend).

**Rationale**: The lab is a brownfield enhancement. Consistency with the starter
keeps diffs reviewable and prevents scope creep.

### II. REST, Zod, and Layered Backend

HTTP APIs MUST use Express routes in `backend/src/api`, business logic in
`backend/src/services`, and shared types in `backend/src/models`. Every request
payload and response shape MUST be validated with Zod. Errors MUST fail fast
through centralized handlers; the frontend MUST handle API failures without
crashing the UI.

**Rationale**: Typed contracts between client and server make polling-based sync
predictable and testable.

### III. HTTP Polling and In-Memory State (NON-NEGOTIABLE)

Multi-player synchronization MUST use HTTP polling only (lobby refresh target:
~2 seconds). WebSockets, Socket.io, Server-Sent Events, and other real-time push
protocols are forbidden. All room and game state MUST live in memory on the
backend; inactive rooms MUST be removed to limit memory growth. Databases, file
persistence, authentication, sessions, JWT, and OAuth are forbidden.

**Rationale**: Polling and in-memory storage are explicit lab constraints that
keep the problem focused and locally verifiable.

### IV. Spec-Driven Incremental Delivery

Work MUST proceed in phased checkpoints aligned with business scenarios (room
setup → game start → gameplay → result/restart). Each slice MUST follow:
Discovery → Specify → Clarify → Plan → Tasks → Implement → Validate. Spec, plan,
and tasks artifacts MUST stay internally consistent with implementation.
Deviations MUST be documented. Commits MUST be granular and traceable to spec
acceptance criteria.

**Rationale**: The lab evaluates reasoning and traceability, not a single big
drop of code.

### V. Deterministic Game Rules

Game behavior MUST be deterministic and testable: secret words selected from the
starter list (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`); player names
and guesses trimmed with empty/whitespace-only input rejected; guesses compared
case-insensitively; correct guesses score 100, incorrect guesses score 0; all
scores start at 0. Room codes MUST enforce isolation between rooms. Host-only
actions (e.g., start game) MUST be enforced server-side, not UI-only.

**Rationale**: Deterministic rules enable two-browser manual validation and
reproducible grading.

## Technology Constraints

| Layer | Required stack |
|-------|----------------|
| Backend | Node.js 18+, Express, TypeScript, Zod, `tsx`, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | REST polling (`GET /rooms/:code`, etc.) |
| Storage | In-memory services only (`backend/src/services/`) |

**Strictly forbidden** (unless this constitution is formally amended):

- WebSockets or real-time push sync
- Databases or persistent storage
- Authentication, accounts, or sessions
- New state-management or routing libraries beyond the starter
- Deployment, CI, Docker, or hosting work unrelated to local validation
- Multiple rounds, drawer rotation, timers, custom word packs, spectators,
  moderation (kick/mute), room passwords, or unrelated refactors
- Unjustified top-level dependencies

**Memory discipline**: Room services MUST keep active-room footprint minimal and
explicitly evict inactive rooms.

## Development Workflow

### Artifact loop

1. **Discovery** — Read starter files; document gaps, assumptions, and relevant
   paths before coding.
2. **Specify** — Write acceptance criteria and edge cases per user story.
3. **Clarify** — Resolve ambiguity before planning.
4. **Plan** — Update state model, data flow, API contracts, and file-level plan.
5. **Tasks** — Decompose into ordered, independently testable work items.
6. **Implement** — Complete one meaningful slice; commit when criteria pass.
7. **Validate** — Verify with two browser tabs; run `npm run build` in both apps.

### AI-assisted development

AI-generated output MUST be reviewed before commit. Agents MUST NOT introduce
forbidden technologies or out-of-scope features. Prefer minimal diffs that solve
the stated acceptance criteria. Use `AGENTS.md` for runtime coding guidance.

### Quality gates

- Constitution Check in `plan.md` MUST pass before implementation.
- Each scenario checkpoint MUST pass before the next scenario begins.
- Builds (`backend` and `frontend`) MUST succeed before handoff.

## Governance

This constitution supersedes conflicting informal guidance. Amendments require:

1. Documented rationale and semantic version bump (MAJOR: principle removal or
   incompatible redefinition; MINOR: new principle or material expansion; PATCH:
   clarifications and non-semantic edits).
2. Sync updates to dependent templates (`plan-template.md`, `spec-template.md`,
   `tasks-template.md`) and `AGENTS.md` when principles change.
3. Do not edit README.md file every
4. `LAST_AMENDED_DATE` updated to the amendment date.

All feature plans MUST include the Constitution Check gate. Reviewers MUST
verify compliance with forbidden-technology rules, deterministic game rules, and
artifact traceability. Complexity beyond the starter MUST be justified in the
plan.

**Version**: 1.0.0 | **Ratified**: 2026-06-05 | **Last Amended**: 2026-06-05
