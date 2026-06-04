---
description: "Task list for Game Start & Drawer Flow feature"
---

# Tasks: Game Start & Drawer Flow

**Input**: `specs/002-game-start-drawer/spec.md`, `plans/002-game-start-drawer/` (`plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Tasks directory**: `tasks/002-game-start-drawer/` (matches `specs/002-game-start-drawer/` and `plans/002-game-start-drawer/`)

**Prerequisites**: Room management (`001`) — create/join/lobby poll, host-only `POST /rooms/:code/start`, `status: "active"` transition. **Brownfield gap**: start currently only flips `status`; no drawer, secret word, per-viewer snapshot, or game UI for roles/word.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories in `specs/002-game-start-drawer/spec.md` (US1–US5)

## Path Conventions

- **Backend**: `backend/src/`
- **Frontend**: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align feature pointer and baseline before game-start work

- [X] T001 Review `specs/002-game-start-drawer/spec.md` clarifications (room-code-only word, poll auto-navigate, server-side word omission, as-is names from 001)
- [X] T002 [P] Set `.specify/feature.json` `feature_directory` to `specs/002-game-start-drawer` for implement workflow
- [X] T003 [P] Run `/speckit-plan` on `specs/002-game-start-drawer/spec.md` to replace template `plans/002-game-start-drawer/plan.md` and generate `research.md`, `data-model.md`, `contracts/`, `quickstart.md` (blocks contract-traceability polish only)
- [X] T004 [P] Verify `cd backend && npm run dev` and `cd frontend && npm run dev`; confirm existing `POST /rooms/:code/start` and lobby poll in `frontend/src/pages/LobbyPage.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Active-round state, deterministic word, and per-viewer snapshots required by all user stories

**⚠️ CRITICAL**: No user story work until this phase is complete

- [X] T005 [P] Add `drawerId` and `secretWord` fields to `Room` in `backend/src/models/game.ts` (set only when `status === "active"`)
- [X] T006 [P] Add per-participant `role: ParticipantRole` on `ParticipantSnapshot` and optional `secretWord?: string` on `RoomSnapshot` in `backend/src/models/game.ts`
- [X] T007 [P] Mirror `drawerId`, participant `role`, and optional `secretWord` on `RoomSnapshot` in `frontend/src/services/api.ts`
- [X] T008 Implement `pickSecretWordForRoomCode(code: string): string` in `backend/src/services/roomStore.ts` using `STARTER_WORDS` from `backend/src/seed/starterData.ts` — index derived from **room code only** (ignore participants/join order) per FR-009
- [X] T009 Extend `startGame()` in `backend/src/services/roomStore.ts` to atomically set `status: "active"`, `drawerId = room.hostId`, `secretWord = pickSecretWordForRoomCode(code)`, and leave all `participant.name` values unchanged (FR-013)
- [X] T010 Extend `toRoomSnapshot(room, viewerParticipantId?)` in `backend/src/services/roomStore.ts` to emit each participant’s `role` (`drawer` | `guesser`) when active, set `drawerId`, and include `secretWord` **only** when `viewerParticipantId === drawerId` (omit field entirely for guessers — FR-011)
- [X] T011 Ensure every `toRoomSnapshot` call in `backend/src/api/rooms.ts` passes `participantId` / `viewerParticipantId` from request body or query (create, join, start, GET poll)
- [X] T012 [P] Add Vitest coverage for `pickSecretWordForRoomCode` in `backend/src/services/roomStore.test.ts` (same code → same word; word ∈ starter list)
- [X] T039 Extend `backend/src/services/roomStore.test.ts`: second `startGame` while `status === "active"` returns `already_started` and does not change `drawerId`, `secretWord`, or participant names

**Checkpoint**: `POST /rooms/:code/start` + `GET /rooms/:code?participantId=` return active snapshots with roles; guesser JSON has no `secretWord` key

---

## Phase 3: User Story 1 - Player Names Preserved at Game Start (Priority: P1) 🎯 MVP

**Goal**: Lobby display names remain exactly as stored when the round becomes active (no trim, no server defaults)

**Independent Test**: Create/join with `""` and `"  Ali  "`; host starts; poll game snapshot — names unchanged

### Implementation for User Story 1

- [X] T013 [US1] Add assertion in `startGame()` path in `backend/src/services/roomStore.ts` that participant `name` strings are not modified during transition (document via test, not a rename helper)
- [X] T014 [US1] Add tests in `backend/src/services/roomStore.test.ts`: empty and whitespace-only names preserved after `startGame`; duplicate names still allowed
- [X] T015 [P] [US1] Display participant names from snapshot only (no client-side trim) in `frontend/src/pages/GamePage.tsx` player list

**Checkpoint**: FR-001/FR-002 satisfied; start never rejected for name content

---

## Phase 4: User Story 2 - First-Round Drawer Assignment (Priority: P1)

**Goal**: Exactly one drawer (current host at start); all others guessers; UI makes drawer obvious

**Independent Test**: Two-player game; after start, host participant has `role: "drawer"`; guest has `role: "guesser"`; game UI labels drawer

### Implementation for User Story 2

- [X] T016 [US2] Add tests in `backend/src/services/roomStore.test.ts`: after start, `drawerId === hostId`; exactly one `drawer` role; host-transfer case — new host before start becomes drawer
- [X] T017 [P] [US2] Add `useViewerRole()` (or equivalent) derived from snapshot + `participantId` in `frontend/src/state/roomStore.ts`
- [X] T018 [US2] Show drawer identity (name + “Drawer” label) and guesser state in `frontend/src/pages/GamePage.tsx` using `role` / `drawerId` (not display-name uniqueness — FR-017)
- [X] T019 [P] [US2] Hide drawer-only secret-word UI controls for guessers in `frontend/src/pages/GamePage.tsx`

**Checkpoint**: FR-005, FR-006, FR-007 visible in API + UI

---

## Phase 5: User Story 3 - Deterministic Secret Word Selection (Priority: P1)

**Goal**: First-round word from fixed starter list; same room code always yields same word

**Independent Test**: Start twice with same code (fresh sessions) → identical word; two codes → may differ

### Implementation for User Story 3

- [X] T020 [US3] Document word-index algorithm in `backend/src/services/roomStore.ts` comment (room code chars → stable index mod 5)
- [X] T021 [US3] Extend `backend/src/services/roomStore.test.ts`: same `code` → same `secretWord`; word ∈ `STARTER_WORDS`; different codes can produce different words
- [X] T022 [P] [US3] Remove or gate lobby-only `availableWords` on active snapshots in `toRoomSnapshot()` if it leaks vocabulary to guessers before drawer sees word (prefer drawer-only `secretWord` per FR-010)

**Checkpoint**: FR-008, FR-009 covered by automated tests

---

## Phase 6: User Story 4 - Drawer-Only Secret Word Visibility (Priority: P1)

**Goal**: Guessers never receive `secretWord` in any poll response; drawer sees word on game screen

**Independent Test**: Dual-session poll after start — drawer responses include `secretWord`; guesser responses omit the field for ≥10 poll cycles (T038)

### Implementation for User Story 4

- [X] T023 [US4] Add tests in `backend/src/services/roomStore.test.ts`: `toRoomSnapshot` for guesser has no `secretWord` property; drawer snapshot includes correct word
- [X] T038 [US4] Add test in `backend/src/services/roomStore.test.ts`: call `toRoomSnapshot` (or `getRoom` + snapshot) as guesser **10 times** in a loop and assert `secretWord` is absent on every iteration (success criterion: word privacy)
- [X] T024 [US4] Add route-level test or schema assertion in `backend/src/api/schemas.test.ts` that serialized guesser room JSON excludes `secretWord` (optional `secretWord` only when present)
- [X] T025 [P] [US4] Render secret word panel for drawer only in `frontend/src/pages/GamePage.tsx` when `room.secretWord` is defined
- [X] T026 [P] [US4] Show non-revealing placeholder for guessers in `frontend/src/pages/GamePage.tsx` (do not infer word from `availableWords` or other fields)

**Checkpoint**: FR-010, FR-011 — server omission, not CSS hiding alone

---

## Phase 7: User Story 5 - Transition from Lobby to Active Game (Priority: P2)

**Goal**: All clients reach `/game` via polling when phase becomes active (~2–3s); game view keeps roles in sync

**Independent Test**: Two tabs in lobby; host starts; guest auto-navigates without clicking start; game polls show consistent drawer

### Implementation for User Story 5

- [X] T027 [US5] Verify lobby poll auto-navigate in `frontend/src/pages/LobbyPage.tsx` when `status === "active"` (FR-004); fix gaps if host navigates before guest poll
- [X] T028 [US5] Redirect `/lobby` → `/game` when stored session already has `status === "active"` on mount in `frontend/src/pages/LobbyPage.tsx`
- [X] T029 [US5] Add ~2s polling loop on `frontend/src/pages/GamePage.tsx` calling `roomStore.fetchRoom()` with backoff on error (FR-012)
- [X] T030 [US5] On poll in `GamePage.tsx`, keep drawer/guesser labels and secret-word visibility in sync with latest snapshot
- [X] T031 [P] [US5] After host `startGame()` in `frontend/src/state/roomStore.ts`, apply start response snapshot before navigate so host does not flash partial state
- [X] T037 [US5] Add global active-phase redirect in `frontend/src/state/roomStore.ts` (`RoomStoreProvider`): after any successful `fetchRoom`, if `room.status === "active"` and current route is not `/game`, `navigate("/game", { replace: true })` (FR-004 off-lobby edge case)

**Checkpoint**: FR-004, FR-012 — cohesion within 3s without manual reload

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docs, validation, alignment with plan artifacts

- [X] T032 [P] Update `README.md` Scenario 2 section to match implemented drawer/word/poll behavior
- [X] T033 [P] After T003 plan completes, reconcile task IDs with `plans/002-game-start-drawer/contracts/api-endpoints.md` if contract paths differ
- [X] T034 Run `cd backend && npm test` — all tests green
- [X] T035 Run `cd frontend && npm run build` — TypeScript + Vite build pass
- [X] T036 Manual validation per `plans/002-game-start-drawer/quickstart.md` (or spec acceptance scenarios): dual-tab drawer/guesser word privacy, deterministic word, name preservation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately; T003 recommended before Polish contract sync (T033)
- **Foundational (Phase 2)**: Blocks all user stories — **must complete T005–T012 first**
- **User Stories (Phases 3–7)**: Depend on Phase 2; P1 stories (US1–US4) can proceed in parallel after foundation; US5 depends on active snapshots (Phase 2) and benefits from US2/US4 UI
- **Polish (Phase 8)**: After desired user stories complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 | Phase 2 | Mostly verification; names already as-is from 001 |
| US2 | Phase 2 | Needs `drawerId` + `role` in snapshot |
| US3 | Phase 2 | Needs `pickSecretWordForRoomCode` |
| US4 | Phase 2 | Needs per-viewer `toRoomSnapshot` |
| US5 | Phase 2 + US2/US4 UI | Lobby poll exists; game poll + redirects; T037 global active redirect |

### Within Each User Story

- Backend tests before or with UI tasks
- Do not edit `toRoomSnapshot` and `GamePage.tsx` in conflicting parallel branches without sequencing

### Parallel Opportunities

- Phase 1: T002, T003, T004 in parallel
- Phase 2: T005, T006, T007 in parallel; then T008–T011 sequential on `roomStore.ts`
- US1: T014 + T015 parallel after T013
- US2: T017 + T018 parallel after T016
- US4: T025 + T026 parallel after T023–T024; T038 after T023
- US5: T037 after T029 (needs `fetchRoom` + router access in provider)
- Polish: T032 + T033 parallel

---

## Parallel Example: Foundational Phase

```bash
# Models in parallel:
T005 backend/src/models/game.ts
T007 frontend/src/services/api.ts

# Then single-file core logic:
T008 → T009 → T010 → T011 in backend/src/services/roomStore.ts + rooms.ts
```

---

## Parallel Example: User Story 4

```bash
# Backend privacy tests first:
T023 roomStore.test.ts
T024 schemas.test.ts

# Then UI in parallel:
T025 GamePage.tsx drawer word panel
T026 GamePage.tsx guesser placeholder
```

---

## Implementation Strategy

### MVP First (User Stories 1–4)

1. Complete Phase 1–2 (active round + per-viewer snapshots)
2. US1 → name preservation tests
3. US2 → drawer roles in API + UI
4. US3 → deterministic word tests
5. US4 → guesser omission tests + drawer word panel
6. **STOP and VALIDATE**: Dual-browser drawer/guesser before US5 polish

### Incremental Delivery

1. Foundation → `start` + `GET` return roles and conditional `secretWord`
2. US1–US4 → playable first round with word privacy (MVP)
3. US5 → lobby/game navigation and game polling hardened
4. Polish → README, plan contract sync, full test/build

### Suggested MVP Scope

**Phases 1–2 + US1–US4**: Host starts; drawer sees word; guessers do not; names preserved. US5 improves multi-tab cohesion but lobby auto-nav already partially exists from 001.

---

## Notes

- **No WebSockets, DB, or auth** per constitution and `AGENTS.md`
- **No trim / no `playerN` defaults** — inherit FR-016/FR-017 from `001-room-management`; do not add `storePlayerNameAsIs`-style helpers unless needed; use `name ?? ""` only
- **Host at start = drawer**; if host transferred in lobby, new `hostId` becomes drawer (FR-005)
- **Out of scope**: canvas strokes, guesses, scoring, round rotation, result screen (later features)
- Plan artifacts live under `plans/002-game-start-drawer/` (T003 complete); align implementation with `contracts/api-endpoints.md` and `quickstart.md`
