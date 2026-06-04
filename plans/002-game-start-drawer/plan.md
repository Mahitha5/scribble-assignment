# Implementation Plan: Game Start & Drawer Flow

**Input**: Feature specification from `specs/002-game-start-drawer/spec.md`

**Plan directory**: `plans/002-game-start-drawer/` (matches `specs/002-game-start-drawer/`)

**Status**: Planned (2026-06-04). Builds on implemented `001-room-management`. Execute via `tasks/002-game-start-drawer/tasks.md`.

**Spec traceability**: FR-001–FR-013 (names at start, start gates, lobby→game transition, drawer/guesser roles, deterministic word, drawer-only `secretWord` in snapshots, atomic start, game polling).

**Dependency**: `specs/001-room-management` — create/join/lobby poll, host-only `POST /rooms/:code/start`, as-is names (no trim, no `playerN` defaults, duplicates allowed).

## Summary

When the host starts from the lobby, the backend atomically activates the first round: `status: "active"`, `drawerId = hostId`, deterministic `secretWord` from room code only, per-participant `role` in snapshots. `GET /rooms/:code?participantId=` returns **viewer-specific** snapshots: drawer responses include `secretWord`; guesser responses **omit** the field entirely. Clients with a session auto-navigate to `/game` on poll when phase is active (lobby and off-lobby routes); `GamePage` polls ~2s to keep roles in sync. Display names are unchanged from lobby (no trim, no server defaults).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial & post-design (PASSED):**

- [x] **TypeScript-First**: Extend `backend/src/models/game.ts`, `frontend/src/services/api.ts`
- [x] **REST + Zod**: Reuse `POST /rooms/:code/start`, `GET /rooms/:code`; no new transport
- [x] **React + Vite patterns**: Extend `roomStore.ts`, `LobbyPage.tsx`, `GamePage.tsx`; no new libraries
- [x] **HTTP polling only**: Lobby + game poll loops (~2s, backoff on failure)
- [x] **In-memory only**: Round state on existing `Room` in `roomStore.ts`
- [x] **Brownfield scope**: Extend 001 start (today only sets `status: "active"`)

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript |
| Sync | HTTP polling `GET /rooms/:code?participantId=` (~2s) |
| Storage | In-memory `backend/src/services/roomStore.ts` |
| Vocabulary | `backend/src/seed/starterData.ts` — `STARTER_WORDS` (5 words) |

## Architecture

### Data Flow

```
LobbyPage (host) → POST /rooms/:code/start { participantId }
                → startGame(): active + drawerId + secretWord + roles (atomic)
                → navigate /game (host)

LobbyPage (all)  → poll GET /rooms/:code?participantId=
                → status === "active" → navigate /game (guest, ~2–3s)

GamePage         → poll GET /rooms/:code?participantId= (~2s, backoff)
                → drawer: snapshot includes secretWord
                → guesser: snapshot omits secretWord
```

### Player naming at start (inherits 001)

| Rule | Behavior |
|------|----------|
| Storage | `participant.name` unchanged at `startGame()` |
| Omitted / empty | Allowed; start not blocked |
| Whitespace | Preserved (`"   "`, `"  Ali  "`) |
| Duplicates | Allowed; identify drawer by `role` / `participantId`, not name |

Implementation: no rename at start; use existing names from lobby. Optional fields use `name ?? ""` only (no trim, no `playerN` defaults).

### Deterministic word (FR-008, FR-009)

```typescript
// room code ONLY — ignore participants and join order
function pickSecretWordForRoomCode(code: string): string {
  let sum = 0;
  for (const char of code) {
    sum += char.charCodeAt(0);
  }
  return STARTER_WORDS[sum % STARTER_WORDS.length]!;
}
```

Document golden examples in `research.md` and unit tests.

### Per-viewer snapshot (FR-010, FR-011)

| Viewer | `secretWord` in JSON | `availableWords` when active |
|--------|----------------------|------------------------------|
| Drawer (`participantId === drawerId`) | Present | Omit or empty (do not leak full list to guessers) |
| Guesser | **Property absent** | Omit |
| Lobby (`status: "lobby"`) | N/A | May list vocabulary for future UI (optional) |

