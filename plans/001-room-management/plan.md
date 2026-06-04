# Implementation Plan: Room Management System

**Input**: Feature specification from `specs/001-room-management/spec.md`

**Plan directory**: `plans/001-room-management/` (matches `specs/001-room-management/`)

**Status**: Implemented and aligned with spec (2026-06-04, as-is names). Use for regression, review, and traceability to `tasks/001-room-management/tasks.md`.

**Spec traceability**: FR-001–FR-015 room/poll/host lifecycle; FR-016 as-is `playerName` (no trim, no defaults); FR-017 duplicate names allowed.

## Summary

Multiplayer room lifecycle: create/join by 4–6 character codes, optional display names (stored **as-is**, no trim; empty allowed; **no** `playerN` server defaults; **duplicate names allowed**), host designation with transfer on leave, ~2s lobby polling with exponential backoff, stale-participant eviction (~15s), host-only game start when ≥2 players, and in-memory room isolation. Gameplay after start (drawer, word, canvas) is covered by `specs/002-game-start-drawer`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial & post-design (PASSED):**

- [x] **TypeScript-First**: `backend/src`, `frontend/src` — typed ESM
- [x] **REST + Zod**: `backend/src/api/rooms.ts`, `schemas.ts`
- [x] **React + Vite patterns**: `roomStore.ts`, functional pages, no new state libraries
- [x] **HTTP polling only**: `LobbyPage` poll loop; no WebSockets
- [x] **In-memory only**: `roomStore.ts` `Map<string, Room>`
- [x] **Brownfield scope**: Extends starter; no rewrite

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | HTTP polling `GET /rooms/:code?participantId=` (~2s, backoff on failure) |
| Storage | In-memory `backend/src/services/roomStore.ts` |

## Architecture

### Data Flow

```
CreateRoomPage → POST /rooms { playerName? } → createRoom() → lobby
JoinRoomPage   → POST /rooms/:code/join → joinRoom() → lobby
LobbyPage      → poll GET /rooms/:code?participantId= (2s, backoff) → roomStore → UI
Leave          → POST /rooms/:code/leave OR stale eviction OR pagehide leave
Host start     → POST /rooms/:code/start (host, ≥2 players) → status active → navigate /game (no leave on route change)
```

### Player naming (FR-016 / FR-017)

| Input | Stored `Participant.name` |
|-------|---------------------------|
| Omitted | `""` |
| `""` | `""` |
| `"   "` | `"   "` (whitespace preserved) |
| `"  Ali  "` | `"  Ali  "` |
| Two players `"Bob"` | Both `"Bob"` (allowed) |

Implementation: `storePlayerNameAsIs()` in `roomStore.ts`; Zod preserves string as received; frontend sends `playerName` without trimming.

### API Contracts

| Method | Endpoint | Request | Response | Notes |
|--------|----------|---------|----------|-------|
| `POST` | `/rooms` | `{ playerName? }` | `{ participantId, room }` | Creator = host |
| `POST` | `/rooms/:code/join` | `{ playerName?, participantId? }` | `{ participantId, room }` | `400` if already in room |
| `GET` | `/rooms/:code` | `?participantId` | `{ room }` | Heartbeat updates `lastSeenAt` |
| `POST` | `/rooms/:code/leave` | `{ participantId }` | `{ success }` | Host transfer; delete if empty |
| `POST` | `/rooms/:code/start` | `{ participantId }` | `{ room }` | Host-only; `status: active` |

**RoomSnapshot (derived):** `hostId`, `canStart` (lobby + count ≥ 2), per-participant `isHost`.

Detail: `plans/001-room-management/contracts/api-endpoints.md`, `contracts/frontend-store.md`.

### File Structure (implemented)

**Backend**

- `backend/src/models/game.ts` — `Room`, `Participant`, `RoomSnapshot`
- `backend/src/services/roomStore.ts` — CRUD, host transfer, stale prune, start
- `backend/src/api/rooms.ts` — route handlers
- `backend/src/api/schemas.ts` — Zod schemas, `ROOM_CODE_REGEX`
- `backend/src/services/roomStore.test.ts` — store unit tests

**Frontend**

- `frontend/src/services/api.ts` — REST client
- `frontend/src/state/roomStore.ts` — session, polling helpers, create/join/leave/start
- `frontend/src/pages/CreateRoomPage.tsx`, `JoinRoomPage.tsx`, `LobbyPage.tsx`
- `frontend/src/routes/index.tsx` — `/lobby`, `/game`

## Implementation Sequence

1. Models + `roomStore` (host, leave, transfer, cleanup)
2. Zod schemas + routes (`leave`, code validation)
3. Frontend API + store session persistence
4. Lobby polling + backoff; **no** `leave` on unmount
5. `pagehide` leave; host-only start; US5 navigation to `/game`
6. FR-016/017: `storePlayerNameAsIs()` — no trim, no `playerN` defaults, duplicate names OK

## Testing Strategy

| Layer | Command | Focus |
|-------|---------|--------|
| Backend | `cd backend && npm test` | Codes, host transfer, empty names, duplicates, start gates |
| Frontend | `cd frontend && npm test` | API body shape for `playerName` |
| Manual | Two tabs | Create/join, poll join/leave, host transfer, start, empty/duplicate names |

**Two-tab checklist**

1. Create room (blank name) → lobby shows empty name, host badge
2. Second tab join same code (duplicate name allowed) → both see 2 players within ~3s
3. Non-host has no Start control
4. Host Start with 2+ players → both reach game; lobby unmount did not call leave
5. Invalid code → client + server error messages
6. Create with name `"  Ali  "` → lobby shows spaces preserved

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| React Strict Mode double-mount calls leave | Leave only on explicit button + `pagehide` (FR-012) |
| Ghost participants after tab close | `lastSeenAt` heartbeat + 15s eviction |
| Room code collision | Regenerate up to 10 attempts (`generateUniqueCode`) |
| Duplicate display names confuse UI | Identify drawer/host by `isHost` / `participantId`, not name alone |

## Phase Artifacts

| Artifact | Path |
|----------|------|
| Research | `plans/001-room-management/research.md` |
| Data model | `plans/001-room-management/data-model.md` |
| API contract | `plans/001-room-management/contracts/api-endpoints.md` |
| Store contract | `plans/001-room-management/contracts/frontend-store.md` |
| Quickstart | `plans/001-room-management/quickstart.md` |
| Tasks | `tasks/001-room-management/tasks.md` |

## Dependencies

No new npm packages. Uses existing Express, Zod, React, Vitest stack.

## Out of Scope (this feature)

Drawing, guesses, scoring, drawer/word assignment (see `002-game-start-drawer`), auth, persistence, WebSockets.
