# REST Contract: Rooms API (Scenario 4 delta)

**Base URL**: `http://localhost:3001`  
**Content-Type**: `application/json`  
**Prerequisite**: `specs/003-gameplay-interaction/contracts/rooms-api.md`

This document describes **changes** for Round End, Result & Restart. Endpoints not listed here behave as in Scenarios 1–3.

## Shared types (extended)

```typescript
type RoomStatus = "lobby" | "playing" | "result";

interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ("drawer" | "guesser")[];
  viewerParticipantId?: string;
  isViewerHost: boolean;
  canStartGame: boolean; // true only when status === "lobby" && host && participants >= 2
  drawerId?: string;     // when playing or result
  viewerRole?: "drawer" | "guesser"; // when playing only
  wordDisplay?: string;  // playing: drawer-only secret / "Guess word"; result: secret for all
  strokes?: StrokeSegment[];   // when playing or result
  guesses?: GuessView[];       // when playing or result
  scores?: ParticipantScore[]; // when playing or result
}
```

**Reveal rule**: When `status === "result"`, `wordDisplay` is the round `secretWord` for every viewer.

**Freeze rule**: When `status === "result"`, gameplay POST endpoints return **409** `Game is not in progress`.

---

## POST /rooms/:code/end

Host ends the active round.

**Path param**: `code` — 4-char alphanumeric (unchanged).

**Request body**

```json
{
  "participantId": "host-uuid"
}
```

**Success — 200**

```json
{
  "room": {
    "status": "result",
    "wordDisplay": "castle",
    "strokes": [ "..." ],
    "guesses": [ "..." ],
    "scores": [ { "participantId": "...", "playerName": "Alice", "score": 100 } ]
  }
}
```

**Errors**

| HTTP | Condition | Message (example) |
|------|-----------|-------------------|
| 403 | Non-host | `Only the host can end the round` |
| 404 | Unknown room/participant | `Unable to load room` |
| 409 | `status !== "playing"` | `Game is not in progress` |

---

## POST /rooms/:code/restart

Host returns room to lobby and clears round state.

**Path param**: `code` — 4-char alphanumeric (unchanged).

**Request body**

```json
{
  "participantId": "host-uuid"
}
```

**Success — 200**

```json
{
  "room": {
    "status": "lobby",
    "canStartGame": true,
    "drawerId": undefined,
    "wordDisplay": undefined,
    "strokes": undefined,
    "guesses": undefined,
    "scores": undefined
  }
}
```

**Errors**

| HTTP | Condition | Message (example) |
|------|-----------|-------------------|
| 403 | Non-host | `Only the host can restart the game` |
| 404 | Unknown room/participant | `Unable to load room` |
| 409 | `status !== "result"` | `Round has not ended` |

---

## GET /rooms/:code (extended snapshot)

Unchanged request. Additional response behavior:

| `status` | Snapshot includes |
|----------|-------------------|
| `lobby` | Participants, `canStartGame`; no round fields |
| `playing` | Unchanged Scenario 3 behavior |
| `result` | `wordDisplay` = secret for all; frozen `strokes`, `guesses`, `scores`; `drawerId` for display |

---

## POST /rooms/:code/join (unchanged guard)

Join still requires `status === "lobby"`. Attempts during `playing` or `result` return **409** `Game already in progress`.

---

## POST /rooms/:code/start (unchanged guard)

Start still requires `status === "lobby"`. Host must **restart** from `result` before starting a new round.

---

## Gameplay endpoints in result (blocked)

`POST /rooms/:code/strokes`, `POST /rooms/:code/canvas/clear`, `POST /rooms/:code/guesses` return **409** when `status === "result"`.

---

## Polling navigation (client contract)

| Hook | Condition | Action |
|------|-----------|--------|
| `useLobbyPolling` | `status === "playing"` | `navigate("/game")` |
| `useLobbyPolling` | `status === "result"` | Stay on lobby; show result hint |
| `useGamePolling` | `status === "lobby"` | `navigate("/lobby")` |
| `useGamePolling` | `status === "result"` | Stay on game page (result mode) |
