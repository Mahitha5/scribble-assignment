<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: N/A (initial ratification from template placeholders)
- Added sections:
  - Core Principles (5 tech-stack principles)
  - Technology Stack Constraints
  - Development Workflow
  - Governance
- Removed sections: Template placeholder comments
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ updated
  - .specify/templates/spec-template.md ✅ updated
  - .specify/templates/tasks-template.md ✅ updated
  - README.md ✅ no changes required (already aligned)
  - AGENTS.md ✅ no changes required (already aligned)
- Follow-up TODOs: none
-->

# Scribble Constitution

## Core Principles

### I. TypeScript-First Monorepo

All application code in `backend/` and `frontend/` MUST be written in TypeScript using
ES Modules (`"type": "module"`). Avoid `any`; use `unknown` when a value is truly
dynamic. Prefer immutable data structures and pure functions where practical.

**Rationale**: A single typed language across both apps reduces integration drift and
keeps AI-generated changes reviewable against shared contracts.

### II. Minimal REST Backend with Zod Validation

The backend MUST remain a Node.js + Express service executed via `tsx` in development
and compiled with `tsc` for production builds. Request and response payloads MUST be
validated with Zod. Business logic lives in `src/services/`, routes in `src/api/`, and
entity types in `src/models/`. Errors MUST fail fast through centralized handlers.

**Rationale**: Zod-backed REST endpoints give deterministic contracts that the React
client and Spec Kit artifacts can trace without ambiguity.

### III. React + Vite Frontend with Established Patterns

The frontend MUST use React 18, React Router v6, and Vite. Components MUST be
functional and use hooks. Complex client state MUST follow the established store pattern
in `frontend/src/state/roomStore.ts` (Context + external store). Styling MUST stay in
`app.css` or CSS modules. Do NOT introduce new state-management or routing libraries.

**Rationale**: The starter already encodes workable patterns; new libraries add scope
and review cost without lab benefit.

### IV. HTTP Polling Sync (NON-NEGOTIABLE)

All multi-player synchronization MUST use HTTP polling. WebSockets, Socket.io, Server-
Sent Events, and other push/real-time protocols are forbidden. Lobby and gameplay state
MUST refresh by polling room snapshots on a ~2 second cadence.

**Rationale**: The lab explicitly constrains sync to polling so learners focus on state
modeling and REST design rather than transport complexity.

### V. In-Memory State Only

All room and game data MUST live in backend memory. No databases, ORMs, file persistence,
or external caches. Restarting the backend clears all rooms. Keep the memory footprint
minimal and remove inactive rooms explicitly when applicable.

**Rationale**: In-memory storage keeps deployment and testing local, predictable, and
aligned with the brownfield scaffold.

## Technology Stack Constraints

The following stack is fixed for this project. Deviations require a documented
constitution amendment.

| Layer | Required technologies |
|-------|----------------------|
| Runtime | Node.js 18+, npm 9+ |
| Backend | Express 4, TypeScript 5, Zod, cors, tsx (dev), Vitest (tests) |
| Frontend | React 18, React DOM, React Router 6, Vite 5, TypeScript 5, Vitest (tests) |
| Sync | HTTP polling only (`GET /rooms/:code` and related REST endpoints) |
| Storage | In-memory maps/services in `backend/src/services/` |
| API base URL | Frontend reads `VITE_API_URL`; defaults to backend on port 3001 |

**Strictly forbidden** (also out of lab scope):

- WebSockets or real-time push protocols
- Databases or persistent storage
- Authentication, sessions, JWT, or OAuth
- Unjustified top-level dependencies
- Rewriting the starter from scratch

**Commands**:

- Backend dev: `cd backend && npm run dev` (port 3001)
- Frontend dev: `cd frontend && npm run dev` (port 5173)
- Build validation: `npm run build` in both `backend/` and `frontend/`

## Development Workflow

Work MUST follow the brownfield Spec Kit loop defined in `README.md`:

1. **Discovery** — Read existing files before writing code; document gaps and assumptions.
2. **Specify** — Write acceptance criteria and edge cases per feature group.
3. **Clarify** — Resolve ambiguity before planning.
4. **Plan** — Tie changes to concrete files, endpoints, and state transitions.
5. **Tasks** — Decompose into ordered, independently testable slices.
6. **Implement** — One meaningful slice at a time with granular commits.
7. **Validate** — Verify with two browser tabs; run both builds before handoff.

AI-assisted changes MUST be reviewed against this constitution, the active spec, and
`AGENTS.md` before commit. Implementation MUST match spec behavior; deviations MUST be
documented in artifacts.

Manual multi-tab browser testing is the primary integration test for gameplay flows.
Vitest MAY be used for unit-level backend or frontend logic when it adds meaningful
coverage; TDD is encouraged but not mandatory unless requested for a task.

## Governance

This constitution supersedes ad-hoc guidance when they conflict. Amendments MUST:

1. Update `.specify/memory/constitution.md` with a Sync Impact Report comment.
2. Propagate constraint changes to `.specify/templates/plan-template.md`,
   `.specify/templates/spec-template.md`, and `.specify/templates/tasks-template.md`.
3. Bump `CONSTITUTION_VERSION` using semantic versioning:
   - **MAJOR**: Removing or redefining a non-negotiable principle or forbidden technology.
   - **MINOR**: Adding a principle, section, or materially expanded guidance.
   - **PATCH**: Clarifications and non-semantic wording fixes.
4. Set `LAST_AMENDED_DATE` to the amendment date (ISO `YYYY-MM-DD`).

All pull requests and Spec Kit artifacts MUST verify compliance with Core Principles and
Technology Stack Constraints. Complexity beyond the starter (new libraries, alternate
architectures) MUST be justified in the plan or rejected.

Use `README.md` for lab scope and business scenarios, and `AGENTS.md` for day-to-day
agent coding guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
