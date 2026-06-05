---
description: "Task list for Game Start & Drawer Flow (Scenario 2)"
---

# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer/spec.md` and `plans/002-game-start-drawer/`

**Prerequisites**: Scenario 1 (`tasks/001-room-setup-lobby/tasks.md`) complete; `plans/002-game-start-drawer/plan.md`, `specs/002-game-start-drawer/spec.md`, `plans/002-game-start-drawer/research.md`, `plans/002-game-start-drawer/data-model.md`, `plans/002-game-start-drawer/contracts/rooms-api.md`, `.specify/memory/constitution.md`

**Tests**: Backend Vitest tasks included where `plan.md` lists `roomStore.test.ts` coverage; no full TDD suite unless added later.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories in `spec.md` (US1–US4)

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Plan artifacts: `plans/002-game-start-drawer/`
- Tasks file: `tasks/002-game-start-drawer/tasks.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm Scenario 1 baseline and review Scenario 2 contract delta

- [x] T001 Verify Scenario 1 lobby/start baseline (create, join, poll, start navigates to `/game`) per `plans/002-game-start-drawer/quickstart.md` prerequisites
- [x] T002 [P] Review `plans/002-game-start-drawer/contracts/rooms-api.md` delta against current `backend/src/api/rooms.ts` and `backend/src/services/roomStore.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, pure helpers, and error codes required by all user stories

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [x] T003 Add `drawerId` and `secretWord` to `Room`; add `drawerId`, `viewerRole`, and `wordDisplay` to `RoomSnapshot` in `backend/src/models/game.ts`
- [x] T004 Add `INVALID_PLAYER_NAMES` and `DUPLICATE_PLAYER_NAMES` to `RoomStoreError` in `backend/src/services/roomStore.ts`
- [x] T005 [P] Implement `selectSecretWord(roomCode)` using `(sum of uppercase char codes) mod 5` in `backend/src/services/roomStore.ts`
- [x] T006 [P] Implement `trimDisplayName` and `validateNamesForStart` (returns offender lobby names) in `backend/src/services/roomStore.ts`
- [x] T007 [P] Extend `RoomSnapshot` with `drawerId`, `viewerRole`, and `wordDisplay` in `frontend/src/services/api.ts`

**Checkpoint**: Types compile; helpers unit-testable; contract fields defined in `plans/002-game-start-drawer/data-model.md`

---

## Phase 3: User Story 1 — Validate Names Before First Round (Priority: P1) 🎯 MVP

**Goal**: Trim and validate names at start; reject empty/whitespace-only and trim-colliding duplicates with named host errors; persist trimmed names on success

**Independent Test**: Two browsers — host starts with valid names succeeds; whitespace-only or trim-duplicate names block start with named error; room stays in lobby

- [x] T008 [US1] Call `validateNamesForStart` inside `startGame` before any round fields are set in `backend/src/services/roomStore.ts`
- [x] T009 [US1] Persist trimmed participant `name` values on successful start in `backend/src/services/roomStore.ts`
- [x] T010 [US1] Map `INVALID_PLAYER_NAMES` and `DUPLICATE_PLAYER_NAMES` to HTTP 400 with named messages in `backend/src/api/rooms.ts`
- [x] T011 [US1] Surface named start-validation errors via `startError` in `frontend/src/pages/LobbyPage.tsx`
- [x] T012 [US1] Add Vitest cases for empty-name rejection and duplicate-trim collision in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US1 acceptance scenarios 1–5 pass; failed start leaves `status: "lobby"` with no `drawerId`/`secretWord`

---

## Phase 4: User Story 2 — Assign Drawer at Round Start (Priority: P1)

**Goal**: Current host becomes drawer; all players see who is drawing on the game screen

**Independent Test**: Two browsers — after start, host tab shows drawer role; guest tab shows host as drawer, guest as guesser; after host transfer, new host is drawer on start

- [x] T013 [US2] Set `drawerId` to the host participant's `id` on successful start in `backend/src/services/roomStore.ts`
- [x] T014 [US2] Populate `drawerId` and `viewerRole` in `toRoomSnapshot` when `status === "playing"` in `backend/src/services/roomStore.ts`
- [x] T015 [US2] Display drawer participant name and drawer badge visible to all players in `frontend/src/pages/GamePage.tsx`
- [x] T016 [US2] Show viewer role (drawer vs guesser) in Player Info panel in `frontend/src/pages/GamePage.tsx`
- [x] T017 [US2] Add Vitest case: successor host after transfer becomes `drawerId` on start in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US2 acceptance scenarios 1–4 pass

---

## Phase 5: User Story 3 — Deterministic Secret Word, Drawer-Only Visibility (Priority: P1)

**Goal**: Deterministic word from starter list; drawer sees real word; guessers see `Guess word` only (API and UI)

**Independent Test**: Two browsers — drawer sees computed word for room code; guesser sees `Guess word` in word area and in poll responses; refresh preserves visibility

