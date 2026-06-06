# Data Model: Gameplay Interaction

**Feature**: `specs/003-gameplay-interaction` (spec: `specs/003-gameplay-interaction/spec.md`)  
**Prerequisite**: `specs/002-game-start-drawer/data-model.md`

## Entity Relationship

```text
Room 1──* StrokeSegment   (ordered canvas strokes)
Room 1──* GuessEntry      (ordered guess history)
Room 1──* Participant
Room.scores ──► Participant.id → number (round score)
Room.drawerId ──► Participant.id (draw/clear authority)
Room.secretWord (server-only; used for guess evaluation, not sent to guessers)
```

## Room (extended)

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | Unchanged |
| `status` | `"lobby" \| "playing"` | Unchanged |
| `participants` | `Participant[]` | Unchanged |
| `drawerId` | `string \| undefined` | From 002 |
| `secretWord` | `string \| undefined` | From 002; server-only |
| `strokes` | `StrokeSegment[]` | **New** — empty at start; cleared on canvas clear |
| `guesses` | `GuessEntry[]` | **New** — append-only per valid submission |
| `scores` | `Record<string, number>` | **New** — keyed by `participantId`; init 0 at start |
| `createdAt` | `ISO string` | Unchanged |
| `updatedAt` | `ISO string` | Unchanged |

### State transitions (gameplay)

```text
playing (round start)
  ├── strokes = []
  ├── guesses = []
  └── scores[each participantId] = 0

playing + drawer completes stroke
  └── strokes.push(segment)

playing + drawer clears canvas
  └── strokes = []

playing + guesser submits valid guess
  ├── guesses.push(entry with isCorrect, scoredPoints)
  └── scores[participantId] += scoredPoints (0 or 100)
```

## StrokeSegment

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID string` | Server or client generated; unique in room |
| `points` | `{ x: number; y: number }[]` | Normalized 0–1 coordinates |
| `color` | `string` | Default `#000000` |
| `lineWidth` | `number` | Default `4` |

### Validation

| Rule | Enforcement |
|------|-------------|
| Append authority | Only `drawerId` participant |
| Timing | One segment per completed stroke (client sends on mouseup/touchend) |
| Minimum points | ≥ 2 points recommended; empty segments rejected with 400 |
| Room status | `playing` only |

## GuessEntry (server)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID string` | |
| `participantId` | `string` | Submitter |
| `playerName` | `string` | Display name at submission time (trimmed participant name) |
| `text` | `string` | Trimmed guess text |
| `isCorrect` | `boolean` | Case-insensitive compare to `secretWord` |
| `scoredPoints` | `number` | `100` if first scoring correct for participant; else `0` |
| `submittedAt` | `ISO string` | Ordering |

### Guess validation

| Rule | Enforcement |
|------|-------------|
| Trim | `text.trim()` before evaluate |
| Non-empty | Reject 400 if empty after trim |
| Submitter | Must be participant; must not be `drawerId` |
| Compare | `trimmed.toLowerCase() === secretWord.toLowerCase()` |
| First correct only | `scoredPoints = 100` only if no prior guess for same `participantId` with `scoredPoints === 100` |
| History | All valid guesses appended, including 0-point correct duplicates |

## Scoring

| Rule | Value |
|------|-------|
| Round start | `0` for every participant |
| First correct guess per guesser | `+100` |
| Incorrect guess | `+0` |
| Later correct duplicate | `+0` (history still `isCorrect: true`) |
| Max per guesser per round | `100` (per spec success criteria) |

## RoomSnapshot (extended API / client view)

| Field | Type | Notes |
|-------|------|-------|
| *(002 fields)* | | `drawerId`, `viewerRole`, `wordDisplay`, etc. |
| `strokes` | `StrokeSegment[]` | Present when `playing`; full list for replay |
| `guesses` | `GuessView[]` | Present when `playing`; ordered |
| `scores` | `ParticipantScore[]` | Present when `playing` |

### GuessView

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `playerName` | `string` | |
| `text` | `string` | Trimmed |
| `isCorrect` | `boolean` | Drives correct/incorrect indicator in UI |
| `scoredPoints` | `number` | `0` or `100` |
| `submittedAt` | `string` | |

### ParticipantScore

| Field | Type | Notes |
|-------|------|-------|
| `participantId` | `string` | |
| `playerName` | `string` | |
| `score` | `number` | Current round total |

## Error domain mapping (new)

| Condition | HTTP | Message (example) |
|-----------|------|-------------------|
| Empty guess after trim | 400 | `Guess cannot be empty` |
| Drawer submits guess | 403 | `The drawer cannot submit guesses` |
| Non-drawer appends stroke / clear | 403 | `Only the drawer can update the canvas` |
| Stroke with < 2 points | 400 | `Invalid stroke` |
| Not `playing` | 409 | `Game is not in progress` |
| Unknown participant | 404 | `Unable to load room` |

## Out of scope (no model fields yet)

- Round end / `result` status / revealed word to all
- Restart-to-lobby reset (Scenario 4)
- Drawer rotation, timers, chat
