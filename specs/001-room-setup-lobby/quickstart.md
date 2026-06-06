# Quickstart: Validate Room Setup & Lobby

Manual validation script for Scenario 1 after implementation.

## Prerequisites

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Confirm `GET http://localhost:3001/health` → `{ "ok": true }`.

## Test 1 — Create room as host

1. Open Tab A → Start → Create Room → name `Host` → submit.
2. **Expect**: Lobby shows room code, `Host` listed with host indicator, Start disabled (1 player).

## Test 2 — Join valid code

1. Tab B → Join Room → name `Guest`, enter code from Tab A → submit.
2. **Expect**: Tab B enters lobby; within ~2s Tab A shows 2 participants; Tab B has no Start button.

## Test 3 — Join validation errors

| Action | Expect |
|--------|--------|
| Empty code | Message: room code required |
| `AB` (too short) | Invalid format message |
| `ABCD` (nonexistent) | Room not found |
| Tab A code in lowercase (e.g. `abcd` vs displayed `ABCD`) | Join succeeds |
| Join Tab A code as name `Guest` again | Choose a different name |
| Second join omitting name when first player also omitted name | Choose a different name |
| Second join with `"  "` when first player also entered `"  "` | Choose a different name |
| After host starts, new join attempt | Game already in progress |

## Test 4 — Host-only start

1. Tab A (host) with 2+ players → Start Game.
2. **Expect**: Both tabs navigate to `/game` within ~2s; room status no longer lobby.

## Test 5 — Non-host cannot start

1. Fresh room with 2 players; Tab B (non-host) has no Start control.
2. **Expect**: Direct API `POST /rooms/:code/start` with guest `participantId` returns 403.

## Test 6 — Room isolation

1. Tab A creates Room 1; Tab C creates Room 2.
2. Join each with different codes.
3. **Expect**: Participant lists never mix; codes differ.

## Test 7 — Host refresh

1. Host refreshes browser on lobby with 2 players.
2. **Expect**: Returns to same room as host; participant count unchanged.

## Test 8 — Host disconnect transfer

1. Room with 3 players: Host, P2, P3.
2. Close host tab; wait ~6–8 seconds; poll on P2 tab.
3. **Expect**: P2 marked host; can Start when ≥2 remain.
4. Reopen host tab (stored session intact); wait for poll.
5. **Expect**: Original host listed as non-host; P2 remains host.

## Test 9 — Inactive room eviction

1. Tab A creates a room alone (no other players).
2. Close Tab A; wait **≥8 seconds** (all participants stale).
3. Tab B attempts to join the same code.
4. **Expect**: Join fails with room not found; server no longer holds the room in memory.

Optional: Tab A reopens with stored session after eviction → poll returns 404 → redirected to start/join; session cleared.

## Build check

```bash
cd backend && npm run build
cd frontend && npm run build
```

Both must succeed before checkpoint sign-off.