- [x] T018 [US3] Assign `secretWord` via `selectSecretWord(room.code)` on successful start in `backend/src/services/roomStore.ts`
- [x] T019 [US3] Compute role-filtered `wordDisplay` in `toRoomSnapshot` (never expose raw `secretWord` to guessers) in `backend/src/services/roomStore.ts`
- [x] T020 [US3] Add Word card rendering `wordDisplay` in `frontend/src/pages/GamePage.tsx`
- [x] T021 [US3] Add Vitest cases for deterministic word index and guesser `wordDisplay === "Guess word"` in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US3 acceptance scenarios 1–5 pass; same room code always yields same word

---

## Phase 6: User Story 4 — All Players Enter Game Screen (Priority: P2)

**Goal**: All participants reach game screen with first-round context; game screen polls ~2s for sync and session restore

**Independent Test**: Two browsers — host and guest on `/game` within ~2s of start; game poll updates snapshot; direct `/game` refresh with session loads playing state

- [x] T022 [US4] Create `useGamePolling` hook with 2000ms `setInterval` in `frontend/src/hooks/useGamePolling.ts`
- [x] T023 [US4] Integrate `useGamePolling` in `frontend/src/pages/GamePage.tsx` with 404 session clear and redirect to `/`
- [x] T024 [US4] Fetch initial playing snapshot on `GamePage` mount when session exists in `frontend/src/pages/GamePage.tsx`
- [x] T025 [US4] Show first-round context (Round 1 label, scores-at-zero via `Scoreboard`, trimmed participant names) in `frontend/src/pages/GamePage.tsx`
- [x] T026 [US4] Confirm non-host lobby auto-navigate on `status === "playing"` remains correct in `frontend/src/hooks/useLobbyPolling.ts`

**Checkpoint**: US4 acceptance scenarios 1–3 pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full test pass, manual validation, and builds

- [x] T027 [P] Run and extend Vitest coverage for all Scenario 2 paths in `backend/src/services/roomStore.test.ts`
- [x] T028 Run manual validation per `plans/002-game-start-drawer/quickstart.md` (Tests 1–8)
- [x] T029 Run `npm run build` in `backend/` and `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    └── Phase 2 (Foundational) — BLOCKS all user stories
            ├── Phase 3 (US1) 🎯 MVP
            ├── Phase 4 (US2) — backend startGame fields; needs US1 validation passing
            ├── Phase 5 (US3) — wordDisplay; needs US2 drawerId in snapshot
            ├── Phase 6 (US4) — game polling UI; needs US3 wordDisplay on GamePage
            └── Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depends on | Independent test scope |
|-------|------------|------------------------|
| US1 (P1) | Foundational | Start blocked/allowed by name rules (2 browsers) |
| US2 (P1) | Foundational, US1 happy-path start | Drawer identification on game screen (2 browsers) |
| US3 (P1) | US1, US2 | Word visibility per role + determinism (2 browsers) |
| US4 (P2) | US1–US3 | Game poll + navigation + session restore (2 browsers) |

### Within Each User Story

- Backend helpers/service logic before API routes
- API routes before frontend consumption
- Snapshot fields before page UI
- Story checkpoint before next priority

---

## Parallel Execution Examples

### Foundational (after T003)

```bash
# Parallel: word selection, name validation helpers, frontend types
T005 backend/src/services/roomStore.ts
T006 backend/src/services/roomStore.ts
T007 frontend/src/services/api.ts
```

### User Story 1

```bash
# Parallel: API mapping + tests (after T008–T009)
T010 backend/src/api/rooms.ts
T012 backend/src/services/roomStore.test.ts
```

### User Story 3 + US4 frontend

```bash
# Parallel: word UI + polling hook (after T019)
T020 frontend/src/pages/GamePage.tsx
T022 frontend/src/hooks/useGamePolling.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 → Phase 2 → Phase 3
2. **STOP and validate**: Valid names start; invalid/duplicate names block with named errors
3. Demo name-gate before drawer/word UI

### Incremental Delivery

1. US1 → name validation at start (MVP gate)
2. US2 → drawer assignment and identification
3. US3 → secret word + role-filtered visibility
4. US4 → game polling and first-round context polish
5. Polish → Vitest + quickstart + builds

### Suggested Commit Slices

- `feat(game): foundational round types and name helpers`
- `feat(game): start name validation (US1)`
- `feat(game): drawer assignment and snapshot (US2)`
- `feat(game): deterministic word and wordDisplay (US3)`
- `feat(game): game polling and GamePage (US4)`

---

## Notes

- Builds on Scenario 1: do not regress lobby join, poll, host-only start, or eviction behavior
- Join-time duplicate check uses raw names (001); start-time uses trimmed names (002 backstop)
- No host kick/remove for invalid names; block start only (clarification session 2026-06-05)
- Guesser API responses must never include raw `secretWord` — only `wordDisplay`
- Plan artifacts in `plans/002-game-start-drawer/`; spec in `specs/002-game-start-drawer/`; tasks in `tasks/002-game-start-drawer/`
