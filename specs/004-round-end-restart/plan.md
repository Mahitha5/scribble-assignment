# Implementation Plan: Round End, Result & Restart

**Input**: Feature specification from `specs/004-round-end-restart/spec.md`

**Feature directory**: `specs/004-round-end-restart/`

## Summary

Complete Scenario 4 by extending the room lifecycle with a `result` status between `playing` and `lobby`. The host ends the round (`playing` → `result`), freezing strokes, guesses, scores, and `secretWord`; all participants then see the revealed word via snapshot `wordDisplay`. The host restarts (`result` → `lobby`), clearing round fields while preserving participants and host. The existing **game page adapts in place** for result mode (no new route). **Lobby polling** shows a status hint during `result` but does **not** redirect to the game page; **game polling** redirects all participants to `/lobby` when status returns to `lobby` after restart.

Technical approach: add `result` to `RoomStatus`; implement `endRound` and `restartGame` in `roomStore`; add `POST /rooms/:code/end` and `POST /rooms/:code/restart`; extend `toRoomSnapshot` for result fields; gate gameplay mutations with existing `assertPlaying`; extend `resolveHostTransfer` for `result` status; wire host **End Round** / **Restart** buttons on `GamePage`; update `useGamePolling` and `useLobbyPolling` navigation rules; add lobby result hint on `LobbyPage`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **TypeScript-First**: Changes stay in typed TS/ESM in `backend/` and `frontend/`
- [x] **REST + Zod**: Two new mutation endpoints + extended snapshot; all payloads Zod-validated
- [x] **React + Vite patterns**: Extend `RoomStore`, polling hooks, `GamePage`, `LobbyPage`; no new state libraries
- [x] **HTTP polling only**: Result/restart sync via `GET /rooms/:code` (~2000ms); mutations via POST only
- [x] **In-memory only**: `result` status and frozen round fields on `Room` in `roomStore` Map only
- [x] **Brownfield scope**: Builds on Scenarios 1–3; host-only server enforcement; no multi-round rotation

**Post-design re-check**: `endRound`/`restartGame` host-only server-side. `secretWord` revealed to all only when `status === "result"` via `wordDisplay`. Gameplay POSTs rejected in `result` via `assertPlaying`. Join blocked in `result` (existing non-lobby guard). No WebSockets or new deps.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | HTTP polling via REST (`GET /rooms/:code`, etc.) |
| Storage | In-memory services in `backend/src/services/`; client session in `localStorage` |

## Architecture

### Data Flow

1. **End round (host)**: Host clicks **End Round** on game page → `POST /rooms/:code/end` with `{ participantId }` → server verifies host + `playing` → `room.status = "result"` (round fields unchanged, frozen) → returns snapshot with `wordDisplay = secretWord` for all viewers, plus `strokes`, `guesses`, `scores`.
2. **Result sync (all on game page)**: `useGamePolling` (~2s) → snapshot `status === "result"` → `GamePage` renders result mode: revealed word, read-only canvas replay, scoreboard/history, hidden draw/guess controls; host sees **Restart** in button row.
3. **Exit Game during result**: Non-host navigates locally to `/lobby` → `useLobbyPolling` continues → snapshot `status === "result"` → lobby shows roster + hint “Round ended — waiting for host to restart”; **no** redirect to `/game`.
4. **Gameplay freeze**: Any stroke/guess/clear POST while `result` → `assertPlaying` throws `NOT_PLAYING` (409).
5. **Restart (host)**: Host clicks **Restart** → `POST /rooms/:code/restart` → server verifies host + `result` → clear `drawerId`, `secretWord`, `strokes`, `guesses`, `scores`; `status = "lobby"` → host navigates to `/lobby` in handler (mirror `startGame`).
6. **Restart sync**: Non-hosts on game page: `useGamePolling` detects `status === "lobby"` → `navigate("/lobby")`. Participants already on lobby see hint removed and normal lobby state.
7. **Fresh start**: Host uses existing **Start Game** from lobby → `startGame` re-initializes round per Scenario 2–3 rules.

