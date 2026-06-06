# Implementation Plan: [FEATURE]

**Input**: Feature specification from `specs/[###-feature-name]/spec.md`

**Feature directory**: `specs/[###-feature-name]/` (feature name MUST match the spec folder name)

**Note**: This template is filled in by the `/speckit-plan` command. All feature artifacts (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`) live under `specs/[###-feature-name]/`.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]


## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

- [ ] **TypeScript-First**: Changes stay in typed TS/ESM in `backend/` and `frontend/`
- [ ] **REST + Zod**: New endpoints use Express routes with Zod-validated payloads
- [ ] **React + Vite patterns**: No new state-management or routing libraries; follow `roomStore.ts`
- [ ] **HTTP polling only**: Multi-player sync uses polling (~2s), not WebSockets/SSE
- [ ] **In-memory only**: No database, auth, or persistent storage introduced
- [ ] **Brownfield scope**: Builds on starter files; no full rewrite or unjustified deps

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | HTTP polling via REST (`GET /rooms/:code`, etc.) |
| Storage | In-memory services in `backend/src/services/` |

## Architecture

  ### Data Flow
   [Simple words to explain the data flow for the tasks in the features]

  ### API Contracts
   [API request/response shapes needed for this feature]

  ### File Structure
   [Highlevel file structure for the files needed for this feature]

## Dependencies
  [External dependendies that are needed]