### API Contracts (delta from 001)

| Method | Endpoint | Change for 002 |
|--------|----------|----------------|
| `POST` | `/rooms/:code/start` | Response `room` includes `drawerId`, per-participant `role`, conditional `secretWord` for host/drawer viewer |
| `GET` | `/rooms/:code?participantId=` | Same viewer-specific shaping on every poll |

**RoomSnapshot (active):** `drawerId`, `participants[].role`, optional `secretWord` (drawer viewer only).

Detail: `plans/002-game-start-drawer/contracts/api-endpoints.md`, `contracts/frontend-store.md`.

### File Structure

**Backend**

- `backend/src/models/game.ts` — add `drawerId`, `secretWord` on `Room`; `role` on `ParticipantSnapshot`; optional `secretWord` on `RoomSnapshot`
- `backend/src/services/roomStore.ts` — `pickSecretWordForRoomCode`, extend `startGame`, `toRoomSnapshot(room, viewerParticipantId)`
- `backend/src/api/rooms.ts` — pass viewer id into all `toRoomSnapshot` calls
- `backend/src/services/roomStore.test.ts` — determinism, roles, guesser omission (10 polls)

**Frontend**

- `frontend/src/services/api.ts` — mirror snapshot types
- `frontend/src/state/roomStore.ts` — `useViewerRole`, session redirect helper
- `frontend/src/pages/LobbyPage.tsx` — verify auto-nav; redirect if already `active` on mount
- `frontend/src/pages/GamePage.tsx` — poll loop, drawer word panel, guesser placeholder, role labels
- `frontend/src/routes/index.tsx` or `RoomStoreProvider` — optional global `active` → `/game` redirect (edge case: not on lobby)

## Implementation Sequence

1. Models + `pickSecretWordForRoomCode` + tests
2. `startGame()` atomic active round (drawer, word, roles)
3. `toRoomSnapshot()` viewer-specific `secretWord` + gate `availableWords` when active
4. Frontend types + `useViewerRole`
5. `GamePage` UI + polling
6. Lobby auto-nav hardening + off-lobby redirect
7. README Scenario 2 + manual two-tab validation

## Testing Strategy

| Layer | Command | Focus |
|-------|---------|--------|
| Backend | `cd backend && npm test` | Word determinism, host→drawer, guesser JSON omits `secretWord`, 10 poll cycles, names unchanged |
| Frontend | `cd frontend && npm run build` | Types align with conditional `secretWord` |
| Manual | Two tabs | Drawer sees word; guesser never; guest auto-nav; same code → same word |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `availableWords` leaks vocabulary to guessers | Omit on active snapshots (T022) |
| Client-side-only word hiding | Server omits `secretWord` for guessers (FR-011) |
| Host transfer before start | `drawerId = room.hostId` at start time, not creator id |
| Partial state on start | Single atomic `startGame()` mutation (FR-013) |
| Guest stuck on lobby | Poll `status === "active"` → `navigate("/game")` |

## Phase Artifacts

| Artifact | Path |
|----------|------|
| Research | `plans/002-game-start-drawer/research.md` |
| Data model | `plans/002-game-start-drawer/data-model.md` |
| API contract | `plans/002-game-start-drawer/contracts/api-endpoints.md` |
| Store contract | `plans/002-game-start-drawer/contracts/frontend-store.md` |
| Quickstart | `plans/002-game-start-drawer/quickstart.md` |
| Tasks | `tasks/002-game-start-drawer/tasks.md` |

## Dependencies

No new npm packages. Reuses `STARTER_WORDS` / `STARTER_ROLES` from `backend/src/seed/starterData.ts`.

## Out of Scope (this feature)

Canvas drawing, guesses, scoring, result screen, drawer rotation, timers, custom word packs, auth, persistence, WebSockets (see `specs/002-game-start-drawer/spec.md`).
