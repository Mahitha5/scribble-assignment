---
description: "Task list for Round End, Result & Restart (Scenario 4)"
---

# Tasks: Round End, Result & Restart

**Input**: Design documents from `specs/004-round-end-restart/spec.md` and `specs/004-round-end-restart/`

**Prerequisites**: Scenarios 1–3 complete (`specs/001-room-setup-lobby/tasks.md`, `specs/002-game-start-drawer/tasks.md`, `specs/003-gameplay-interaction/tasks.md`); `specs/004-round-end-restart/plan.md`, `specs/004-round-end-restart/spec.md`, `specs/004-round-end-restart/research.md`, `specs/004-round-end-restart/data-model.md`, `specs/004-round-end-restart/contracts/rooms-api.md`, `.specify/memory/constitution.md`

**Tests**: Backend Vitest tasks included where `plan.md` lists `roomStore.test.ts` coverage; no full TDD suite unless added later.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories in `spec.md` (US1–US4)

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Feature directory: `specs/004-round-end-restart/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm Scenario 3 baseline and review Scenario 4 contract delta

- [x] T001 Verify Scenario 3 gameplay baseline (draw, guess, scoreboard, history) per `specs/004-round-end-restart/quickstart.md` prerequisites
- [x] T002 [P] Review `specs/004-round-end-restart/contracts/rooms-api.md` delta against current `backend/src/api/rooms.ts` and `backend/src/services/roomStore.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, Zod schemas, helpers, and host-transfer extension required by all user stories

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [x] T003 Add `"result"` to `RoomStatus` in `backend/src/models/game.ts`
- [x] T004 Add `NOT_IN_RESULT` to `RoomStoreErrorCode` in `backend/src/services/roomStore.ts`
- [x] T005 [P] Add `endRoundSchema` and `restartGameSchema` in `backend/src/api/schemas.ts`
- [x] T006 [P] Implement `clearRoundState(room)` helper (clear `drawerId`, `secretWord`, `strokes`, `guesses`, `scores`) in `backend/src/services/roomStore.ts`
- [x] T007 [P] Extend `RoomSnapshot.status` union with `"result"` in `frontend/src/services/api.ts`
- [x] T008 Extend `resolveHostTransfer` to run when `status === "result"` (same join-order rules as lobby) in `backend/src/services/roomStore.ts`

**Checkpoint**: Types compile; `result` status recognized; helpers ready per `specs/004-round-end-restart/data-model.md`

---

## Phase 3: User Story 1 — Host Ends Round and All Players See Results (Priority: P1) 🎯 MVP

**Goal**: Host ends active round; room enters `result`; all participants on game page see revealed word, frozen scores, full guess history, and read-only final canvas within ~2s poll

**Independent Test**: Two browsers — host clicks **End Round**; both tabs stay on `/game`, see secret word (not `Guess word`), frozen scores/history/canvas; non-host has no **End Round** button

- [x] T009 [US1] Implement `endRound(code, participantId)` with host auth and `playing` → `result` transition in `backend/src/services/roomStore.ts`
- [x] T010 [US1] Extend `toRoomSnapshot` for `result`: `wordDisplay = secretWord` for all viewers; include frozen `drawerId`, `strokes`, `guesses`, `scores`; omit `viewerRole` and `canStartGame` in `backend/src/services/roomStore.ts`
- [x] T011 [US1] Add `POST /rooms/:code/end` route with Zod validation in `backend/src/api/rooms.ts`
- [x] T012 [US1] Map `NOT_HOST` to HTTP 403 and `NOT_PLAYING` to HTTP 409 for end route in `backend/src/api/rooms.ts`
- [x] T013 [P] [US1] Add `endRound` API method in `frontend/src/services/api.ts`
- [x] T014 [US1] Add `endRound` wrapper on frontend `RoomStore` in `frontend/src/state/roomStore.ts`
- [x] T015 [US1] Add host-only **End Round** button when `status === "playing"` and full result-mode `GamePage` when `status === "result"`: revealed word, read-only `DrawingCanvas` (view mode + final strokes), visible `Scoreboard`/`ResultPanel`, hidden draw/clear/guess controls in `frontend/src/pages/GamePage.tsx`
- [x] T016 [US1] Add Vitest cases for host end, snapshot reveals word plus `drawerId`/frozen round fields to all viewers, and non-host rejected in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US1 acceptance scenarios 1–7 pass

