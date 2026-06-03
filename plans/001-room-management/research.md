# Research: Room Management System

## HTTP Polling with Exponential Backoff

**Decision**: Implement exponential backoff starting at 2 seconds, doubling on failure up to 30 seconds max, with immediate reset on success.

**Rationale**: 
- Prevents overwhelming a failing backend while maintaining reasonable user experience
- Standard pattern: `delay = min(baseDelay * 2^retryCount, maxDelay)`
- Reset to baseDelay on successful poll maintains normal 2-second cadence

**Implementation approach**:
```typescript
let retryCount = 0;
const baseDelay = 2000;
const maxDelay = 30000;

const scheduleNextPoll = (failed: boolean) => {
  if (failed) {
    retryCount++;
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    setTimeout(poll, delay);
  } else {
    retryCount = 0; // Reset on success
    setTimeout(poll, baseDelay);
  }
};
```

**Alternatives considered**: Linear backoff (less effective), fixed retry intervals (can overwhelm failing services)

---

## Room Code Generation and Collision Avoidance

**Decision**: 4-6 character uppercase alphanumeric codes with retry loop (max 10 attempts) for collision avoidance.

**Rationale**:
- 4-6 chars gives 36^4 = 1.68M to 36^6 = 2.18B possible codes
- Collision probability very low for typical room volumes (<1000 active rooms)
- Simple retry loop with regeneration handles rare collisions
- Uppercase format matches existing backend implementation

**Implementation approach**:
```typescript
const generateRoomCode = (length = 4): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// In createRoom with collision retry
let attempts = 0;
let code: string;
do {
  code = generateRoomCode();
  attempts++;
} while (roomMap.has(code) && attempts < 10);

if (roomMap.has(code)) {
  throw new Error('Failed to generate unique room code');
}
```

**Alternatives considered**: UUIDs (too long for sharing), sequential numbers (predictable, security issues), longer codes (harder to share verbally)

---

## Host Transfer Algorithm

**Decision**: Transfer host to participant with earliest join timestamp when current host leaves.

**Rationale**:
- Deterministic and predictable behavior
- "First come, first serve" is intuitive to users
- No complex voting or selection UI required
- Matches spec requirement: "transfer to next player who joined"

**Implementation approach**:
```typescript
const transferHost = (room: Room, leavingParticipantId: string): void => {
  if (room.hostId !== leavingParticipantId) return;
  
  // Find participant with earliest joinedAt timestamp (excluding leaving participant)
  const remainingParticipants = room.participants
    .filter(p => p.id !== leavingParticipantId)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  
  if (remainingParticipants.length > 0) {
    room.hostId = remainingParticipants[0].id;
  }
  // If no participants remain, room will be cleaned up by caller
};
```

**Alternatives considered**: Random selection (unpredictable), longest session time (more complex), user voting (adds UI complexity and delays)

---

## Client-Side Validation Strategy

**Decision**: Client-side format validation for immediate feedback, server-side validation for security.

**Rationale**:
- Immediate user feedback improves UX
- Server validation prevents malicious requests
- Consistent validation logic between client and server
- Follows established pattern in existing codebase

**Implementation approach**:
- Shared regex pattern: `/^[A-Z0-9]{4,6}$/`
- Client validates on input change with immediate error display
- Server validates in Zod schema with detailed error messages
- Both use same format specification for consistency

**Alternatives considered**: Server-only validation (poor UX with round-trip delays), client-only validation (security risk)

---

## Default Player Names (FR-016)

**Decision**: `playerName` optional on create/join; server assigns `player1` for new rooms and lowest unused `playerN` when joining without a name.

**Rationale**:
- Faster onboarding — room code is the only required field on join
- Predictable defaults for demos and two-tab testing
- Custom names still supported when provided (max 50 chars)

**Implementation**: `roomStore.resolvePlayerName()` scans existing `playerN` names in the room and picks the smallest free index.

---

## Disconnection Handling (FR-012)

**Decision**: Heartbeat via poll + 15s stale eviction + client best-effort `leave` on tab close only (`pagehide`).

**Rationale**:
- HTTP-only lab cannot detect TCP disconnect; `GET ?participantId=` updates `lastSeenAt` each ~2s poll
- 15s threshold (~7 missed polls) removes ghost participants after tab close without blocking brief network blips
- `pagehide` `leave` reduces stale window when the browser allows the request
- **Do not** call `leave` in React `useEffect` cleanup: Strict Mode remounts and SPA navigation (e.g. lobby → `/game`) fire cleanup without the user leaving; pairing cleanup `leave` with `clearSession()` causes immediate redirect to home

**Client leave triggers (allowed)**:
1. User clicks Leave Room
2. `window` `pagehide` (tab close or leaving the site)
3. Server stale eviction (~15s without heartbeat) when tab close cannot send `leave`

**Client leave triggers (forbidden)**:
- `useEffect` return / component unmount (including React Strict Mode double-mount in dev)
- In-app `navigate('/game')` after host start (non-hosts detect `status: active` via poll)

**Alternatives considered**: WebSocket presence (forbidden), indefinite ghost participants (poor UX), 5s timeout (too aggressive on slow networks), unmount `leave` (breaks create/join in dev)

---

## State Management for Polling

**Decision**: Extend existing roomStore pattern with polling lifecycle managed by LobbyPage component.

**Rationale**:
- Follows established pattern in existing codebase
- Component-based lifecycle (useEffect) provides automatic cleanup
- Store handles state updates, component handles timing
- Separates concerns: store = data operations, component = UI lifecycle

**Implementation approach**:
- `LobbyPage` useEffect starts/stops polling based on room presence
- `roomStore.fetchRoom()` enhanced with better error handling
- Polling state (retryCount, isPolling) managed in component, not store
- Store emits updates via existing subscription pattern

**Alternatives considered**: Store-managed polling (harder to cleanup), separate polling service (adds complexity), WebSocket fallback (violates constitution)