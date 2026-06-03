---
description: "Task list for Room Management System feature"
---

# Tasks: Room Management System

**Input**: `specs/001-room-management/spec.md` and `plans/001-room-management/`

**Tasks directory**: `tasks/001-room-management/` (matches spec folder `specs/001-room-management/` and plan folder `plans/001-room-management/`)

**Prerequisites**: `plans/001-room-management/plan.md`, `specs/001-room-management/spec.md`, `plans/001-room-management/research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories in spec.md (US1–US5)

## Path Conventions

- **Backend**: `backend/src/`
- **Frontend**: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Brownfield alignment before feature work

- [X] T001 Review `plans/001-room-management/quickstart.md` and `discovery_notes.md` for gaps vs current starter
- [X] T002 [P] Fix default API base URL in `frontend/src/services/api.ts` (use `http://localhost:3001` or `VITE_API_URL`)
- [X] T003 [P] Verify `cd backend && npm run dev` and `cd frontend && npm run dev` start without errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data model and snapshot shape required by all user stories

**⚠️ CRITICAL**: No user story work until this phase is complete

- [X] T004 [P] Add `hostId` to `Room` and ensure `joinedAt` on `Participant` in `backend/src/models/game.ts`
- [X] T005 [P] Add `hostId`, `canStart`, and `isHost` on participant snapshots in `backend/src/models/game.ts`
- [X] T006 [P] Mirror `hostId`, `canStart`, and `isHost` types in `frontend/src/services/api.ts`
- [X] T007 Add room code path param schema (`/^[A-Z0-9]{4,6}$/`) and `leaveRoomSchema` in `backend/src/api/schemas.ts`
- [X] T008 Extend `toRoomSnapshot()` in `backend/src/services/roomStore.ts` to emit `hostId`, per-participant `isHost`, and `canStart` (participants.length >= 2)
- [X] T009 Ensure `createRoom()` and `joinRoom()` set `joinedAt` and initial `lastSeenAt` timestamps in `backend/src/services/roomStore.ts`

**Checkpoint**: API responses include host and lobby-ready snapshot fields

---

## Phase 3: User Story 1 - Room Creation (Priority: P1) 🎯 MVP

**Goal**: A player creates a room, receives a unique code, and is designated host in the lobby

**Independent Test**: Create a room from `CreateRoomPage`, see code on lobby, confirm you are host and alone; start game disabled

### Implementation for User Story 1

- [X] T010 [US1] Set `hostId` to creator `participantId` in `createRoom()` in `backend/src/services/roomStore.ts`
- [X] T011 [US1] Ensure 4–6 char uppercase alphanumeric code generation with collision retry in `backend/src/services/roomStore.ts`
- [X] T012 [US1] Return `hostId` and host flags in `POST /rooms` handler in `backend/src/api/rooms.ts`
- [X] T013 [P] [US1] Persist session via `roomStore.createRoom()` and navigate to `/lobby` in `frontend/src/pages/CreateRoomPage.tsx`
- [X] T014 [US1] Display room code via `RoomCodeBadge` and host-only lobby state in `frontend/src/pages/LobbyPage.tsx` (solo player, start disabled)
- [X] T040 [P] [US1] Allow create without player name in `frontend/src/pages/CreateRoomPage.tsx`; backend assigns `player1` when omitted (FR-016)

**Checkpoint**: Room creation works end-to-end without a second player

---

## Phase 4: User Story 2 - Room Joining (Priority: P1)

**Goal**: A second player joins with name + code and sees the same lobby participant list and host

**Independent Test**: Tab A creates room; Tab B joins with code + name; both lobbies show two participants and one host

### Implementation for User Story 2

- [X] T015 [US2] Add participant on join with `joinedAt` in `joinRoom()` in `backend/src/services/roomStore.ts`
- [X] T016 [US2] Return updated snapshot from `POST /rooms/:code/join` in `backend/src/api/rooms.ts`
- [X] T017 [P] [US2] Wire `JoinRoomPage` name + code form to `roomStore.joinRoom()` in `frontend/src/pages/JoinRoomPage.tsx`
- [X] T018 [US2] Render participant list with host indicator in `frontend/src/pages/LobbyPage.tsx`
- [X] T019 [US2] Disable join submit only when room code empty in `frontend/src/pages/JoinRoomPage.tsx`; name optional (FR-016)