### API Contracts

See `specs/004-round-end-restart/contracts/rooms-api.md`.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/rooms/:code/end` | Host ends active round → `result` |
| `POST` | `/rooms/:code/restart` | Host restarts from `result` → `lobby` |
| `GET` | `/rooms/:code` | Extended snapshot for `result` (revealed word, frozen round data) |

### File Structure

**Backend**

| File | Change |
|------|--------|
| `backend/src/models/game.ts` | `RoomStatus` adds `"result"` |
| `backend/src/api/schemas.ts` | `endRoundSchema`, `restartGameSchema` |
| `backend/src/api/rooms.ts` | Register `/end` and `/restart` routes; map new error codes |
| `backend/src/services/roomStore.ts` | `endRound`, `restartGame`, `clearRoundState`; extend `toRoomSnapshot`, `resolveHostTransfer` for `result` |
| `backend/src/services/roomStore.test.ts` | Tests: end/restart auth, snapshot reveal, restart reset, mutation blocks in `result` |

**Frontend**

| File | Change |
|------|--------|
| `frontend/src/services/api.ts` | `status` union + `endRound`, `restartGame` |
| `frontend/src/state/roomStore.ts` | `endRound`, `restartGame` wrappers |
| `frontend/src/pages/GamePage.tsx` | Result mode UI; host End Round / Restart buttons; disable draw/guess in `result` |
| `frontend/src/pages/LobbyPage.tsx` | Result status hint; suppress start when not `lobby` |
| `frontend/src/hooks/useGamePolling.ts` | Navigate to `/lobby` when `status === "lobby"` |
| `frontend/src/hooks/useLobbyPolling.ts` | Navigate to `/game` only when `status === "playing"` (not `result`) |

## Implementation Sequence

1. **Models** — add `"result"` to `RoomStatus` (backend + frontend types).
2. **`endRound`** — host auth; `playing` → `result`; persist frozen round data.
3. **`restartGame`** — host auth; `result` → `lobby`; `clearRoundState` helper.
4. **`toRoomSnapshot`** — result branch: reveal `wordDisplay` to all; include `strokes`/`guesses`/`scores`; omit `viewerRole`/`canStartGame`.
5. **`resolveHostTransfer`** — run when `status === "result"` as well as `lobby`.
6. **API routes + Zod + error mapping** — 403 non-host, 409 wrong status.
7. **Backend tests** — end, restart, reveal, reset, blocked mutations.
8. **Frontend API + store** — `endRound`, `restartGame`.
9. **`GamePage`** — result mode layout; host controls; read-only canvas.
10. **Polling hooks** — game → lobby on restart; lobby skips redirect on `result`.
11. **`LobbyPage`** — result hint messaging.
12. **Manual validation** — two-browser script in `quickstart.md`.

## Dependencies

No new npm packages. Builds on Scenarios 1–3 (`roomStore`, `GamePage`, `useGamePolling`, `useLobbyPolling`, gameplay fields).

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Lobby auto-redirects to game during `result` | `useLobbyPolling` only navigates on `playing`, not `result` |
| Non-host stuck on game page after restart | `useGamePolling` navigates to `/lobby` when `status === "lobby"` |
| Host forgets to navigate after restart | Host handler calls `navigate("/lobby")` after successful `restartGame` |
| Gameplay API mutates result state | `assertPlaying` rejects `result` |
| Join allowed during `result` | Existing `joinRoom` non-lobby guard blocks |
| Host disconnect during `result` | Extend `resolveHostTransfer` to `result` status |
| `startGame` called without restart | `startGame` requires `lobby`; restart must run first |

## Related Artifacts

- `specs/004-round-end-restart/research.md` — design decisions
- `specs/004-round-end-restart/data-model.md` — entity extensions
- `specs/004-round-end-restart/contracts/rooms-api.md` — REST contract delta
- `specs/004-round-end-restart/quickstart.md` — manual test script
- `specs/003-gameplay-interaction/` — prerequisite gameplay fields
