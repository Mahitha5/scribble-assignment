# REST Contract: Rooms API (Scenario 3 delta)

**Base URL**: `http://localhost:3001`  
**Content-Type**: `application/json`  
**Prerequisite**: `plans/002-game-start-drawer/contracts/rooms-api.md`

This document describes **changes** for Gameplay Interaction. Endpoints not listed here behave as in Scenarios 1–2.

## Shared types (extended)

```typescript
interface Point {
  x: number; // 0–1 normalized
  y: number; // 0–1 normalized
}

interface StrokeSegment {
  id: string;
  points: Point[];
  color: string;
  lineWidth: number;
}

interface GuessView {
  id: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  scoredPoints: number;
  submittedAt: string;
}

interface ParticipantScore {
  participantId: string;
  playerName: string;
  score: number;
}

interface RoomSnapshot {
  // ... Scenario 1–2 fields ...
  strokes?: StrokeSegment[];      // when status === "playing"
  guesses?: GuessView[];          // when status === "playing"
  scores?: ParticipantScore[];    // when status === "playing"
}
```

**Security rule**: `secretWord` remains server-only. Guess correctness is computed server-side; clients display `isCorrect` from snapshot.

---

## POST /rooms/:code/start (enhanced initialization)

Unchanged request. On **200**, server additionally initializes:

- `strokes: []`
- `guesses: []`
- `scores`: every participant at `0`

Response includes empty `strokes`/`guesses` and zeroed `scores` when `status === "playing"`.

---

## POST /rooms/:code/strokes

Drawer appends one completed stroke segment.

**Path param**: `code` — 4-char alphanumeric (unchanged).

**Request body**

```json
{
  "participantId": "drawer-uuid",
  "stroke": {
    "points": [
      { "x": 0.1, "y": 0.2 },
      { "x": 0.15, "y": 0.25 }
    ],
    "color": "#000000",
    "lineWidth": 4
  }
}
```

**Processing**

1. Verify room exists, `status === "playing"`.
2. Verify `participantId === drawerId`.
3. Validate `stroke.points.length >= 2` and coordinates in `[0, 1]`.
4. Assign `stroke.id` (server-generated UUID if omitted).
5. Append to `room.strokes`.

**Response 200**

```json
{
  "room": {
    "status": "playing",
    "strokes": [ "...existing...", { "id": "...", "points": [...], "color": "#000000", "lineWidth": 4 } ],
    "guesses": [],
    "scores": [ { "participantId": "...", "playerName": "Host", "score": 0 } ]
  }
}
```

**Errors**

| Status | When | Message (pattern) |
|--------|------|-------------------|
| 400 | Invalid stroke payload | `Invalid stroke` |
| 403 | Caller is not drawer | `Only the drawer can update the canvas` |
| 404 | Room/participant not found | `Unable to load room` |
| 409 | Not playing | `Game is not in progress` |

---

## POST /rooms/:code/canvas/clear

Drawer clears all strokes.

**Request body**

```json
{ "participantId": "drawer-uuid" }
```

**Processing**

1. Same auth as stroke append (drawer only, `playing`).
2. Set `room.strokes = []`.

**Response 200**: Snapshot with `strokes: []`; guesses/scores unchanged.

**Errors**: Same role/status codes as stroke append.

---

## POST /rooms/:code/guesses

Guesser submits a text guess.

**Request body**

```json
{
  "participantId": "guesser-uuid",
  "text": "  Rocket  "
}
```

**Processing**

1. Verify room `playing`; participant exists.
2. Reject if `participantId === drawerId` → **403**.
3. `trimmed = text.trim()`; if empty → **400**.
4. `isCorrect = trimmed.toLowerCase() === secretWord.toLowerCase()`.
5. `scoredPoints = 100` if `isCorrect` and participant has no prior guess with `scoredPoints === 100`; else `0`.
6. Update `scores[participantId] += scoredPoints`.
7. Append `GuessView` entry with trimmed text.

**Response 200**

```json
{
  "room": {
    "guesses": [
      {
        "id": "...",
        "playerName": "Guest",
        "text": "Rocket",
        "isCorrect": true,
        "scoredPoints": 100,
        "submittedAt": "2026-06-05T12:00:00.000Z"
      }
    ],
    "scores": [
      { "participantId": "guest-uuid", "playerName": "Guest", "score": 100 }
    ]
  }
}
```

**Errors**

| Status | When | Message (pattern) |
|--------|------|-------------------|
| 400 | Empty after trim | `Guess cannot be empty` |
| 403 | Drawer guesses | `The drawer cannot submit guesses` |
| 404 | Room/participant not found | `Unable to load room` |
| 409 | Not playing | `Game is not in progress` |

---

## GET /rooms/:code (enhanced playing snapshot)

Unchanged query: `?participantId=` for heartbeat and viewer fields.

**Response 200 (playing)** — adds gameplay fields:

```json
{
  "room": {
    "status": "playing",
    "drawerId": "host-uuid",
    "viewerRole": "guesser",
    "wordDisplay": "Guess word",
    "strokes": [
      {
        "id": "stroke-1",
        "points": [{ "x": 0.2, "y": 0.3 }, { "x": 0.4, "y": 0.5 }],
        "color": "#000000",
        "lineWidth": 4
      }
    ],
    "guesses": [
      {
        "id": "guess-1",
        "playerName": "Guest",
        "text": "pizza",
        "isCorrect": false,
        "scoredPoints": 0,
        "submittedAt": "..."
      }
    ],
    "scores": [
      { "participantId": "host-uuid", "playerName": "Host", "score": 0 },
      { "participantId": "guest-uuid", "playerName": "Guest", "score": 0 }
    ]
  }
}
```

Lobby responses omit `strokes`, `guesses`, `scores`.

---

## Polling contract (client behavior)

| Screen | Interval | Action |
|--------|----------|--------|
| `/game` | 2000ms | Poll snapshot; replay `strokes` on canvas; refresh `guesses` + `scores` |

**Drawer local behavior**: Render in-progress stroke immediately; POST completed stroke; poll may replay same stroke (idempotent visually).

**Guesser**: Read-only canvas; updates within ~2s of drawer stroke append or clear.

---

## Scoring reference

```text
trimmed = guess.text.trim()
isCorrect = trimmed.toLowerCase() === secretWord.toLowerCase()
alreadyScoredCorrect = guesses.any(g => g.participantId === id && g.scoredPoints === 100)
scoredPoints = isCorrect && !alreadyScoredCorrect ? 100 : 0
```