**Checkpoint**: Two-browser join flow shows consistent participants and host

---

## Phase 5: User Story 3 - Room Code Validation (Priority: P2)

**Goal**: Invalid, empty, and missing room codes are rejected with clear feedback

**Independent Test**: Submit bad codes on join; see client and server errors within 500ms

### Implementation for User Story 3

- [X] T020 [P] [US3] Validate `:code` path param with Zod in `backend/src/api/rooms.ts` join and fetch routes
- [X] T021 [US3] Return 404 for non-existent rooms and 400 for malformed codes with spec messages in `backend/src/api/rooms.ts`
- [X] T022 [P] [US3] Add client-side format check (`/^[A-Z0-9]{4,6}$/`) before join in `frontend/src/pages/JoinRoomPage.tsx`
- [X] T023 [US3] Map API errors to user-friendly copy in `frontend/src/state/roomStore.ts` (invalid, empty, format)

**Checkpoint**: All three acceptance scenarios for invalid/empty/malformed codes pass

---

## Phase 6: User Story 4 - Lobby Updates and Polling (Priority: P2)

**Goal**: Lobby auto-refreshes every ~2s; join/leave visible within 2–3s; polling recovers with backoff

**Independent Test**: Tab A in lobby; Tab B joins or leaves; Tab A updates without manual refresh

### Implementation for User Story 4

