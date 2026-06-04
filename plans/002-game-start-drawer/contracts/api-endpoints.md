# API Contract: Game Start & Drawer Flow

Extends `plans/001-room-management/contracts/api-endpoints.md`. Base paths unchanged; behavior of **start** and **GET room** responses extended for active rounds.

## Conventions

- All room routes use `ROOM_CODE_REGEX`: `/^[A-Z0-9]{4,6}$/`
- Poll heartbeat: `GET /rooms/:code?participantId=<uuid>` updates `lastSeenAt`
- **Viewer-specific responses**: Same URL; `secretWord` presence depends on `participantId` query/body viewer

---

## POST /rooms/:code/start

**Purpose**: Host starts first round (FR-003, FR-005, FR-013).

**Request**

```json
{
  "participantId": "uuid"
}
```

**Success (200)** — viewer is the host/drawer after start

```json
{
  "room": {
    "code": "ABCD",
    "hostId": "uuid-host",
    "status": "active",
    "canStart": false,
    "drawerId": "uuid-host",
    "secretWord": "pizza",
    "participants": [
      {
        "id": "uuid-host",
        "name": "Alice",
        "joinedAt": "2026-06-04T12:00:00.000Z",
        "isHost": true,
        "role": "drawer"
      },
      {
        "id": "uuid-guest",
        "name": "Bob",
        "joinedAt": "2026-06-04T12:00:05.000Z",
        "isHost": false,
        "role": "guesser"
      }
    ],
    "roles": ["drawer", "guesser"]
  }
}
```

**Note**: `availableWords` omitted when `status === "active"` (recommended).

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Room not found |
| 403 | `participantId` is not host |
| 400 | Fewer than 2 participants |
| 400 | Game already started |

---

## GET /rooms/:code

**Purpose**: Poll room state (lobby or active). **Guesser and drawer receive different shapes** (FR-010, FR-011).

**Query**

```
?participantId=<uuid>   (required for heartbeat and viewer-specific word)
```

**Success — drawer viewer (200)**

```json
{
  "room": {
    "code": "ABCD",
    "hostId": "uuid-host",
    "status": "active",
    "canStart": false,
    "drawerId": "uuid-host",
    "secretWord": "pizza",
    "participants": [ "... with role ..." ],
    "roles": ["drawer", "guesser"]
  }
}
```

**Success — guesser viewer (200)**

```json
{
  "room": {
    "code": "ABCD",
    "hostId": "uuid-host",
    "status": "active",
    "canStart": false,
    "drawerId": "uuid-host",
    "participants": [ "... with role ..." ],
    "roles": ["drawer", "guesser"]
  }
}
```

**Critical**: Guesser payload MUST NOT contain `"secretWord"` at any nesting level.

---

## Unchanged endpoints (001)

| Method | Endpoint | 002 note |
|--------|----------|----------|
| POST | `/rooms` | Names as-is at join |
| POST | `/rooms/:code/join` | Same |
| POST | `/rooms/:code/leave` | Same; not supported mid-round semantics in 002 |

---

## Deterministic word

- Computed once at `startGame` from `room.code` only
- Stored in `room.secretWord` server-side
- Algorithm: `research.md` — sum of code char codes mod 5

---

## Test requirements

1. Same `code` → same `secretWord` after start
2. Guesser `GET` × 10: JSON.parse response has no `secretWord` key
3. Drawer `GET` × 1: includes correct `secretWord` from starter list
4. `participant.name` values identical pre/post start
5. After host transfer in lobby, new host becomes `drawerId` on start