---

## Phase 4: User Story 2 — Result State Freezes Gameplay (Priority: P1)

**Goal**: Server rejects gameplay POSTs in `result`; UI stays frozen on poll; canvas/history/scores unchanged

**Independent Test**: End round; drawer and guesser cannot draw/clear/guess; API POSTs return 409; poll shows unchanged state

- [x] T017 [US2] Confirm result-mode controls remain non-interactive after poll updates (no draw/clear/guess re-enabled) in `frontend/src/pages/GamePage.tsx`
- [x] T018 [US2] Add defensive UI guard so `GuessForm` and drawer actions cannot be invoked when `status === "result"` even if props drift in `frontend/src/pages/GamePage.tsx`
- [x] T019 [US2] Add Vitest cases confirming `appendStroke`, `clearCanvas`, and `submitGuess` reject when `status === "result"` in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US2 acceptance scenarios 1–3 pass

---

## Phase 5: User Story 3 — Host Restarts to Lobby with Clean Slate (Priority: P1)

**Goal**: Host restarts from `result` → `lobby`; round fields cleared; participants preserved; host and non-hosts reach lobby; fresh start works

**Independent Test**: Two browsers — host clicks **Restart**; both on `/lobby` within ~2s; roster preserved; no word/strokes/history/scores; host can **Start Game** again

- [x] T020 [US3] Implement `restartGame(code, participantId)` with host auth, `clearRoundState`, and `result` → `lobby` in `backend/src/services/roomStore.ts`
- [x] T021 [US3] Ensure `toRoomSnapshot` omits round fields (`drawerId`, `wordDisplay`, `strokes`, `guesses`, `scores`) when `status === "lobby"` in `backend/src/services/roomStore.ts`
- [x] T022 [US3] Add `POST /rooms/:code/restart` route with Zod validation in `backend/src/api/rooms.ts`
- [x] T023 [US3] Map `NOT_HOST` to HTTP 403 and `NOT_IN_RESULT` to HTTP 409 for restart route in `backend/src/api/rooms.ts`
- [x] T024 [P] [US3] Add `restartGame` API method in `frontend/src/services/api.ts`
- [x] T025 [US3] Add `restartGame` wrapper on frontend `RoomStore` in `frontend/src/state/roomStore.ts`
- [x] T026 [US3] Add host-only **Restart** button when `status === "result"` and navigate host to `/lobby` on success in `frontend/src/pages/GamePage.tsx`
- [x] T027 [US3] Add Vitest cases for restart reset, preserved participants, and non-host rejected in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US3 acceptance scenarios 1–6 pass

---

## Phase 6: User Story 4 — Synced Result and Restart via Polling (Priority: P2)

**Goal**: Poll-driven navigation and lobby hint; Exit Game during result stays on lobby; refresh restores result or lobby state

**Independent Test**: Two browsers — result sync without manual refresh; restart auto-navigates game-page guests to lobby; Exit Game shows lobby hint without redirect to game; hint removed after restart

