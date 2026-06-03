# Frontend Store Contract: Room Management

## Overview

The room store provides a reactive state management layer for room operations following the established pattern in `frontend/src/state/roomStore.ts`. Extends existing functionality with host management, polling, and participant lifecycle.

---

## Store State Interface

```typescript
interface RoomStoreState {
  room: RoomSnapshot | null;       // Current room data (null when not in room)
  participantId: string | null;    // Current user's participant ID
  error: string | null;            // Last error message (cleared on success)
  isLoading: boolean;              // Loading state for async operations
}
```

**State Transitions:**
- `Initial`: `{ room: null, participantId: null, error: null, isLoading: false }`
- `Creating/Joining`: `isLoading: true, error: null`
- `In Room`: `room: RoomSnapshot, participantId: string, isLoading: false`
- `Error`: `error: string, isLoading: false`
- `Left Room`: `room: null, participantId: null` (polling stops)

---

## Store Methods

### `createRoom(playerName?: string): Promise<void>`
Create a new room with the player as host.

**Behavior:**
- Sets `isLoading: true`
- Calls `api.createRoom(playerName)`
- On success: Sets `room` and `participantId`, clears error
- On failure: Sets `error`, clears loading
- Automatically starts polling after successful creation

**Usage:**
```typescript
const roomStore = useRoomStore();
await roomStore.createRoom("Alice");
// Navigate to /lobby after success
```

### `joinRoom(code: string, playerName?: string): Promise<void>`
Join an existing room as a participant.

**Behavior:**
- Validates code format client-side (immediate feedback)
- Sets `isLoading: true`
- Calls `api.joinRoom(code, playerName)`
- On success: Sets `room` and `participantId`, starts polling
- On failure: Sets `error` with user-friendly message

**Usage:**
```typescript
const roomStore = useRoomStore();
await roomStore.joinRoom("ABC1", "Bob");
// Navigate to /lobby after success
```

### `leaveRoom(): Promise<void>`
Leave the current room and clean up state.

**Behavior:**
- Stops polling if active
- Calls `api.leaveRoom(currentRoom.code, participantId)`
- Clears `room` and `participantId` regardless of API response
- Does not set loading state (immediate local cleanup)

**When to call (required)**:
- User clicks **Leave Room**
- `window` `pagehide` while on lobby (tab close / leaving the site)

**When NOT to call (forbidden)**:
- React `useEffect` cleanup on `LobbyPage` unmount (Strict Mode double-mount in dev)
- Navigating to `/game` after start (host or non-host via poll) — session must remain until game flow ends

**Usage:**
```typescript
const roomStore = useRoomStore();
await roomStore.leaveRoom();
// Navigate away from lobby
```

### `fetchRoom(): Promise<void>`
Manually fetch current room state (used by polling).

**Behavior:**
- Does not set loading state (background operation)
- Calls `api.fetchRoom(currentRoom.code, participantId)`
- On success: Updates `room` state, clears error
- On failure: Sets `error` but does not clear room (allows retry)

**Usage:**
```typescript
// Typically called by polling logic, not directly by components
const roomStore = useRoomStore();
await roomStore.fetchRoom();
```

---

## React Hooks

### `useRoomStore(): RoomStore`
Access store methods for imperative operations.

```typescript
const roomStore = useRoomStore();
// Used for: createRoom, joinRoom, leaveRoom, fetchRoom
```

### `useRoomState(): RoomStoreState` 
Reactive access to store state using `useSyncExternalStore`.

```typescript
const { room, participantId, error, isLoading } = useRoomState();
// Automatically re-renders when store state changes
```

### `useIsHost(): boolean`
Derived state hook for host status checking.

```typescript
const isHost = useIsHost();
// Returns: room?.hostId === participantId
// Used for: conditional UI (start game button, etc.)
```

---

## Polling Integration

### Polling Lifecycle
Managed by `LobbyPage` component, not the store itself:

