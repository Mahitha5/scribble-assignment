# Implementation Plan: Room Setup & Lobby

**Input**: Feature specification from `specs/001-room-setup-lobby/spec.md`

**Feature directory**: `specs/001-room-setup-lobby/`

## Summary

Implement Scenario 1 (room setup and lobby) on the existing Scribble starter: host assignment on create, validated join-by-code with duplicate-name and post-start rejection, lobby auto-polling (~2s), server-enforced host-only start with a two-player minimum, room isolation, host succession on disconnect, inactive-room eviction when all participants are stale, and auto-navigation to the game screen when status leaves `lobby`.

Technical approach: extend in-memory `roomStore` with `isHost`, `lastSeenAt`, and `playing` status; add Zod-validated `POST /rooms/:code/start`; heartbeat on existing `GET /rooms/:code`; evict rooms when every participant exceeds 6s stale threshold; persist session in `localStorage`; poll from `LobbyPage` and react to status/host changes (404 clears session).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **TypeScript-First**: Changes stay in typed TS/ESM in `backend/` and `frontend/`
- [x] **REST + Zod**: New `start` endpoint and tightened join/create schemas use Express + Zod
- [x] **React + Vite patterns**: Extend existing `RoomStore` class; no new state libraries
- [x] **HTTP polling only**: Lobby sync via `setInterval` + `GET /rooms/:code` (~2000ms)
- [x] **In-memory only**: All state in `roomStore.ts` Map; heartbeat uses poll timestamps; inactive rooms evicted when all participants stale (>6s)
- [x] **Brownfield scope**: Incremental edits to starter routes, pages, and store

**Post-design re-check**: Host transfer uses poll heartbeats (no WebSockets). Start-game enforced in service layer. No forbidden dependencies added.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | HTTP polling via REST (`GET /rooms/:code`, etc.) |
| Storage | In-memory services in `backend/src/services/`; client session in `localStorage` |

## Architecture

### Data Flow

1. **Create room**: `CreateRoomPage` → `POST /rooms` → room created with creator `isHost: true` → `{ participantId, room }` stored in `RoomStore` + `localStorage` → navigate `/lobby`.
2. **Join room**: `JoinRoomPage` validates code format client-side → `POST /rooms/:code/join` → server validates lobby status, code shape, duplicate name → session saved → `/lobby`.
3. **Lobby poll**: `LobbyPage` mounts interval (2000ms) → `GET /rooms/:code?participantId=` → server updates `lastSeenAt`, runs host-stale check/transfer, evicts room if all participants stale → returns snapshot with `isHost`, `canStartGame` for viewer → UI updates participant list and host badge. On 404, client clears session and redirects home.
4. **Start game**: Host clicks Start (enabled when `canStartGame`) → `POST /rooms/:code/start` with `participantId` → server verifies host + ≥2 participants + lobby → sets `status: "playing"` → host navigates immediately; others auto-navigate on next poll when `status !== "lobby"`.
5. **Session restore**: On app load, hydrate `RoomStore` from `localStorage`; on lobby mount with restored session, fetch latest snapshot once before polling; host reconnect after transfer returns `isHost: false` for original host.

### API Contracts

See `specs/001-room-setup-lobby/contracts/rooms-api.md` for request/response shapes and error codes.

New/changed endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/rooms` | Create room (existing; response adds host flags) |
| `POST` | `/rooms/:code/join` | Join lobby (enhanced validation) |
| `GET` | `/rooms/:code` | Poll snapshot + heartbeat (enhanced snapshot) |
| `POST` | `/rooms/:code/start` | Host-only start (new) |

### File Structure

**Backend**

| File | Change |
|------|--------|
| `backend/src/models/game.ts` | Add `isHost`, `lastSeenAt` on `Participant`; extend `RoomStatus` to `"lobby" \| "playing"`; extend `RoomSnapshot` with viewer fields |
| `backend/src/api/schemas.ts` | Strict room code regex; `startGameSchema`; refined error messages |
| `backend/src/api/rooms.ts` | Wire start route; map domain errors to HTTP status |
| `backend/src/services/roomStore.ts` | Host logic, join validation, startGame, heartbeat, host transfer, inactive-room eviction |
| `backend/src/services/roomStore.test.ts` | Tests for host, join errors, start, transfer, eviction |

**Frontend**

| File | Change |
|------|--------|
| `frontend/src/services/api.ts` | Fix base URL; add `startGame`; align types with snapshot |
| `frontend/src/state/roomStore.ts` | `localStorage` persistence; `startGame`; poll helper |
| `frontend/src/pages/JoinRoomPage.tsx` | Client validation (empty/malformed code) |
| `frontend/src/pages/LobbyPage.tsx` | Polling, host UI, conditional start, auto-navigate on `playing`, redirect on evicted room (404) |
| `frontend/src/pages/CreateRoomPage.tsx` | Persist session after create (via store) |
| `frontend/src/hooks/useLobbyPolling.ts` | New hook: interval + status navigation (optional extract) |

## Implementation Sequence

1. **Backend models + schemas** — types, Zod room code pattern, start body schema.
2. **roomStore core** — `isHost` on create; join guards (lobby, duplicate name, malformed code); `startGame`; `touchParticipant`; `resolveHostTransfer`; `evictIfAllParticipantsStale`.
3. **API routes** — start endpoint; improved HTTP errors (400/403/404/409).
4. **Backend tests** — cover acceptance-critical paths.
5. **Frontend API + types** — fix URL; new methods and snapshot fields.
6. **Session persistence** — `localStorage` read/write in `RoomStore`.
7. **LobbyPage** — polling, host badge, start button gating, navigate on `playing`.
8. **JoinRoomPage** — client-side code validation messages.
9. **Manual validation** — two-browser tab flow per `quickstart.md`.

## Dependencies

No new npm packages. Uses existing Express, Zod, React, React Router, Vite.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Host transfer flapping on slow network | Stale threshold = 6s (3 missed 2s polls) before transfer |
| Duplicate display names (omitted or whitespace-only) block second joiner | Spec-intended; clear error message |
| `playing` status minimal for Scenario 2 | Only transition out of lobby; drawer/word deferred |
| API URL typo in starter (`/bug`) | Fix to `http://localhost:3001` in plan slice |
| Evicted room vs restart both 404 | Same client handling: clear `scribble.session`, redirect to `/` |

## Related Artifacts

- `specs/001-room-setup-lobby/research.md` — design decisions
- `specs/001-room-setup-lobby/data-model.md` — entity definitions
- `specs/001-room-setup-lobby/contracts/rooms-api.md` — REST contracts
- `specs/001-room-setup-lobby/quickstart.md` — manual test script
