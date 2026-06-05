---
description: "Task list for Room Setup & Lobby (Scenario 1)"
---

# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/spec.md` and `plans/001-room-setup-lobby/`

**Prerequisites**: `plans/001-room-setup-lobby/plan.md`, `specs/001-room-setup-lobby/spec.md`, `plans/001-room-setup-lobby/research.md`, `plans/001-room-setup-lobby/data-model.md`, `plans/001-room-setup-lobby/contracts/rooms-api.md`, `.specify/memory/constitution.md`

**Tests**: Backend Vitest tasks included where `plan.md` lists `roomStore.test.ts` coverage; no full TDD suite unless added later.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories in `spec.md` (US1–US5)

## Path Conventions

- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Plan artifacts: `plans/001-room-setup-lobby/`
- Tasks file: `tasks/001-room-setup-lobby/tasks.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fix starter blockers and confirm dev environment

- [x] T001 Fix default API base URL (`/bug` → `http://localhost:3001`) in `frontend/src/services/api.ts`
- [x] T002 [P] Verify `npm run dev` works in `backend/` and `frontend/` against `plans/001-room-setup-lobby/quickstart.md` prerequisites

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, schemas, and snapshot shape required by all user stories

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [x] T003 Extend `Participant`, `Room`, and `RoomSnapshot` types (`isHost`, `lastSeenAt`, `"playing"` status, viewer fields) in `backend/src/models/game.ts`
- [x] T004 [P] Add `roomCodeSchema`, `startGameSchema`, and shared Zod refinements in `backend/src/api/schemas.ts`
- [x] T005 Add `isValidRoomCode` and as-is display name handling in `backend/src/services/roomStore.ts`
- [x] T006 Implement `toRoomSnapshot(room, viewerParticipantId?)` with `isViewerHost` and `canStartGame` in `backend/src/services/roomStore.ts`
- [x] T007 [P] Mirror `RoomSnapshot`, `Participant`, and `"playing"` status types in `frontend/src/services/api.ts`
- [x] T008 [P] Add `scribble.session` localStorage read/write helpers in `frontend/src/state/roomStore.ts`

**Checkpoint**: Types compile; snapshot contract matches `plans/001-room-setup-lobby/contracts/rooms-api.md`

---

## Phase 3: User Story 1 — Host Creates a Room (Priority: P1) 🎯 MVP

**Goal**: Player creates a room, lands in lobby as host with shareable code and host indicator

**Independent Test**: Single browser — Create Room → lobby shows unique code, one participant marked host. Start-button gating (disabled with one player) is fully validated in US4 (T037); US1 only requires host badge and room code visible.

- [x] T009 [US1] Set creator `isHost: true` and initial `lastSeenAt` in `createRoom` in `backend/src/services/roomStore.ts`
- [x] T010 [US1] Return viewer-aware snapshot from `POST /rooms` in `backend/src/api/rooms.ts`
- [x] T011 [US1] Persist `{ participantId, roomCode }` to localStorage after create in `frontend/src/state/roomStore.ts`
- [x] T012 [US1] Hydrate session from localStorage on `RoomStore` init in `frontend/src/state/roomStore.ts`
- [x] T013 [US1] Handle create errors without UI crash in `frontend/src/pages/CreateRoomPage.tsx`
- [x] T014 [US1] Display room code via `RoomCodeBadge` and host label on participant row in `frontend/src/pages/LobbyPage.tsx`
- [x] T015 [US1] Redirect to `/` when `/lobby` loads without room session in `frontend/src/pages/LobbyPage.tsx`
- [x] T049 [US1] On lobby mount with restored session, call `fetchRoom` once before polling starts in `frontend/src/pages/LobbyPage.tsx` or `frontend/src/hooks/useLobbyPolling.ts`

**Checkpoint**: US1 acceptance scenarios 1–2 pass in one browser (host badge + room code; Start gating verified in US4)

---

## Phase 4: User Story 2 — Player Joins by Room Code (Priority: P1)

**Goal**: Valid codes join lobby; empty, malformed, unknown, duplicate-name, and post-start joins fail with clear messages

**Independent Test**: Two browsers — Tab A creates room; Tab B joins with valid code; error cases tested on Join page without affecting Tab A host status