```typescript
// In LobbyPage component
useEffect(() => {
  if (!room) return;
  
  let retryCount = 0;
  const baseDelay = 2000;
  const maxDelay = 30000;
  let timeoutId: NodeJS.Timeout;
  
  const poll = async () => {
    try {
      await roomStore.fetchRoom();
      retryCount = 0; // Reset on success
      timeoutId = setTimeout(poll, baseDelay);
    } catch (error) {
      retryCount++;
      const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
      timeoutId = setTimeout(poll, delay);
    }
  };
  
  poll(); // Start polling
  
  return () => clearTimeout(timeoutId); // Stop timers only — do not leave room here
}, [room?.code]);

// Separate effect: pagehide only (not unmount cleanup)
useEffect(() => {
  const onPageHide = () => { void roomStore.leaveRoom(); };
  window.addEventListener("pagehide", onPageHide);
  return () => window.removeEventListener("pagehide", onPageHide);
}, [roomStore]);
```

### Error Handling Strategy
- **Network errors**: Continue polling with exponential backoff
- **404 Room not found**: Stop polling, redirect to home page  
- **400 Bad request**: Stop polling, show error message
- **Success after failure**: Reset backoff interval

---

## Validation & Error Messages

### Client-Side Validation
```typescript
// Room code format check before API call
const isValidRoomCode = (code: string): boolean => {
  return /^[A-Z0-9]{4,6}$/.test(code.toUpperCase());
};

// Player name validation (optional; server assigns playerN when blank)
const isValidPlayerName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length === 0 || trimmed.length <= 50;
};
```

### User-Friendly Error Messages
Map API errors to user-friendly messages:

| API Error | User Message |
|-----------|--------------|
| `"Room not found"` | `"Room ABC1 doesn't exist. Please check the code."` |
| `"Invalid request payload"` | `"Please enter a valid room code (4-6 letters/numbers)"` |
| `"You are already in this room"` | `"You're already in this room!"` |
| Network error | `"Connection failed. Retrying..."` |

---

## Integration with Existing Patterns

### Store Class Structure
Extends the existing `RoomStore` class pattern:

```typescript
class RoomStore {
  // Existing methods (keep compatibility)
  setRoomSession(participantId: string, room: RoomSnapshot): void
  setRoomSnapshot(room: RoomSnapshot): void
  
  // New methods for room management
  createRoom(playerName: string): Promise<void>
  joinRoom(code: string, playerName: string): Promise<void>  
  leaveRoom(): Promise<void>
  fetchRoom(): Promise<void>
}
```

### Context Provider
Uses existing `RoomStoreProvider` wrapper in `App.tsx`:

```typescript
// No changes needed to App.tsx
<RoomStoreProvider>
  <Router>
    <Routes>...</Routes>
  </Router>
</RoomStoreProvider>
```

### Navigation Integration
Store methods integrate with React Router navigation:

```typescript
// In CreateRoomPage
const handleSubmit = async () => {
  try {
    await roomStore.createRoom(playerName);
    navigate('/lobby'); // Navigate on success
  } catch (error) {
    // Error already set in store, UI shows it
  }
};
```

---

## Testing Strategy

### Unit Tests
Follow existing patterns in `roomStore.test.ts`:

```typescript
describe('Room Management', () => {
  test('createRoom success flow', async () => {
    // Mock API success response
    // Call createRoom
    // Assert state updates correctly
  });
  
  test('joinRoom validation', async () => {
    // Test client-side code validation
    // Test API error handling
  });
  
  test('polling backoff logic', () => {
    // Test exponential backoff calculation
    // Test reset on success
  });
});
```

### Integration Tests
Manual testing with two browser tabs:
1. Create room in tab 1, verify code display
2. Join room from tab 2, verify both see participants
3. Leave/rejoin, verify host transfer works
4. Test polling by network throttling in dev tools