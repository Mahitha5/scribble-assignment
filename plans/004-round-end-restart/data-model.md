# Data Model: Round End, Result & Restart

**Feature**: `plans/004-round-end-restart` (spec: `specs/004-round-end-restart/spec.md`)  
**Prerequisite**: `plans/003-gameplay-interaction/data-model.md`

## Entity Relationship

```text
Room.status: lobby | playing | result

playing ──host endRound──► result (round data frozen)
result  ──host restart───► lobby   (round data cleared, participants preserved)
lobby   ──host startGame─► playing  (unchanged from 002–003)
```

## Room (extended)

| Field | Type | Notes |
|-------|------|-------|
| `status` | `"lobby" \| "playing" \| "result"` | **Extended** — `result` added |
| `drawerId` | `string \| undefined` | Set in `playing`; cleared on `restartGame` |
| `secretWord` | `string \| undefined` | Set in `playing`; revealed in snapshot when `result`; cleared on restart |
| `strokes` | `StrokeSegment[]` | Active in `playing`; frozen in `result`; cleared on restart |
| `guesses` | `GuessEntry[]` | Active in `playing`; frozen in `result`; cleared on restart |
| `scores` | `Record<string, number>` | Active in `playing`; frozen in `result`; cleared on restart |
| Other fields | — | Unchanged from 001–003 |

### State transitions

```text
playing
  └── endRound (host)
        └── status = "result"
              (strokes, guesses, scores, secretWord, drawerId unchanged)

result
  └── restartGame (host)
        ├── status = "lobby"
        ├── drawerId = undefined
        ├── secretWord = undefined
        ├── strokes = undefined (or [])
        ├── guesses = undefined (or [])
        └── scores = undefined (or {})

lobby
  └── startGame (host) — unchanged
        └── status = "playing", initializeGameplayState(...)
```

## RoomSnapshot (extended)

| Field | When `lobby` | When `playing` | When `result` |
|-------|--------------|----------------|---------------|
| `status` | `"lobby"` | `"playing"` | `"result"` |
| `wordDisplay` | `undefined` | drawer: secret; guesser: `"Guess word"` | **secretWord for all** |
| `drawerId` | `undefined` | set | set (for “who drew” display) |
| `viewerRole` | `undefined` | `drawer` \| `guesser` | `undefined` |
| `strokes` | `undefined` | live list | frozen final list |
| `guesses` | `undefined` | live list | frozen final list |
| `scores` | `undefined` | live scores | frozen final scores |
| `canStartGame` | host + ≥2 players | `false` | `false` |

### Snapshot rules

| Rule | Enforcement |
|------|-------------|
| Reveal word | `wordDisplay = secretWord` for every viewer when `status === "result"` |
| Freeze data | No server mutations to strokes/guesses/scores in `result` except host transfer |
| Lobby fields after restart | No round fields in snapshot when `status === "lobby"` |

## Service functions (new)

### `endRound(code, participantId)`

| Check | Error |
|-------|-------|
| Room exists | `ROOM_NOT_FOUND` 404 |
| `status === "playing"` | `NOT_PLAYING` 409 |
| Participant is host | `NOT_HOST` 403 |

**Effect**: `room.status = "result"`; round fields unchanged.

### `restartGame(code, participantId)`

| Check | Error |
|-------|-------|
| Room exists | `ROOM_NOT_FOUND` 404 |
| `status === "result"` | `NOT_IN_RESULT` 409 (new code) |
| Participant is host | `NOT_HOST` 403 |

**Effect**: `clearRoundState(room)`; `room.status = "lobby"`.

### `clearRoundState(room)` (internal)

Deletes or resets: `drawerId`, `secretWord`, `strokes`, `guesses`, `scores`.

## Error domain mapping (new)

| Condition | HTTP | Message (example) |
|-----------|------|-------------------|
| End when not `playing` | 409 | `Game is not in progress` |
| Restart when not `result` | 409 | `Round has not ended` |
| Non-host end/restart | 403 | `Only the host can …` |
| Stroke/guess/clear in `result` | 409 | `Game is not in progress` |

## Host transfer (extended)

`resolveHostTransfer(room)` runs when `status === "lobby"` **or** `status === "result"` (previously lobby-only).

## Out of scope (no model fields)

- Cumulative session scores across restarts
- Round counter / drawer rotation
- Persisted result archives
