---
description: "Task list for Gameplay Interaction (Scenario 3)"
---

# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/spec.md` and `specs/003-gameplay-interaction/`

**Prerequisites**: Scenarios 1–2 (`specs/001-room-setup-lobby/tasks.md`, `specs/002-game-start-drawer/tasks.md`) complete; `specs/003-gameplay-interaction/plan.md`, `specs/003-gameplay-interaction/spec.md`, `specs/003-gameplay-interaction/research.md`, `specs/003-gameplay-interaction/data-model.md`, `specs/003-gameplay-interaction/contracts/rooms-api.md`, `.specify/memory/constitution.md`

**Tests**: Backend Vitest tasks included where `plan.md` lists `roomStore.test.ts` coverage; no full TDD suite unless added later.

**Organization**: Tasks grouped by user story for independent implementation and validation.

**Changelog (post-analyze remediation)**: Merged full `submitGuess` scoring into US2 (I1/I2); moved `guesses`/`scores` snapshot fields into US2; added stroke/clear API error mapping (C1); removed duplicate `ResultPanel`/GamePage re-bind tasks (D1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories in `spec.md` (US1–US4)

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Feature directory: `specs/003-gameplay-interaction/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm Scenario 2 baseline and review Scenario 3 contract delta

- [x] T001 Verify Scenario 2 game-start baseline (drawer, wordDisplay, game poll) per `specs/003-gameplay-interaction/quickstart.md` prerequisites
- [x] T002 [P] Review `specs/003-gameplay-interaction/contracts/rooms-api.md` delta against current `backend/src/api/rooms.ts` and `backend/src/services/roomStore.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, Zod schemas, helpers, and `startGame` gameplay initialization required by all user stories

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [x] T003 Add `Point`, `StrokeSegment`, `GuessEntry`, `ParticipantScore` types; extend `Room` with `strokes`, `guesses`, `scores`; extend `RoomSnapshot` with `strokes`, `guesses`, `scores` in `backend/src/models/game.ts`
- [x] T004 Add `EMPTY_GUESS`, `DRAWER_CANNOT_GUESS`, `NOT_DRAWER`, and `INVALID_STROKE` to `RoomStoreError` in `backend/src/services/roomStore.ts`
- [x] T005 [P] Add Zod schemas for stroke append, canvas clear, and guess submit bodies in `backend/src/api/schemas.ts`
- [x] T006 [P] Implement `trimGuess`, `isCorrectGuess`, and `computeGuessPoints` (first-correct-only) helpers in `backend/src/services/roomStore.ts`
- [x] T007 Initialize `strokes: []`, `guesses: []`, and `scores` (0 per participant) inside successful `startGame` in `backend/src/services/roomStore.ts`
- [x] T008 [P] Extend `RoomSnapshot` with `strokes`, `guesses`, and `scores` types in `frontend/src/services/api.ts`

**Checkpoint**: Types compile; gameplay fields initialized at round start; helpers unit-testable per `specs/003-gameplay-interaction/data-model.md`

---

## Phase 3: User Story 1 — Drawer Draws and Clears Canvas (Priority: P1) 🎯 MVP

**Goal**: Drawer draws on interactive canvas and clears it; strokes append on stroke complete; guessers see replayed drawing via poll (~2s); guessers cannot modify canvas

**Independent Test**: Two browsers — drawer draws and clears; guest sees cumulative strokes within ~2s; guest canvas is read-only; mid-stroke not visible to guest until release

- [x] T009 [US1] Implement `appendStroke(code, participantId, stroke)` with drawer-only auth, `normalizeStrokePoints` (0–1 coords), and ≥2-point validation in `backend/src/services/roomStore.ts`
- [x] T010 [US1] Implement `clearCanvas(code, participantId)` with drawer-only auth in `backend/src/services/roomStore.ts`
- [x] T011 [US1] Include `strokes` array in `toRoomSnapshot` when `status === "playing"` in `backend/src/services/roomStore.ts`
- [x] T012 [US1] Add `POST /rooms/:code/strokes` route with Zod validation in `backend/src/api/rooms.ts`
- [x] T013 [US1] Add `POST /rooms/:code/canvas/clear` route with Zod validation in `backend/src/api/rooms.ts`
- [x] T014 [US1] Map `NOT_DRAWER` to HTTP 403 and `INVALID_STROKE` to HTTP 400 for stroke/clear routes in `backend/src/api/rooms.ts`
- [x] T015 [P] [US1] Add `appendStroke` and `clearCanvas` API methods in `frontend/src/services/api.ts`
- [x] T016 [US1] Create `DrawingCanvas` with `mode: "draw" | "view"`, normalized 0–1 coordinates, and stroke-complete POST in `frontend/src/components/DrawingCanvas.tsx`
- [x] T017 [US1] Replace canvas placeholder with `DrawingCanvas` and drawer-only Clear control in `frontend/src/pages/GamePage.tsx`
- [x] T018 [US1] Add Vitest cases for stroke append ordering, clear empties list, and non-drawer rejected in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US1 acceptance scenarios 1–6 pass

---

## Phase 4: User Story 2 — Guessers Submit Valid Guesses (Priority: P1)

**Goal**: Guessers submit trimmed guesses; empty rejected with inline error; drawer cannot guess; valid guesses appear in shared history with correct/incorrect indicators; poll snapshot includes `guesses` and `scores`

**Independent Test**: Two browsers — guest submits valid/empty guesses; empty shows inline error; drawer form disabled; history entries with correct/incorrect indicators sync via poll within ~2s

- [x] T019 [US2] Implement full `submitGuess(code, participantId, text)` — trim, empty reject, drawer reject, `isCorrect`/`scoredPoints` via helpers, score update, and history append — in `backend/src/services/roomStore.ts`
- [x] T020 [US2] Add `POST /rooms/:code/guesses` route with Zod validation in `backend/src/api/rooms.ts`
- [x] T021 [US2] Map `EMPTY_GUESS` to HTTP 400 and `DRAWER_CANNOT_GUESS` to HTTP 403 in `backend/src/api/rooms.ts`
- [x] T022 [US2] Include `guesses` (with `isCorrect`, `scoredPoints`) and `scores` in `toRoomSnapshot` when `status === "playing"` in `backend/src/services/roomStore.ts`
- [x] T023 [P] [US2] Add `submitGuess` API method in `frontend/src/services/api.ts`
- [x] T024 [US2] Wire `GuessForm` to `submitGuess` with inline empty-guess error (no modal) in `frontend/src/components/GuessForm.tsx`
- [x] T025 [US2] Disable or hide `GuessForm` when `viewerRole === "drawer"` in `frontend/src/pages/GamePage.tsx`
- [x] T026 [US2] Render ordered guess history with correct/incorrect indicators from snapshot in `frontend/src/components/ResultPanel.tsx`
- [x] T027 [US2] Add Vitest cases for empty guess rejection and drawer cannot guess in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US2 acceptance scenarios 1–6 pass (including poll-synced history after T022)

---

## Phase 5: User Story 3 — Case-Insensitive Scoring (Priority: P1)

**Goal**: Scoreboard reflects server-authoritative scores; Vitest confirms case-insensitive match, first-correct-only (+100), and duplicate correct (+0)

**Independent Test**: Two browsers — case-insensitive correct → 100 on scoreboard; wrong → 0; second correct duplicate → history correct but score stays 100

- [x] T028 [US3] Render per-participant scores from snapshot in `frontend/src/components/Scoreboard.tsx`
- [x] T029 [US3] Add Vitest cases for case-insensitive match, first-correct-only, and duplicate correct +0 in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US3 acceptance scenarios 1–6 pass

---

## Phase 6: User Story 4 — Synced Guess History and Scores via Polling (Priority: P2)

**Goal**: All players stay aligned on strokes, guess history, and scores through ~2s polling without manual refresh; refresh restores full round state

**Independent Test**: Two browsers — guess and draw in quick succession; other tab sees both within ~2s; mid-round refresh restores canvas, history, and scores

- [x] T030 [US4] Add `appendStroke`, `clearCanvas`, and `submitGuess` wrapper methods on frontend `RoomStore` in `frontend/src/state/roomStore.ts`
- [x] T031 [US4] Confirm `useGamePolling` applies full snapshot including `strokes`, `guesses`, `scores` in `frontend/src/hooks/useGamePolling.ts`
- [x] T032 [US4] Replay polled strokes in `DrawingCanvas` without clearing drawer in-progress stroke in `frontend/src/components/DrawingCanvas.tsx`
- [x] T033 [US4] Verify polled `room` state drives all gameplay components and mid-round `fetchRoom` refresh restores strokes, guesses, and scores in `frontend/src/pages/GamePage.tsx`

**Checkpoint**: US4 acceptance scenarios 1–4 pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full test pass, manual validation, and builds

- [x] T034 [P] Run and extend Vitest coverage for all Scenario 3 paths in `backend/src/services/roomStore.test.ts`
- [ ] T035 Run manual validation per `specs/003-gameplay-interaction/quickstart.md` (Tests 1–11)
- [x] T036 Run `npm run build` in `backend/` and `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    └── Phase 2 (Foundational) — BLOCKS all user stories
            ├── Phase 3 (US1) 🎯 MVP — canvas draw/clear
            ├── Phase 4 (US2) — full submitGuess + snapshot guesses/scores + history UI
            ├── Phase 5 (US3) — scoreboard UI + scoring Vitest
            ├── Phase 6 (US4) — poll integration + refresh verify
            └── Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depends on | Independent test scope |
|-------|------------|------------------------|
| US1 (P1) | Foundational | Drawer draw/clear + guesser replay (2 browsers) |
| US2 (P1) | Foundational | Full guess flow + poll-synced history with indicators (2 browsers) |
| US3 (P1) | US2 | Scoreboard + scoring rule Vitest (2 browsers) |
| US4 (P2) | US1–US3 | Poll alignment + refresh restore (2 browsers) |

### Within Each User Story

- Backend service logic before API routes
- API routes and error mapping before frontend API client
- Snapshot fields before UI components that consume them
- Story checkpoint before next priority

---

## Parallel Execution Examples

### Foundational (after T003)

```bash
# Parallel: Zod schemas, scoring helpers, frontend types
T005 backend/src/api/schemas.ts
T006 backend/src/services/roomStore.ts
T008 frontend/src/services/api.ts
```

### User Story 1

```bash
# Parallel: API client + Vitest (after T009–T011)
T015 frontend/src/services/api.ts
T018 backend/src/services/roomStore.test.ts
```

### User Story 2

```bash
# Parallel: API error mapping + frontend API (after T019)
T021 backend/src/api/rooms.ts
T023 frontend/src/services/api.ts
```

### User Story 3

```bash
# Parallel: Scoreboard UI + scoring Vitest (after T022 snapshot fields)
T028 frontend/src/components/Scoreboard.tsx
T029 backend/src/services/roomStore.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 → Phase 2 → Phase 3
2. **STOP and validate**: Drawer draws/clears; guesser sees replayed strokes within ~2s
3. Demo canvas gameplay before guess/score work

### Incremental Delivery

1. US1 → interactive canvas + stroke sync (MVP)
2. US2 → full guess submission, scoring, history, and poll-ready snapshot
3. US3 → scoreboard UI + scoring Vitest confirmation
4. US4 → poll integration polish + session restore verify
5. Polish → Vitest + quickstart + builds

### Suggested Commit Slices

- `feat(gameplay): foundational stroke/guess types and helpers`
- `feat(gameplay): drawer canvas draw and clear (US1)`
- `feat(gameplay): guess submission, scoring, and history (US2)`
- `feat(gameplay): scoreboard and scoring tests (US3)`
- `feat(gameplay): poll sync and refresh verify (US4)`

---

## Notes

- Builds on Scenarios 1–2: do not regress lobby, game start, drawer/word visibility, or eviction
- Strokes use normalized 0–1 coordinates; append on stroke complete only (clarification 2026-06-05)
- `submitGuess` writes `isCorrect` and `scoredPoints` atomically per data model — no interim partial guess entries
- First correct guess per guesser awards +100; later correct duplicates +0 but appear in history
- Empty guess rejection uses inline error near input, not modal
- Guesser API responses must never include raw `secretWord`
- `ResultPanel` is the canonical guess-history UI (not a separate `GuessHistory` component)
- Round end, result screen, and restart are Scenario 4 — out of scope here
"- All artifacts in `specs/003-gameplay-interaction/`"
