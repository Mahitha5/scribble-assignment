# Data Model: Game Start & Drawer Flow

**Feature**: `plans/002-game-start-drawer` (spec: `specs/002-game-start-drawer/spec.md`)  
**Prerequisite**: `plans/001-room-setup-lobby/data-model.md`

## Entity Relationship

```text
Room 1──* Participant
Room.drawerId ──► Participant.id (exactly one drawer per first round)
Room.secretWord (server-only; filtered in API for guessers)
```

## Room (extended)

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | Unchanged; input to word selection |
| `status` | `"lobby" \| "playing"` | Unchanged lifecycle |
| `participants` | `Participant[]` | Names trimmed on successful start |
| `drawerId` | `string \| undefined` | Set at start to current host’s `participant.id`; undefined in lobby |
| `secretWord` | `string \| undefined` | Set at start from deterministic rule; never sent to guessers in API |
| `createdAt` | `ISO string` | Unchanged |
| `updatedAt` | `ISO string` | Unchanged |

### State transitions

```text
lobby ──► [start: names valid + host + ≥2 players]
            ├── assign drawerId = host participant id
            ├── assign secretWord = selectSecretWord(code)
            ├── trim + persist participant names
            └── playing

lobby ──► [start: invalid/duplicate names] ──► lobby (unchanged round fields)
```

## Participant (extended behavior)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID string` | Unchanged |
| `name` | `string \| undefined` | Raw in lobby; **trimmed** after successful start |
| `isHost` | `boolean` | Unchanged; host at start → drawer |
| `joinedAt` | `ISO string` | Unchanged |
| `lastSeenAt` | `ISO string` | Unchanged |

### Validation at start (not join)

| Rule | Enforcement |
|------|-------------|
| Trim | `name.trim()` for validation and persistence |
| Non-empty | After trim, must contain ≥1 non-whitespace char |
| Unique | Trimmed names unique case-insensitively within room |
| Offender reporting | Error lists lobby-stored names of failing participants |

**Note**: Join-time uniqueness remains on **raw** names per 001. Start-time uniqueness on **trimmed** names is the stricter gate.

## Secret word selection

| Input | Rule | Output |
|-------|------|--------|
| `room.code` (uppercase) | `sum(charCodeAt) % 5` | `STARTER_WORDS[index]` |

Ordered list: `rocket`, `pizza`, `castle`, `guitar`, `sunflower`.

## RoomSnapshot (extended API / client view)

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | |
| `status` | `"lobby" \| "playing"` | |
| `participants` | `{ id, name, isHost, joinedAt }[]` | Trimmed names when `playing` |
| `availableWords` | `string[]` | Starter list (unchanged) |
| `roles` | `ParticipantRole[]` | Unchanged |
| `viewerParticipantId` | `string \| undefined` | Echo from query |
| `isViewerHost` | `boolean` | Unchanged |
| `canStartGame` | `boolean` | `false` when `playing` |
| `drawerId` | `string \| undefined` | Present when `playing` |
| `viewerRole` | `"drawer" \| "guesser" \| undefined` | Derived from viewer vs `drawerId`; undefined in lobby |
| `wordDisplay` | `string \| undefined` | Drawer: secret word; guesser: `"Guess word"`; undefined in lobby |

### Role-specific word rule

```text
if status === "playing" and viewerParticipantId === drawerId:
  wordDisplay = secretWord
else if status === "playing":
  wordDisplay = "Guess word"
else:
  wordDisplay = undefined
```

Never serialize raw `secretWord` for non-drawer viewers.

## Client session (unchanged)

`scribble.session`: `{ participantId, roomCode }` in `localStorage`.

## Error domain mapping (new)

| Condition | HTTP | Message (example) |
|-----------|------|---------------------|
| Empty name after trim | 400 | `Player names cannot be empty: Guest` |
| Duplicate trimmed names | 400 | `Display names must be unique: Alex, alex` |
| (existing) Not host | 403 | `Only the host can start the game` |
| (existing) <2 players | 400 | `Waiting for more players` |
| (existing) Already playing | 409 | `Game already in progress` |

## Out of scope (no model fields yet)

- Canvas strokes, guesses, scores beyond zero placeholder
- Round rotation, timers, result/restart state