- [x] T016 [US2] Enforce lobby-only join, duplicate name (case-insensitive), and uppercase code lookup in `joinRoom` in `backend/src/services/roomStore.ts`
- [x] T017 [US2] Validate room code shape before lookup and map errors to 400/404/409 in `backend/src/api/rooms.ts` join handler
- [x] T018 [US2] Reject join when `room.status !== "lobby"` with `Game already in progress` in `backend/src/services/roomStore.ts`
- [x] T019 [US2] Add client-side empty-code and malformed-code validation in `frontend/src/pages/JoinRoomPage.tsx`
- [x] T020 [US2] Display server join error messages (not found, duplicate name, game started) in `frontend/src/pages/JoinRoomPage.tsx`
- [x] T021 [US2] Persist session after successful join in `frontend/src/state/roomStore.ts`

**Checkpoint**: US2 acceptance scenarios 1–8 pass; US1 scenario 3 (host unchanged after join) passes

---

## Phase 5: User Story 3 — Live Lobby Updates (Priority: P2)

**Goal**: Lobby participant list auto-refreshes ~2s; loading state visible; non-hosts auto-navigate when game starts (requires US4 start to fully test navigation)

**Independent Test**: Two browsers in same lobby — joiner appears on host screen within ~2s without manual refresh; refresh indicator visible during fetch

- [x] T022 [US3] Implement `touchParticipant(code, participantId)` updating `lastSeenAt` in `backend/src/services/roomStore.ts`
- [x] T023 [US3] Call `touchParticipant` from `GET /rooms/:code` when `participantId` query present in `backend/src/api/rooms.ts`
- [x] T024 [US3] Pass `participantId` query param in `fetchRoom` in `frontend/src/state/roomStore.ts`
- [x] T025 [US3] Create `useLobbyPolling` hook with 2000ms `setInterval` in `frontend/src/hooks/useLobbyPolling.ts`
- [x] T026 [US3] Integrate polling hook in `frontend/src/pages/LobbyPage.tsx` with cleanup on unmount
- [x] T027 [US3] Show refreshing/loading state during poll without blocking Refresh button in `frontend/src/pages/LobbyPage.tsx`
- [x] T028 [US3] Show non-blocking poll error and retry on next tick in `frontend/src/pages/LobbyPage.tsx`
- [x] T029 [US3] Retain manual **Refresh Room** button calling `fetchRoom` in `frontend/src/pages/LobbyPage.tsx`
- [x] T047 [US3] On poll **404** (evicted or missing room), clear `scribble.session` and redirect to `/` in `frontend/src/hooks/useLobbyPolling.ts` or `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: US3 scenarios 1–3 pass; scenario 4 validated after Phase 6

---

## Phase 6: User Story 4 — Host-Only Game Start & Host Transfer (Priority: P2)

**Goal**: Only host starts with ≥2 players; non-host blocked server-side; host succession on disconnect; inactive rooms evicted when all participants stale; all players reach `/game`

**Independent Test**: Two browsers — host Start disabled alone, enabled with 2+; guest has no Start; both navigate to `/game` within ~2s after start

- [x] T030 [US4] Implement `startGame(code, participantId)` with host and min-player guards in `backend/src/services/roomStore.ts`
- [x] T031 [US4] Set `room.status = "playing"` on successful start in `backend/src/services/roomStore.ts`
- [x] T032 [US4] Implement `resolveHostTransfer(room)` (6s stale threshold, join-order cascade) in `backend/src/services/roomStore.ts`
- [x] T033 [US4] Invoke `resolveHostTransfer` during snapshot/GET flow in `backend/src/services/roomStore.ts`
- [x] T045 [US4] Implement `evictIfAllParticipantsStale(room)` (6s threshold, delete from Map) in `backend/src/services/roomStore.ts`
- [x] T046 [US4] Invoke eviction after heartbeat and host transfer on GET/join/start paths in `backend/src/services/roomStore.ts`
- [x] T034 [US4] Wire `POST /rooms/:code/start` with 400/403/409 mapping in `backend/src/api/rooms.ts`
- [x] T035 [US4] Add `startGame(code, participantId)` to `frontend/src/services/api.ts`
- [x] T036 [US4] Add `startGame` action to `RoomStore` in `frontend/src/state/roomStore.ts`
- [x] T037 [US4] Show Start only when `canStartGame`; show waiting message when host with one player in `frontend/src/pages/LobbyPage.tsx`
- [x] T038 [US4] Navigate host to `/game` immediately on successful start in `frontend/src/pages/LobbyPage.tsx`
- [x] T039 [US4] Auto-navigate to `/game` when poll observes `status === "playing"` in `frontend/src/hooks/useLobbyPolling.ts`
- [x] T048 [US4] Verify original host reconnects with `isHost: false` after transfer (session + poll snapshot) in `backend/src/services/roomStore.ts` and `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: US4 scenarios 1–5 pass; US3 scenario 4 passes; host refresh retains host; host reconnect after transfer shows non-host (T048)