- [x] T028 [US4] Navigate to `/lobby` when polled `status === "lobby"` in `frontend/src/hooks/useGamePolling.ts`
- [x] T029 [US4] Redirect to `/game` only when `status === "playing"` (not `result`) in `frontend/src/hooks/useLobbyPolling.ts`
- [x] T030 [US4] Show `Round ended — waiting for host to restart` hint when `status === "result"`, hide **Start Game** when `canStartGame` is false, and remove hint after restart in `frontend/src/pages/LobbyPage.tsx`
- [x] T031 [US4] Verify mid-result `fetchRoom` refresh restores result view (quickstart Test 6) and post-restart refresh lands on lobby with cleared state (quickstart Test 7) in `frontend/src/pages/GamePage.tsx` and `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: US4 acceptance scenarios 1–6 pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full test pass, manual validation, and builds

- [x] T032 [P] Run and extend Vitest coverage for all Scenario 4 paths, including host transfer while `status === "result"` (stale host → new host can restart), in `backend/src/services/roomStore.test.ts`
- [x] T033 Run manual validation per `specs/004-round-end-restart/quickstart.md` (Tests 1–8)
- [x] T034 Run `npm run build` in `backend/` and `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    └── Phase 2 (Foundational) — BLOCKS all user stories
            ├── Phase 3 (US1) 🎯 MVP — end round + result snapshot + game page reveal
            ├── Phase 4 (US2) — server mutation guards + UI hardening
            ├── Phase 5 (US3) — restart + lobby reset
            ├── Phase 6 (US4) — polling navigation + lobby hint
            └── Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depends on | Independent test scope |
|-------|------------|------------------------|
| US1 (P1) | Foundational | Host end round; all see revealed word, scores, history, read-only canvas (2 browsers) |
| US2 (P1) | US1 | Gameplay frozen in result; API rejects mutations (2 browsers) |
| US3 (P1) | US1 | Host restart; lobby reset with players preserved (2 browsers) |
| US4 (P2) | US1–US3 | Poll sync, Exit Game lobby hint, refresh restore (2 browsers) |

### Within Each User Story

- Backend service logic before API routes
- API routes and error mapping before frontend API client
- Snapshot fields before UI components that consume them
- Story checkpoint before next priority

---

## Parallel Execution Examples

### Foundational (after T003–T004)

```bash
# Parallel: Zod schemas, clearRoundState helper, frontend status union
T005 backend/src/api/schemas.ts
T006 backend/src/services/roomStore.ts
T007 frontend/src/services/api.ts
```

### User Story 1

```bash
# Parallel: frontend API + Vitest (after T009–T010)
T013 frontend/src/services/api.ts
T016 backend/src/services/roomStore.test.ts
```

### User Story 3

```bash
# Parallel: frontend API (after T020)
T024 frontend/src/services/api.ts
```

### User Story 4

```bash
# Parallel: polling hooks (after US3 restart flow exists)
T028 frontend/src/hooks/useGamePolling.ts
T029 frontend/src/hooks/useLobbyPolling.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 → Phase 2 → Phase 3
2. **STOP and validate**: Host ends round; all players see revealed word, scores, history, and read-only canvas on game page within ~2s
3. Demo result state before freeze/restart/polling polish

### Incremental Delivery

1. US1 → end round + result snapshot + game page reveal (MVP)
2. US2 → freeze gameplay controls + server mutation guards
3. US3 → restart to lobby with clean slate
4. US4 → polling navigation, lobby hint, refresh verify
5. Polish → Vitest + quickstart + builds

### Suggested Commit Slices

- `feat(result): foundational result status and helpers`
- `feat(result): host end round and result snapshot (US1)`
- `feat(result): freeze gameplay in result state (US2)`
- `feat(result): host restart to lobby (US3)`
- `feat(result): poll sync and lobby hint (US4)`

---

## Notes

- Builds on Scenarios 1–3: do not regress lobby, game start, drawer/word visibility during `playing`, or eviction
- `result` is server-authoritative; game page adapts in place (no `/result` route per clarification 2026-06-06)
- `wordDisplay` reveals `secretWord` to **all** viewers only when `status === "result"`
- Lobby polling must **not** redirect to game when `status === "result"` (Exit Game flow)
- Game polling must redirect to lobby when `status === "lobby"` after restart
- Host controls: **End Round** during `playing`, **Restart** during `result` — game page button row only
- `assertPlaying` already blocks strokes/guesses/clear in `result`; US2 adds UI disable + Vitest confirmation
- `joinRoom` and `startGame` existing non-lobby guards cover `result` without change
"- All artifacts in `specs/004-round-end-restart/`"
