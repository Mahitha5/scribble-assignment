# REST Contract: Rooms API (Scenario 2 delta)

**Base URL**: `http://localhost:3001`  
**Content-Type**: `application/json`  
**Prerequisite**: `plans/001-room-setup-lobby/contracts/rooms-api.md`

This document describes **changes** for Game Start & Drawer Flow. Endpoints not listed here behave as in Scenario 1.

## Shared types (extended)

```typescript
type RoomStatus = "lobby" | "playing";
type ViewerRole = "drawer" | "guesser";

interface ParticipantView {
  id: string;
  name?: string;
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
  // --- Scenario 2 fields (present when status === "playing") ---
  drawerId?: string;
  viewerRole?: ViewerRole;
  wordDisplay?: string; // secret word for drawer; "Guess word" for guessers
}
```

**Security rule**: Responses for guessers MUST NOT include the raw secret word in any field. Only `wordDisplay` is role-filtered.

---

## POST /rooms/:code/start (enhanced)

Host-only: validate names, assign drawer and secret word, transition to `playing`.

**Path param**: `code` — unchanged validation.

**Request body**

```json
{ "participantId": "uuid" }
```

**Processing order**

1. Verify room exists, lobby status, caller is host, ≥2 participants (existing rules).
2. Trim each participant name; collect empty-after-trim offenders → **400** if any.
3. Check trimmed names unique case-insensitively → **400** if collision.
4. Persist trimmed names on participants.
5. Set `drawerId` to host participant’s `id`.
6. Set `secretWord` = `STARTER_WORDS[(sum of uppercase code char codes) mod 5]`.
7. Set `status = "playing"`.

**Response 200**

```json
{
  "room": {
    "code": "ABCD",
    "status": "playing",
    "drawerId": "host-uuid",
    "viewerRole": "drawer",
    "wordDisplay": "castle",
    "participants": [
      { "id": "host-uuid", "name": "Host", "isHost": true, "joinedAt": "..." },
      { "id": "guest-uuid", "name": "Guest", "isHost": false, "joinedAt": "..." }
    ],
    "canStartGame": false,
    "isViewerHost": true
  }
}
```

Guest caller would receive `"viewerRole": "guesser"`, `"wordDisplay": "Guess word"`.

**New errors**

| Status | When | Message (pattern) |
|--------|------|-------------------|
| 400 | Any trimmed name empty | `Player names cannot be empty: {names}` |
| 400 | Trimmed names collide | `Display names must be unique: {names}` |

Existing errors unchanged: 400 insufficient players, 403 not host, 404 not found, 409 already playing.

---

## GET /rooms/:code (enhanced playing snapshot)

Unchanged query: `?participantId=` for heartbeat and viewer fields.

**Response 200 (playing)**

```json
{
  "room": {
    "status": "playing",
    "drawerId": "host-uuid",
    "viewerRole": "guesser",
    "wordDisplay": "Guess word",
    "participants": [ "...trimmed names..." ]
  }
}
```

**Drawer poll example**

```json
{
  "room": {
    "viewerRole": "drawer",
    "wordDisplay": "castle"
  }
}
```

**Lobby response**: `drawerId`, `viewerRole`, `wordDisplay` omitted or undefined.

---

## Polling contract (client behavior)

| Screen | Interval | Action |
|--------|----------|--------|
| `/lobby` | 2000ms | Unchanged; navigate to `/game` when `status === "playing"` |
| `/game` | 2000ms | **New** — poll snapshot; update drawer label and `wordDisplay`; 404 → clear session, redirect `/` |

---

## Word selection reference

For room code `ABCD`:

```text
sum = A.charCode + B.charCode + C.charCode + D.charCode
index = sum % 5
word = ["rocket","pizza","castle","guitar","sunflower"][index]
```

Same code always yields same word (deterministic).
