# API Endpoints Contract: Room Management

## Overview

REST API for multiplayer drawing game room management. Provides endpoints for room creation, joining, state retrieval, and participant management with HTTP polling support.

**Base URL**: `http://localhost:3001` (configurable via `VITE_API_URL`)  
**Content-Type**: `application/json`  
**Authentication**: None (per project constitution)

---

## Endpoints

### `POST /rooms`
Create a new game room with the requesting player as host.

**Request:**
```json
{
  "playerName": "string (optional, max 50 chars)"
}
```
Omit `playerName` to store `""`. Any string (including whitespace-only) is stored as-is with no trim (no server default).

**Response (201):**
```json
{
  "participantId": "uuid",
  "room": {
    "code": "ABC1",
    "status": "lobby",
    "hostId": "uuid", 
    "participants": [
      {
        "id": "uuid",
        "name": "string",
        "isHost": true,
        "joinedAt": "2026-06-03T15:23:45.123Z"
      }
    ],
    "availableWords": ["word1", "word2"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Errors:**
- `400`: Player name too long (>50 characters)
- `500`: Failed to generate unique room code

---

### `POST /rooms/:code/join`  
Join an existing room as a participant.

**Parameters:**
- `code` (path): Room identifier (4-6 uppercase alphanumeric)

**Request:**
```json
{
  "playerName": "string (optional, max 50 chars)"
}
```
Omit `playerName` for `""`, or send any string stored as-is. Duplicate display names in one room are allowed.

**Response (200):**
```json
{
  "participantId": "uuid",
  "room": {
    "code": "ABC1",
    "status": "lobby", 
    "hostId": "uuid",
    "participants": [
      {
        "id": "uuid1",
        "name": "Host Player", 
        "isHost": true,
        "joinedAt": "2026-06-03T15:23:45.123Z"
      },
      {
        "id": "uuid2",
        "name": "Joining Player",
        "isHost": false, 
        "joinedAt": "2026-06-03T15:24:12.456Z"
      }
    ],
    "availableWords": ["word1", "word2"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Errors:**
- `400`: Invalid room code format, or player name over 50 characters (name content never rejected; whitespace preserved)
- `404`: Room not found
- `400`: Duplicate join (player already in room)

---

### `GET /rooms/:code`
Retrieve current room state for polling/synchronization.

**Parameters:**
- `code` (path): Room identifier  
- `participantId` (query, optional): Requesting participant's ID — **heartbeat**: updates that participant's `lastSeenAt`

**Side effects (when `participantId` present):**
- Updates `lastSeenAt` for the requesting participant
- Removes participants with `lastSeenAt` older than ~15 seconds (disconnect eviction)
- Applies host transfer if the evicted participant was host (see leave flow)
- Deletes room if no participants remain

**Response (200):**
```json
{
  "room": {
    "code": "ABC1",
    "status": "lobby",
    "hostId": "uuid1", 
    "participants": [
      {
        "id": "uuid1",
        "name": "Player 1",
        "isHost": true,
        "joinedAt": "2026-06-03T15:23:45.123Z"
      },
      {
        "id": "uuid2", 
        "name": "Player 2",
        "isHost": false,
        "joinedAt": "2026-06-03T15:24:12.456Z"
      }
    ],
    "availableWords": ["word1", "word2"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Errors:**
- `400`: Invalid room code format
- `404`: Room not found

---

### `POST /rooms/:code/leave`
Remove participant from room, with host transfer and cleanup logic.

**Parameters:**
- `code` (path): Room identifier

**Request:**
```json
{
  "participantId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Side Effects:**
- If leaving participant is host: Transfer host to next oldest participant
- If last participant leaves: Delete room from memory
- All remaining participants see updated state on next poll

**Errors:**
- `400`: Invalid room code or participant ID format
- `404`: Room not found or participant not in room

---

### `POST /rooms/:code/start`
Host-only: transition room from lobby to active game state.

**Parameters:**
- `code` (path): Room identifier

**Request:**
```json
{
  "participantId": "uuid"
}
```

**Response (200):**
```json
{
  "room": { "...": "RoomSnapshot with status active" }
}
```

**Rules:**
- Caller MUST be current host
- Room MUST have at least 2 participants (`canStart` true)
- Non-host clients detect `status: "active"` on next poll and navigate to game UI

**Errors:**
- `400`: Invalid code or not enough players
- `403`: Caller is not host
- `404`: Room not found

---

## Data Types

### RoomSnapshot
```typescript
interface RoomSnapshot {
  code: string;                    // 4-6 char alphanumeric room identifier
  status: "lobby" | "active";      // Current room state
  hostId: string;                  // UUID of current host participant  
  participants: ParticipantSnapshot[]; // All players in room
  availableWords: string[];        // Game seed data
  roles: string[];                 // Game seed data
}
```

### ParticipantSnapshot  
```typescript
interface ParticipantSnapshot {
  id: string;                      // UUID participant identifier
  name: string;                    // Player display name
  isHost: boolean;                 // Whether this participant is the host
  joinedAt: string;                // ISO 8601 join timestamp
}
```

## Polling Guidelines

**Recommended Pattern:**
- Poll `GET /rooms/:code` every 2 seconds while in lobby
- Implement exponential backoff on failure (2s → 4s → 8s → ... max 30s)
- Reset to 2s interval on successful response
- Stop polling when leaving room or navigating away from lobby routes
- Call `POST /leave` only on explicit Leave or `pagehide` (tab close) — **not** on React component unmount (avoids Strict Mode and `/game` navigation bugs)

**Error Handling:**
- Network errors: Continue with backoff
- 404 responses: Room deleted, redirect user appropriately
- 400 responses: Stop polling, show error to user

## Validation Rules

### Room Code Format
- **Pattern**: `/^[A-Z0-9]{4,6}$/`
- **Examples**: `"ABC1"`, `"XY2Z"`, `"123456"`
- **Invalid**: `"abc1"` (lowercase), `"AB"` (too short), `"1234567"` (too long)

### Player Names  
- **Optional**: May be omitted on create/join; MUST NOT return `400` solely for missing, empty, or whitespace-only input
- **Length**: MUST be at most 50 characters or `400` with clear message (empty string allowed)
- **No defaults**: Backend MUST NOT assign `player1`, `player2`, etc.
- **Duplicates**: Same display name MAY appear on multiple participants in one room
- **Processing**: No trim; missing → `""`; whitespace preserved as submitted

### Participant IDs
- **Format**: UUID v4 
- **Generated**: Server-side on join
- **Usage**: Required for leave operations, optional for GET requests