---

## Phase 7: User Story 5 — Room Isolation (Priority: P2)

**Goal**: Concurrent rooms never leak participants, codes, or lobby state

**Independent Test**: Three browsers — two hosts create separate rooms; joiners only appear in their target room lobby

- [x] T040 [US5] Audit all `roomStore` reads/writes to ensure Map operations are scoped by normalized code only in `backend/src/services/roomStore.ts`
- [x] T041 [US5] Confirm lobby poll and join always use session `roomCode` (never cross-room) in `frontend/src/state/roomStore.ts` and `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: US5 scenarios 1–3 pass via `plans/001-room-setup-lobby/quickstart.md` Test 6

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tests, builds, and full quickstart validation

- [x] T042 [P] Extend Vitest coverage for create/join/start/host-transfer/eviction/host-reconnect in `backend/src/services/roomStore.test.ts`
- [x] T043 Run full manual validation per `plans/001-room-setup-lobby/quickstart.md` (Tests 1–9)
- [x] T044 Run `npm run build` in `backend/` and `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    └── Phase 2 (Foundational) — BLOCKS all user stories
            ├── Phase 3 (US1) 🎯 MVP
            ├── Phase 4 (US2) — depends on US1 for two-browser join test
            ├── Phase 5 (US3) — depends on US2 for multi-player lobby
            ├── Phase 6 (US4) — depends on US3 polling for auto-navigate
            └── Phase 7 (US5) — depends on US1 + US2 (two rooms)
                    └── Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends on | Independent test scope |
|-------|------------|------------------------|
| US1 (P1) | Foundational | Create + lobby host view (1 browser) |
| US2 (P1) | Foundational, US1 for host-unchanged test | Join + validation errors (2 browsers) |
| US3 (P2) | US1, US2 | Auto-refresh participant list (2 browsers) |
| US4 (P2) | US1, US2, US3 | Start game + host transfer (2–3 browsers) |
| US5 (P2) | US1, US2 | Two isolated rooms (3 browsers) |

### Within Each User Story

- Backend service logic before API routes
- API routes before frontend API client
- Frontend store before pages/hooks
- Story checkpoint before next priority

---

## Parallel Execution Examples

### Foundational (after T003 starts types)

```bash
# Parallel: schemas, frontend types, localStorage helpers
T004 backend/src/api/schemas.ts
T007 frontend/src/services/api.ts
T008 frontend/src/state/roomStore.ts
```

### User Story 2

```bash
# Parallel: backend join rules + frontend validation (after T016 begins)
T017 backend/src/api/rooms.ts
T019 frontend/src/pages/JoinRoomPage.tsx
```

### User Story 4

```bash
# Parallel: start route + frontend API (after T030–T032)
T034 backend/src/api/rooms.ts
T035 frontend/src/services/api.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 → Phase 2 → Phase 3
2. **STOP and validate**: Create room, see code + host badge in lobby
3. Demo/host flow before join logic

### Incremental Delivery

1. US1 + US2 → players can create and join (manual refresh still OK for MVP+)
2. Add US3 → live lobby without clicking Refresh
3. Add US4 → start game and sync navigation
4. Add US5 + Polish → isolation audit and full quickstart

### Suggested Commit Slices

- `feat(room): foundational types and snapshot`
- `feat(room): host create room (US1)`
- `feat(room): join validation (US2)`
- `feat(room): lobby polling (US3)`
- `feat(room): host-only start, transfer, and eviction (US4)`

---

## Notes

- Host reconnect after transfer: original host keeps `participantId` with `isHost: false` — T048; no re-join form needed if session intact
- Inactive room eviction: when all participants exceed 6s stale, room is removed; poll/join 404 triggers session clear (constitution memory discipline)
- Display names stored exactly as submitted (whitespace preserved; omitted stays undefined); duplicates rejected by exact or case-insensitive match
- Do not add WebSockets, database, auth, or new state libraries (constitution)
- Plan artifacts live in `plans/001-room-setup-lobby/`; spec in `specs/001-room-setup-lobby/`; tasks in `tasks/001-room-setup-lobby/`