- [X] T024 [US4] Implement `leaveRoom(code, participantId)` with host transfer to earliest `joinedAt` in `backend/src/services/roomStore.ts`
- [X] T025 [US4] Delete room from memory when last participant leaves in `backend/src/services/roomStore.ts`
- [X] T026 [US4] Add `POST /rooms/:code/leave` route in `backend/src/api/rooms.ts`
- [X] T027 [P] [US4] Add `leaveRoom()` to `frontend/src/services/api.ts` and `roomStore.leaveRoom()` in `frontend/src/state/roomStore.ts`
- [X] T028 [US4] Add 2s `GET /rooms/:code` polling with exponential backoff on failure in `frontend/src/pages/LobbyPage.tsx`
- [X] T029 [US4] Remove manual refresh button; add Leave Room action in `frontend/src/pages/LobbyPage.tsx`
- [X] T030 [US4] Prevent duplicate join for same `participantId` in `backend/src/services/roomStore.ts`
- [X] T041 [US4] Treat post-leave rejoin as a **new join** (new `participantId` via `POST /rooms/:code/join`); document in `backend/src/services/roomStore.ts` that prior `participantId` is invalid after leave
- [X] T044 [US4] Add `lastSeenAt` to `Participant` in `backend/src/models/game.ts` and mirror in `frontend/src/services/api.ts`
- [X] T045 [US4] On `GET /rooms/:code` with `participantId`, update `lastSeenAt` and evict participants stale for ~15s in `backend/src/services/roomStore.ts` (apply host transfer per T024 when host pruned)
- [X] T046 [P] [US4] Call `leaveRoom()` on `pagehide` only in `frontend/src/pages/LobbyPage.tsx` (tab close); explicit Leave button; **do not** call leave in `useEffect` cleanup (Strict Mode remount and `/game` navigation must not POST `/leave` or clear session)
- [X] T047 [US4] Ensure lobby poll (T028) always passes `participantId` to `fetchRoom` for heartbeat in `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: Lobby sync, leave/host-transfer, and disconnect eviction work across two tabs

---

## Phase 7: User Story 5 - Game Start Control (Priority: P3)

**Goal**: Only host can start; start enabled only with ≥2 players; all transition to game state

**Independent Test**: Solo host sees disabled start; with 2+ players host can start; non-host never sees start control

### Implementation for User Story 5

- [X] T031 [US5] Verify `LobbyPage` reads `canStart` from poll snapshot (already set in T008); do not duplicate `canStart` logic in US5
- [X] T032 [US5] Add `useIsHost` (or equivalent) comparing `participantId` to `room.hostId` in `frontend/src/state/roomStore.ts`
- [X] T033 [US5] Show Start Game only when host and `canStart` in `frontend/src/pages/LobbyPage.tsx`
- [X] T034 [US5] Hide start controls for non-host participants in `frontend/src/pages/LobbyPage.tsx`
- [X] T043 [US5] Add host-only `startGame(code, participantId)` in `backend/src/services/roomStore.ts` and `POST /rooms/:code/start` in `backend/src/api/rooms.ts` (sets `status` to `active`)
- [X] T035 [US5] On host Start Game click, call start endpoint then `navigate('/game')` in `frontend/src/pages/LobbyPage.tsx`
- [X] T042 [US5] In `LobbyPage.tsx` poll handler (T028), `navigate('/game')` when `room.status === 'active'` so non-host clients transition without a separate push channel

**Checkpoint**: Host gating, two-player minimum, and all clients reach `/game` after host starts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and validation across stories

- [X] T036 [P] Add Vitest cases for host transfer, empty-room cleanup, and stale-participant eviction (~15s) in `backend/src/services/roomStore.test.ts`
- [X] T037 [P] Add Vitest cases for room code Zod schemas in `backend/src/api/schemas.test.ts`
- [X] T038 Run two-tab manual test checklist in `plans/001-room-management/quickstart.md` plus: (a) two rooms isolated; (b) leave then rejoin; (c) host start moves both tabs to `/game`; (d) close tab B without leave—tab A removes B within ~15s; (e) throttle network—lobby shows error then recovers via backoff; (f) create room in dev (Strict Mode)—lobby stays, no `POST …/leave` before Leave or tab close
- [X] T039 [P] Run `npm run build` in `backend/` and `frontend/` and fix any type errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP increment
- **US2 (Phase 4)**: Depends on Foundational; integrates with US1 create/join APIs
- **US3 (Phase 5)**: Depends on US2 join path (can parallelize backend validation with US2 if careful)
- **US4 (Phase 6)**: Depends on US2 lobby UI; leave endpoint supports polling tests
- **US5 (Phase 7)**: Depends on US4 lobby polling and ≥2 player state
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 | Foundational | Independent MVP |
| US2 | Foundational, US1 create flow | Needs existing room to join |
| US3 | US2 join UX | Validation on join/fetch |
| US4 | US2 lobby | Polling + leave |
| US5 | US4 lobby | Host + player count gating |

### Parallel Opportunities

- **Phase 1**: T002 and T003 in parallel after T001
- **Phase 2**: T004, T005, T006 in parallel; then T007–T009 sequentially
- **US1**: T013 parallel with backend T010–T012 once T008 done
- **US3**: T020 and T022 in parallel
- **US4**: T027 parallel with backend T024–T026
- **Polish**: T036, T037, T039 in parallel

---

## Parallel Example: User Story 4

```bash
# Backend leave + cleanup (sequential in same file):
T024 → T025 → T026

# While backend in progress, frontend API client:
T027 in frontend/src/services/api.ts

# Then lobby polling UI:
T028 → T029
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: Single-tab create → lobby as host  
5. Demo room code sharing

### Incremental Delivery

1. Setup + Foundational → snapshot with host fields  
2. US1 → create + host lobby (MVP)  
3. US2 → join second player  
4. US3 → validation hardening  
5. US4 → polling + leave + host transfer  
6. US5 → start game gating  
7. Polish → tests + builds

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3): create room, unique code, host in lobby, cannot start alone.

---

## Notes

- No new npm dependencies per `plans/001-room-management/plan.md`
- HTTP polling only; no WebSockets
- Display names are optional on `JoinRoomPage` / `CreateRoomPage`; server defaults to `player1`, `player2`, … (FR-016)
- Game drawing mechanics remain out of scope; US5 uses `POST /rooms/:code/start` + poll-driven `/game` navigation (T043, T035, T042)
- FR-012 disconnects: server evicts stale participants (~15s without poll heartbeat); client calls leave on `pagehide` or explicit Leave only — never on React unmount (T046)
