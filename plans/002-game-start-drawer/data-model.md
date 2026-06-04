# Data Model: Game Start & Drawer Flow

Extends `plans/001-room-management/data-model.md`. All 001 fields remain unless noted.

## Core Entities (extensions)

### Room (Backend)

```typescript
interface Room {
  code: string;
  hostId: string;
  status: "lobby" | "active";
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
  // Added when status becomes "active" at start:
  drawerId?: string;      // Set to hostId at start; participant id of drawer
  secretWord?: string;    // Server-only round word; never sent to guessers in API
}
```

**Validation rules (active round):**
- `drawerId` MUST equal `hostId` at moment `startGame` succeeds
- `secretWord` MUST be one of `STARTER_WORDS`
- `drawerId` MUST reference an existing participant

**State transitions:**
- `lobby` + host start (≥2 players) → `active`, set `drawerId`, `secretWord`
- Second `start` while `active` → error `already_started` (001 behavior)
- Backend restart → all state lost (platform constraint)

### Participant (Backend)

Unchanged at start: `id`, `name`, `joinedAt`, `lastSeenAt` — names not modified.

### ParticipantSnapshot (API)

```typescript
interface ParticipantSnapshot {
  id: string;
  name: string;
  joinedAt: string;
  isHost: boolean;
  role?: "drawer" | "guesser";  // Present when room.status === "active"
}
```

**Derivation when active:**
- `role = "drawer"` if `participant.id === room.drawerId`
- `role = "guesser"` otherwise

### RoomSnapshot (API)

```typescript
interface RoomSnapshot {
  code: string;
  hostId: string;
  status: "lobby" | "active";
  canStart: boolean;              // false when active
  participants: ParticipantSnapshot[];
  drawerId?: string;              // When active
  secretWord?: string;            // ONLY when viewer is drawer (FR-010)
  roles: ("drawer" | "guesser")[]; // Vocabulary of role types (metadata)
  availableWords?: string[];      // Omit or [] when active (no leak)
}
```

### Active Round (logical)

Not a separate table — represented by `Room` when `status === "active"`:

- One drawer, one secret word, N−1 guessers
- No round rotation in this feature

### Game Snapshot (per viewer)

Same as `RoomSnapshot` returned from `toRoomSnapshot(room, viewerParticipantId)`:

| Viewer | Fields |
|--------|--------|
| Drawer | Full snapshot + `secretWord` |
| Guesser | Same but **no** `secretWord` key |
| Unauthenticated poll (no participantId) | Treat as guesser for word omission; prefer always passing `participantId` from client |

## Relationships

```
Room (active)
  ├── drawerId → participants[].id (exactly one)
  ├── secretWord → STARTER_WORDS[pickSecretWordForRoomCode(code)]
  └── participants[].role derived from drawerId

pickSecretWordForRoomCode(code)
  └── input: room.code ONLY
```

## Storage

Still `Map<string, Room>` in `roomStore.ts`. No persistence.

## Key Operations

| Operation | 002 behavior |
|-----------|----------------|
| `startGame(code, participantId)` | Host + ≥2 players; atomic active + drawer + word |
| `getRoom(code, participantId)` | Returns room; snapshot via `toRoomSnapshot` with viewer |
| `toRoomSnapshot(room, viewerId)` | Viewer-specific `secretWord`; roles when active |

## Zod / API

- Reuse `startRoomSchema`, `roomViewerQuerySchema` from 001
- Response shaping in service layer, not separate Zod per viewer (TypeScript types document optional `secretWord`)

## Frontend Store

- `RoomSnapshot` types match backend optional fields
- `useViewerRole()` → `"drawer" | "guesser" | null` from snapshot + `participantId`
- Do not cache `secretWord` in a shared store field visible to all components without checking role
