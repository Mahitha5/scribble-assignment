# Data Model: Room Setup & Lobby

**Feature**: `specs/001-room-setup-lobby` (spec: `specs/001-room-setup-lobby/spec.md`)

## Entity Relationship

```text
Room 1──* Participant
Room identified by unique code (Map key)
Exactly one Participant.isHost === true at a time (while in lobby)
```

## Room

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | 4-char uppercase alphanumeric; unique Map key |
| `status` | `"lobby" \| "playing"` | Join allowed only in `lobby`; poll navigates away when `playing` |
| `participants` | `Participant[]` | Ordered by join time (`joinedAt`) |
| `createdAt` | `ISO string` | Set at creation |
| `updatedAt` | `ISO string` | Updated on any mutation |

### State transitions

```text
[create] ──► lobby ──► [host start + ≥2 players] ──► playing
                │                                        │
                └── join allowed                         └── join blocked
[all participants stale >6s] ──► evicted (removed from Map)
```

## Participant

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID string` | Stable session identity; returned at create/join |
| `name` | `string \| undefined` | Display name stored as submitted (whitespace preserved); omitted when field absent; unique per room while in lobby |
| `isHost` | `boolean` | Exactly one `true` per room |
| `joinedAt` | `ISO string` | Determines join order for host succession |
| `lastSeenAt` | `ISO string` | Updated on each poll carrying `participantId`; used for disconnect detection |

### Validation rules

- **Name uniqueness (join)**: Reject on exact match (`===`), or when both names are defined, case-insensitive match via `toLowerCase()`. No trimming or defaults applied before storage.
- **Host assignment**: Creator gets `isHost: true` at create.
- **Host transfer**: When host `lastSeenAt` stale (>6s), next join-order participant receives host flag.

## RoomSnapshot (API / client view)

Extends public room fields with viewer-specific computed values:

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | |
| `status` | `"lobby" \| "playing"` | |
| `participants` | `{ id, name, isHost, joinedAt }[]` | Host badge source |
| `availableWords` | `string[]` | Starter list (unchanged) |
| `roles` | `ParticipantRole[]` | Starter roles (unchanged) |
| `viewerParticipantId` | `string \| undefined` | Echo from query |
| `isViewerHost` | `boolean` | True when viewer holds host |
| `canStartGame` | `boolean` | `isViewerHost && status === "lobby" && participants.length >= 2` |

## Client session (localStorage)

| Key | Shape | Notes |
|-----|-------|-------|
| `scribble.session` | `{ participantId: string; roomCode: string }` | Written on create/join; read on app init |

Not server-persisted; cleared on backend restart, explicit leave, or unrecoverable 404 (evicted room).

## In-memory store

- **Structure**: `Map<string, Room>` keyed by uppercase `code`.
- **Isolation**: Operations always scoped to single code; no cross-room references.
- **Eviction**: When **every** participant's `lastSeenAt` is older than **6 seconds** (same stale threshold as host transfer), the room is deleted from the Map. Applies in both `lobby` and `playing` status. Checked on poll (`GET`), join, start, and other room mutations—no background job. Evicted rooms behave like post-restart: join/poll returns 404.
- **Server restart**: Clears all rooms immediately (documented client behavior unchanged).

## Error domain mapping

| Condition | HTTP | Message (example) |
|-----------|------|---------------------|
| Empty/whitespace code | 400 | Room code is required |
| Malformed code (≠4 alphanumeric) | 400 | Invalid room code format |
| Room not found | 404 | Unable to join room / Unable to load room |
| Duplicate name in lobby | 409 | Choose a different name |
| Game already started (join) | 409 | Game already in progress |
| Non-host start attempt | 403 | Only the host can start the game |
| Start with <2 players | 400 | Waiting for more players |
| Room not in lobby (start) | 409 | Game already in progress |
| Room evicted (all participants stale) | 404 | Unable to join room / Unable to load room |
