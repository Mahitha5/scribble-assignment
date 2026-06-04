# Room Management Implementation Quickstart

## Overview

Reference guide for room management in the Scribble lab. **Feature 001 is implemented**; use this for verification, onboarding, and two-tab regression.

**Key behaviors (2026-06-04):** HTTP polling lobby; host transfer; optional names stored **as-is** (no trim; empty or whitespace OK; no `player1` defaults); duplicate display names allowed; host-only start with ≥2 players.

**Prerequisites**: Backend on `:3001`, frontend on `:5173`, `npm install` in both apps.

---

## Implementation Checklist

### Phase 1: Backend Data Model (30-45 mins)

- [ ] **Update `backend/src/models/game.ts`**
  - Add `hostId: string` field to `Room` interface
  - Add `joinedAt: Date` field to `Participant` interface  
  - Add `isHost: boolean` to `ParticipantSnapshot` interface

- [ ] **Update `backend/src/services/roomStore.ts`**
  - Modify `createRoom()` to set creator as host
  - Add `leaveRoom(code, participantId)` method
  - Add host transfer logic in leave method
  - Add room cleanup when last participant leaves
  - Update `toRoomSnapshot()` to include `isHost` derived field

- [ ] **Update `backend/src/api/schemas.ts`**
  - Add room code format validation: `/^[A-Z0-9]{4,6}$/`
  - Add `leaveRoomSchema` with participant ID validation
  - Update existing schemas with enhanced validation

### Phase 2: Backend API Routes (30-45 mins)

- [ ] **Update `backend/src/api/rooms.ts`**
  - Add `POST /rooms/:code/leave` endpoint
  - Enhance existing endpoints with host tracking
  - Add better error handling and validation
  - Update response formats with host information

- [ ] **Test backend changes**
  - Run existing tests: `cd backend && npm test`
  - Add new tests for leave functionality and host transfer
  - Manual API testing with curl/Postman

### Phase 3: Frontend API Layer (20-30 mins)

- [ ] **Update `frontend/src/services/api.ts`**
  - Add `leaveRoom(code, participantId)` function
  - Update type definitions to match new backend responses
  - Update error handling for new validation messages

### Phase 4: Frontend State Management (45-60 mins)

- [ ] **Update `frontend/src/state/roomStore.ts`**
  - Add `leaveRoom()` method to store class
  - Update store state interface with any new fields
  - Add client-side room code validation helper
  - Enhance error message mapping for user-friendly feedback

- [ ] **Create polling hook or logic**
  - Implement exponential backoff polling pattern
  - Add polling state management
  - Stop polling timers on unmount only; do **not** call `leaveRoom()` on unmount (use `pagehide` for tab close)

### Phase 5: Frontend UI Updates (60-90 mins)

- [ ] **Update `frontend/src/pages/LobbyPage.tsx`**
  - Add automatic HTTP polling (every 2 seconds)
  - Add host-only "Start Game" button logic
  - Add "Leave Room" functionality
  - Add minimum 2 players validation for game start
  - Remove manual "Refresh Room" button (replace with polling)

- [ ] **Update `frontend/src/pages/JoinRoomPage.tsx`**
  - Add client-side room code format validation
  - Add immediate error feedback for invalid codes
  - Enhance error message display

- [ ] **Optional: Update other components**
  - Add visual indicators for host status
  - Improve error message styling
  - Add loading states for operations

### Phase 6: Testing & Validation (30-45 mins)

- [ ] **Two-browser testing**
  - Create room in browser 1, join from browser 2
  - Verify polling updates both browsers
  - Test host transfer when host leaves
  - Test room cleanup when last player leaves
  - Test validation with invalid room codes
  - **Strict Mode / create flow**: After create → lobby, confirm Network tab shows poll requests only (no immediate `POST …/leave`) and lobby does not redirect home

- [ ] **Edge case testing**
  - Network interruption during polling
  - Rapid join/leave operations
  - Invalid input handling
  - Room code collision (rare but possible)

---

## Key Implementation Details

