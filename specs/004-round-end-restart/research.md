# Research: Round End, Result & Restart

**Feature**: `specs/004-round-end-restart` (spec: `specs/004-round-end-restart/spec.md`)  
**Date**: 2026-06-06  
**Builds on**: `specs/003-gameplay-interaction`

## 1. Room status value

**Decision**: Add `"result"` to `RoomStatus`: `"lobby" | "playing" | "result"`.

**Rationale**: Spec data requirements define explicit lifecycle between play and lobby return; distinct from `playing` enables snapshot rules (reveal word, freeze mutations) without overloading `playing`.

**Alternatives considered**:
- *Boolean `roundEnded` on `playing` room*: Ambiguous for join guards and polling navigation; rejected.
- *Separate result route with client-only state*: Violates server-authoritative status from clarifications; rejected.

## 2. Round end mechanism

**Decision**: Host-only `POST /rooms/:code/end` transitions `playing` → `result` without mutating round data.

**Rationale**: Clarification session: manual host end; consistent with host-only `start`; one action per success criteria.

**Alternatives considered**:
- *Auto-end on first correct guess*: Out of scope per spec.
- *Timer-based end*: Out of scope per spec.

## 3. Word visibility in result

**Decision**: `toRoomSnapshot` sets `wordDisplay = room.secretWord` for **all** viewers when `status === "result"`.

**Rationale**: Spec requires every participant see actual secret word; server controls reveal timing.

**Alternatives considered**:
- *New `revealedWord` field*: Redundant with `wordDisplay` convention; reuse existing field.

## 4. Result UI presentation

**Decision**: Same `/game` route; `GamePage` branches on `room.status === "result"` — hide draw/guess controls, canvas read-only, host **Restart** in button row.

**Rationale**: Clarification Q1 answer B; reuses `Scoreboard`, `ResultPanel`, `DrawingCanvas` view mode.

**Alternatives considered**:
- *Dedicated `/result` route*: Rejected in clarification.

## 5. Restart reset scope

**Decision**: `restartGame` clears `drawerId`, `secretWord`, `strokes`, `guesses`, `scores`; preserves `participants`, host flags, `code`.

**Rationale**: Spec “round state cleared, players preserved”; `startGame` re-initializes gameplay on next start.

**Alternatives considered**:
- *Soft reset keeping history for lobby display*: Violates “no guess history shown” after restart.

## 6. Polling navigation rules

**Decision**:
- `useLobbyPolling`: redirect to `/game` **only** when `status === "playing"`.
- `useGamePolling`: redirect to `/lobby` when `status === "lobby"`.
- No lobby → game redirect when `status === "result"`.

**Rationale**: Clarifications Q2 (Exit Game stays on lobby) and Q3 (lobby hint during result).

**Alternatives considered**:
- *Lobby redirects to game on `result`*: Conflicts with Exit Game behavior.

## 7. Host controls placement

**Decision**: Game page button row — **End Round** when `playing` + host; **Restart** when `result` + host.

**Rationale**: Clarification Q4 answer A; mirrors existing **Exit Game** button row on `GamePage`.

## 8. Host transfer during result

**Decision**: Extend `resolveHostTransfer` to run when `room.status === "result"` (same join-order rules as lobby).

**Rationale**: Spec edge case: host disconnect during result; new host may restart.

**Alternatives considered**:
- *Freeze host until reconnect*: Blocks restart if host leaves; rejected.

## 9. Gameplay mutation guard in result

**Decision**: Reuse `assertPlaying` (status must be exactly `"playing"`); strokes/guesses/clear return 409 in `result`.

**Rationale**: Minimal change; `result` is not `playing`, so existing guard applies.

## 10. Join policy during result

**Decision**: No change to `joinRoom` — `room.status !== "lobby"` already rejects with `GAME_IN_PROGRESS`.

**Rationale**: Spec assumes join blocked once game left lobby; `result` is non-lobby.

## 11. Lobby status hint copy

**Decision**: Fixed string: `Round ended — waiting for host to restart` when `room.status === "result"`.

**Rationale**: Clarification Q3 example text; testable and unambiguous.
