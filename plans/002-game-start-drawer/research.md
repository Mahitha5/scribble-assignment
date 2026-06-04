# Research: Game Start & Drawer Flow

## Per-Viewer Room Snapshots (Server-Side Word Privacy)

**Decision**: `toRoomSnapshot(room, viewerParticipantId)` includes `secretWord` only when `viewerParticipantId === room.drawerId` and `status === "active"`. For guessers, omit the property from the serialized object (not `null`, not `""`).

**Rationale**:
- FR-011 requires server-side omission on every poll; CSS-only hiding is insufficient
- JSON consumers cannot accidentally log the word from shared state
- Same endpoint (`GET /rooms/:code`) serves lobby and game with viewer query param

**Alternatives considered**:
- Separate `/rooms/:code/drawer` endpoint — rejected (extra surface, easier to misconfigure)
- Encrypt word client-side — rejected (violates lab scope, guessers could still decrypt with shared key)
- Single shared snapshot + UI hide — rejected by spec clarification

---

## Deterministic Word from Room Code Only

**Decision**: `index = (sum of Unicode code units in room `code`) % STARTER_WORDS.length`.

**Rationale**:
- Stable for a given code across sessions (in-memory reset does not change algorithm)
- Ignores participant list and join order per clarification 2026-06-04
- Simple to test with golden vectors
- Uses existing five-word `STARTER_WORDS` array

**Golden vectors** (verify in unit tests):

| Room code | Sum (example) | Index mod 5 | Word |
|-----------|---------------|-------------|------|
| `ABCD` | 266 | 1 | `pizza` |
| `ZZZZ` | 364 | 4 | `sunflower` |

(Implement tests with actual computed values from the function, not hand-waved sums.)

**Alternatives considered**:
- `crypto.createHash(code)` — heavier, opaque for learners
- Random per start — violates FR-009
- Include participant count in hash — rejected by spec

---

## Drawer = Current Host at Start

**Decision**: On successful `startGame`, set `drawerId = room.hostId` (not “original creator” if host transferred).

**Rationale**:
- Matches FR-005 and edge case: host transfer before start
- US2 independent test should reference current host, not creator

**Alternatives considered**:
- Always first joiner as drawer — conflicts with spec
- Random drawer — out of scope

---

## Atomic Start Transition

**Decision**: One synchronous mutation in `startGame`: validate gates → set `status`, `drawerId`, `secretWord`, `updatedAt` → return snapshot. No multi-step partial room visible to pollers.

**Rationale**: FR-013; pollers must not see `active` without roles/word ready on server.

---

## Lobby and Game Polling

**Decision**: Reuse 001 patterns — 2s base interval, exponential backoff to 30s max on failure, reset on success. Lobby navigates to `/game` when `status === "active"`. Game page runs its own poll loop for FR-012.

**Rationale**: Constitution HTTP polling; 001 `LobbyPage` already implements auto-nav for `active`.

**Off-lobby navigation**: When a client holds a session and polls from any route, if `room.status === "active"`, navigate to `/game` (e.g. effect in `RoomStoreProvider` or shared hook).

**Alternatives considered**:
- WebSocket push on start — forbidden
- Host-only manual “Enter game” — rejected by FR-004

---

## `availableWords` on Active Snapshots

**Decision**: When `status === "active"`, omit `availableWords` from snapshot (or return `[]`) so guessers cannot infer the word from the full starter list.

**Rationale**: FR-010/FR-011; listing five words enables elimination attacks without seeing `secretWord`.

**Lobby**: May continue returning full list while `status === "lobby"` if useful for future UI; not required for 002 MVP.

---

## Name Preservation at Start

**Decision**: Do not touch `participant.name` in `startGame`. No trim, no `player1`/`player2` defaults. Inherited from 001 FR-016/FR-017.

**Rationale**: FR-001, FR-002; 002 only adds round metadata.

**Note**: Avoid dedicated `storePlayerNameAsIs()` unless the team wants a labeled choke point; `name ?? ""` at create/join is sufficient per product preference.
