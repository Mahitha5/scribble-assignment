# Frontend Store Contract: Game Start & Drawer Flow

Extends `plans/001-room-management/contracts/frontend-store.md`.

## Types (`frontend/src/services/api.ts`)

```typescript
interface ParticipantSnapshot {
  id: string;
  name: string;
  joinedAt: string;
  isHost: boolean;
  role?: "drawer" | "guesser";
}

interface RoomSnapshot {
  code: string;
  hostId: string;
  status: "lobby" | "active";
  canStart: boolean;
  participants: ParticipantSnapshot[];
  drawerId?: string;
  secretWord?: string;       // Only present for drawer viewer
  roles: ("drawer" | "guesser")[];
  availableWords?: string[]; // Absent or empty when active
}
```

## RoomStore (`frontend/src/state/roomStore.ts`)

### Existing (001)

- `createRoom`, `joinRoom`, `leaveRoom`, `startGame`, `fetchRoom`
- Session: `participantId` + `room` snapshot

### Additions (002)

#### `useViewerRole(): "drawer" | "guesser" | null`

- Returns `null` when `status !== "active"` or no session
- Else `participants.find(p => p.id === participantId)?.role ?? null`

#### `useIsDrawer(): boolean`

- Shorthand: `useViewerRole() === "drawer"`

### `startGame()`

1. Call `api.startGame(code, participantId)`
2. `setRoomSnapshot(response.room)` **before** navigation (avoid partial UI)
3. Host navigates to `/game` (page responsibility)

### `fetchRoom()`

- Always pass `participantId` when in session
- Never copy `secretWord` into a global log or shared debug state

## LobbyPage (`frontend/src/pages/LobbyPage.tsx`)

| Behavior | Requirement |
|----------|-------------|
| Poll interval | ~2s, backoff on error (001) |
| `status === "active"` | `navigate("/game", { replace: true })` |
| Mount with active session | Redirect to `/game` immediately |
| Start button | Host only; `canStart` from snapshot |

## GamePage (`frontend/src/pages/GamePage.tsx`)

| Behavior | Requirement |
|----------|-------------|
| Poll | ~2s `fetchRoom()` while mounted |
| Drawer UI | Show `room.secretWord` when defined |
| Guesser UI | Placeholder text; do not read `availableWords` to infer word |
| Roles | Show drawer label on correct participant (by `role`, not name) |
| Exit | Navigate `/lobby` or `/` per existing UX (lab only) |

## Global session redirect (recommended)

In `RoomStoreProvider` or app shell:

- After any successful `fetchRoom`, if `room.status === "active"` and current path is not `/game`, `navigate("/game")`
- Covers edge case: user not on lobby when host starts (spec edge case)

## API client (`frontend/src/services/api.ts`)

- No change to endpoint paths
- Types reflect optional `secretWord`
- Do not strip `secretWord` on client for guessers — server must omit; client only renders when present

## Manual acceptance

1. Tab A host, Tab B guest, both on lobby → host starts → both on `/game` within ~3s
2. Tab B (guesser): DevTools Network → poll JSON has no `secretWord`
3. Tab A (drawer): poll JSON includes `secretWord`; UI shows word
4. Same room code in two sessions → same word
