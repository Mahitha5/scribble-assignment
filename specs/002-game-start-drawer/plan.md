# Implementation Plan: Game Start & Drawer Flow

**Input**: Feature specification from `specs/002-game-start-drawer/spec.md`

**Feature directory**: `specs/002-game-start-drawer/`

## Summary

Extend Scenario 1’s `playing` transition into a full first-round game-start slice: validate and trim participant names at start (reject empty/whitespace-only and trim-colliding duplicates with named errors), assign the current host as drawer, deterministically select the secret word via `(sum of uppercase room-code char codes) mod 5`, and expose a **role-specific** room snapshot so only the drawer receives the real word while guessers always see `Guess word`. Reuse `GET /rooms/:code` polling on the game screen (~2s) for sync and session restore.

Technical approach: add `drawerId` and `secretWord` to in-memory `Room`; enhance `startGame` in `roomStore`; extend `RoomSnapshot` with `drawerId`, `viewerRole`, `wordDisplay`, and trimmed participant names after start; update `GamePage` with drawer identification, word area, and `useGamePolling`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **TypeScript-First**: Changes stay in typed TS/ESM in `backend/` and `frontend/`
- [x] **REST + Zod**: Extend existing `POST /rooms/:code/start` and `GET /rooms/:code` with Zod-validated snapshot fields; no new transport
- [x] **React + Vite patterns**: Extend `RoomStore`, hooks, and `GamePage`; no new state libraries
- [x] **HTTP polling only**: Game sync via same `GET /rooms/:code?participantId=` interval (~2000ms)
- [x] **In-memory only**: `drawerId` and `secretWord` live on `Room` in `roomStore` Map only
- [x] **Brownfield scope**: Builds on 001 implementation; deterministic word rule per constitution V

**Post-design re-check**: Secret word never included in guesser responses. Host-only start and name rules enforced server-side. No kick/moderation, no extra rounds, no canvas/guess logic in this slice.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | HTTP polling via REST (`GET /rooms/:code`, etc.) |
| Storage | In-memory services in `backend/src/services/`; client session in `localStorage` |

## Architecture

### Data Flow

1. **Start game (enhanced)**: Host clicks Start → `POST /rooms/:code/start` with `participantId` → server verifies host, ≥2 players, lobby status → **trim + validate names** (non-empty, unique case-insensitive) → on failure return **400** naming offenders → on success: persist trimmed names, set `drawerId` to host participant id, compute `secretWord` from room code, set `status: "playing"` → return role-specific snapshot → host navigates to `/game`.
2. **Lobby → game (non-host)**: Existing lobby poll detects `status === "playing"` → navigate `/game` (unchanged from 001).
3. **Game poll**: `GamePage` mounts `useGamePolling` (2000ms) → `GET /rooms/:code?participantId=` → server returns snapshot with `drawerId`, `viewerRole`, `wordDisplay` (`secretWord` for drawer, `"Guess word"` for guessers), trimmed participant names → UI updates drawer badge and word area.
4. **Session restore on game**: Hydrated session + direct `/game` URL → initial `fetchRoom` loads playing snapshot; poll keeps word visibility correct per role.
5. **Start rejection**: Invalid/duplicate names leave room in `lobby`; host sees API error message listing offender display names (as stored in lobby); no `drawerId` or `secretWord` assigned.

### API Contracts

See `specs/002-game-start-drawer/contracts/rooms-api.md` for extended request/response shapes and new start errors.

Changed behavior:

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/rooms/:code/start` | Name validation, drawer/word assignment, new 400 errors |
| `GET` | `/rooms/:code` | Playing snapshot adds `drawerId`, `viewerRole`, `wordDisplay` |

### File Structure

**Backend**

| File | Change |
|------|--------|
| `backend/src/models/game.ts` | Add `drawerId`, `secretWord` on `Room`; extend `RoomSnapshot` with `drawerId`, `viewerRole`, `wordDisplay` |
| `backend/src/services/roomStore.ts` | `trimDisplayName`, `validateNamesForStart`, `selectSecretWord`, enhanced `startGame`, role-aware `toRoomSnapshot` |
| `backend/src/services/roomStore.test.ts` | Tests: name trim/reject, duplicate trim collision, word determinism, drawer-only word in snapshot |
| `backend/src/api/rooms.ts` | Map new `RoomStoreError` codes to 400 responses |

**Frontend**

| File | Change |
|------|--------|
| `frontend/src/services/api.ts` | Extend `RoomSnapshot` type with game fields |
| `frontend/src/state/roomStore.ts` | No new methods; consumes extended snapshot |
| `frontend/src/hooks/useGamePolling.ts` | New: 2000ms poll on game screen, 404 handling |
| `frontend/src/pages/GamePage.tsx` | Drawer identification, word display, role-aware UI, poll hook |
| `frontend/src/pages/LobbyPage.tsx` | Start errors already surfaced; verify named messages display |

**Optional extract**

| File | Change |
|------|--------|
| `backend/src/services/wordSelection.ts` | Pure `selectSecretWord(code)` if keeping `roomStore` lean |

## Implementation Sequence

1. **Pure helpers** — `trimDisplayName`, `validateNamesForStart` (returns offender lists), `selectSecretWord(code)`.
2. **Models** — `Room.drawerId`, `Room.secretWord`; snapshot fields `drawerId`, `viewerRole`, `wordDisplay`.
3. **`startGame` enhancement** — validate → trim persist → assign drawer (current host) → select word → `playing`.
4. **`toRoomSnapshot` role filter** — never put raw `secretWord` on guesser view; expose `wordDisplay` only.
5. **API error mapping** — `INVALID_PLAYER_NAMES`, `DUPLICATE_PLAYER_NAMES` → 400 with named messages.
6. **Backend tests** — determinism, visibility, rejection paths.
7. **Frontend types** — align `api.ts` with snapshot.
8. **`useGamePolling` + `GamePage`** — drawer badge, word area, scores-at-zero placeholder, poll loop.
9. **Manual validation** — two-browser flow per `quickstart.md`.

## Dependencies

No new npm packages. Builds on 001 room/lobby implementation (`002-game-start-drawer` branch).

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Secret word leaks to guessers in API | Single `wordDisplay` field computed server-side; no `secretWord` key in JSON for guessers |
| Trim collision allowed in lobby blocks at start | Documented layering; 002 error names colliding participants |
| Host not drawer after transfer | `drawerId` = participant with `isHost` at start time |
| GamePage shows stale lobby names | Names trimmed on successful start before `playing` |
| 001 contract drift | Delta documented in `contracts/rooms-api.md` |

## Related Artifacts

- `specs/002-game-start-drawer/research.md` — design decisions
- `specs/002-game-start-drawer/data-model.md` — entity extensions
- `specs/002-game-start-drawer/contracts/rooms-api.md` — REST contract delta
- `specs/002-game-start-drawer/quickstart.md` — manual test script
- `specs/001-room-setup-lobby/` — prerequisite lobby behavior