### Backend Host Transfer Logic
```typescript
const transferHost = (room: Room, leavingParticipantId: string): void => {
  if (room.hostId !== leavingParticipantId) return;
  
  const remainingParticipants = room.participants
    .filter(p => p.id !== leavingParticipantId)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  
  if (remainingParticipants.length > 0) {
    room.hostId = remainingParticipants[0].id;
  }
};
```

### Frontend Polling with Backoff
```typescript
useEffect(() => {
  if (!room) return;
  
  let retryCount = 0;
  const baseDelay = 2000;
  const maxDelay = 30000;
  
  const poll = async () => {
    try {
      await roomStore.fetchRoom();
      retryCount = 0;
      setTimeout(poll, baseDelay);
    } catch (error) {
      retryCount++;
      const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
      setTimeout(poll, delay);
    }
  };
  
  poll();
}, [room?.code]);
```

### Room Code Validation
```typescript
// Shared validation regex
const ROOM_CODE_REGEX = /^[A-Z0-9]{4,6}$/;

// Client-side validation
const validateRoomCode = (code: string): string | null => {
  if (!code) return "Room code is required";
  if (!ROOM_CODE_REGEX.test(code.toUpperCase())) {
    return "Room code must be 4-6 uppercase letters and numbers";
  }
  return null;
};
```

---

## File Modification Summary

| File | Type of Change | Estimated Lines |
|------|----------------|-----------------|
| `backend/src/models/game.ts` | Add fields | +10 |
| `backend/src/services/roomStore.ts` | Add methods, logic | +80-120 |
| `backend/src/api/schemas.ts` | Add validation | +20-30 |
| `backend/src/api/rooms.ts` | Add endpoint | +40-60 |
| `frontend/src/services/api.ts` | Add function | +15-25 |
| `frontend/src/state/roomStore.ts` | Add methods | +50-80 |
| `frontend/src/pages/LobbyPage.tsx` | Add polling, host UI | +60-100 |
| `frontend/src/pages/JoinRoomPage.tsx` | Add validation | +20-40 |

**Total estimated additions**: ~300-500 lines of code

---

## Testing Commands

```bash
# Backend testing
cd backend
npm test                    # Run existing tests
npm run dev                 # Start development server

# Frontend testing  
cd frontend
npm test                    # Run existing tests
npm run dev                 # Start development server

# Manual testing
# 1. Open http://localhost:5173 in two browser tabs
# 2. Create room in tab 1 with name "  Ali  " — lobby must show spaces
# 3. Join room in tab 2 (blank or duplicate name OK)
# 4. Verify both tabs show participant updates within ~3s
# 5. Host start with 2+ players; no leave on navigate to /game
# 6. Test host transfer by explicit leave or tab close (pagehide)
```

---

## Common Issues & Solutions

### Issue: Polling doesn't start after joining room
**Solution**: Ensure `useEffect` dependency array includes `room?.code` and polling starts in `LobbyPage`

### Issue: Host transfer doesn't work
**Solution**: Verify `joinedAt` timestamps are set correctly and transfer logic sorts by oldest first

### Issue: Room code validation inconsistent
**Solution**: Use same regex pattern in both client and server validation schemas

### Issue: Polling continues after leaving room
**Solution**: Ensure `useEffect` cleanup function clears timeout and polling stops when `room` becomes null

### Issue: Create room redirects to home immediately (dev)
**Symptom**: Network shows `POST /rooms` → poll → `POST …/leave` → failed poll → home.

**Cause**: `leaveRoom()` in React `useEffect` cleanup runs on Strict Mode remount or in-app navigation; `clearSession()` clears `room`, triggering redirect.

**Solution**: Call `leaveRoom()` only on `pagehide` and explicit Leave — never in effect cleanup. Do not redirect home on transient poll failure; only when user leaves or room is truly gone (404).

---

## Next Steps

After implementing room management:

1. **Code Review**: Check all changes against specification requirements
2. **Performance Testing**: Verify polling doesn't create memory leaks
3. **User Experience**: Test with multiple users for realistic load
4. **Documentation**: Update README with new functionality
5. **Game Start Integration**: Connect host-controlled game start to actual game flow

This implementation provides a solid foundation for the multiplayer room system while maintaining compatibility with the existing codebase structure.