# REST Contract: Rooms API (Scenario 1)

**Base URL**: `http://localhost:3001`  
**Content-Type**: `application/json`

## Shared types

```typescript
type RoomStatus = "lobby" | "playing";

interface ParticipantView {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
}

interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: ParticipantView[];
  availableWords: string[];
  roles: ("drawer" | "guesser")[];
  viewerParticipantId?: string;
  isViewerHost: boolean;
  canStartGame: boolean;
}

interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
```

## POST /rooms

Create a room; creator becomes host.

**Request body**

```json
{ "playerName": "Alice" }
```

`playerName` optional; stored exactly as submitted (omitted when absent; whitespace preserved).

**Response 201**

```json
{
  "participantId": "uuid",
  "room": { "...RoomSnapshot": "...", "isViewerHost": true, "canStartGame": false }
}
```

`canStartGame` is false with one participant.

---

## POST /rooms/:code/join

Join an existing room in lobby state.

**Path param**: `code` — trimmed, case-insensitive, must match `/^[A-Za-z0-9]{4}$/` after trim.

**Request body**

```json
{ "playerName": "Bob" }
```

**Response 200**

```json
{
  "participantId": "uuid",
  "room": { "...RoomSnapshot": "..." }
}
```

**Errors**

| Status | When | Message |
|--------|------|---------|
| 400 | Empty/invalid code format | `Invalid room code format` or Zod message |
| 404 | Unknown code or evicted room (all participants stale) | `Unable to join room` |
| 409 | Duplicate name in lobby | `Choose a different name` |
| 409 | Room status is `playing` | `Game already in progress` |

---

## GET /rooms/:code

Poll room snapshot; optional heartbeat when `participantId` provided.

**Query**

| Param | Required | Notes |
|-------|----------|-------|
| `participantId` | No | When set, updates that participant's `lastSeenAt` and may trigger host transfer |

**Response 200**

```json
{
  "room": { "...RoomSnapshot": "..." }
}
```

**Errors**

| Status | When |
|--------|------|
| 400 | Malformed code |
| 404 | Room not found or evicted (all participants stale) |

---

## POST /rooms/:code/start

Host-only: transition room from `lobby` to `playing`.

**Path param**: `code` — same validation as join.

**Request body**

```json
{ "participantId": "uuid" }
```

**Response 200**

```json
{
  "room": { "...RoomSnapshot": "...", "status": "playing", "canStartGame": false }
}
```

**Errors**

| Status | When | Message |
|--------|------|---------|
| 400 | <2 participants | `Waiting for more players` |
| 403 | Caller not host | `Only the host can start the game` |
| 404 | Unknown room/code | `Unable to load room` |
| 409 | Already playing | `Game already in progress` |

---

## Polling contract (client behavior)

- Interval: **2000ms** while on `/lobby`.
- On `room.status === "playing"`: navigate all clients to `/game`.
- On poll error: show non-blocking message; retry next tick.
- On **404** (room evicted or not found): clear `scribble.session`, navigate to `/`.
- Include stored `participantId` in query for heartbeat and viewer fields.
