# Implementation Plan: Room Management System

**Input**: Feature specification from `specs/001-room-management/spec.md`

**Plan directory**: `plans/001-room-management/` (matches spec folder `specs/001-room-management/`)

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A multiplayer drawing game room system that enables players to create and join game rooms using unique 4-6 character alphanumeric codes. The system implements host-based room management with automatic host transfer, HTTP polling for lobby updates, and complete room isolation. Core functionality includes room creation, player joining with display names, lobby state synchronization, and game start controls restricted to hosts with minimum 2 players.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (✅ PASSED):**
- [x] **TypeScript-First**: Room management code will be implemented in TypeScript using ES modules in both backend/src and frontend/src
- [x] **REST + Zod**: New room endpoints (`POST /rooms`, `GET /rooms/:code`, `POST /rooms/:code/join`) will use Express routes with Zod validation for payloads
- [x] **React + Vite patterns**: Frontend will extend existing roomStore.ts pattern for room state management, no new libraries needed
- [x] **HTTP polling only**: Lobby updates will use 2-second HTTP polling via GET requests, no WebSockets or SSE
- [x] **In-memory only**: Room data stored in backend memory using Map structures, no database or persistent storage
- [x] **Brownfield scope**: Extends existing starter structure in backend/src/services and frontend/src/state, no full rewrite

**Post-Design Re-evaluation (✅ CONFIRMED):**
- [x] **TypeScript-First**: All new interfaces, types, and logic defined in TypeScript with proper typing
- [x] **REST + Zod**: New `POST /rooms/:code/leave` endpoint follows established Express + Zod pattern
- [x] **React + Vite patterns**: Polling implemented with useEffect hooks, store pattern maintained
- [x] **HTTP polling only**: No real-time push mechanisms introduced, exponential backoff uses standard HTTP
- [x] **In-memory only**: RoomStore class continues using Map<string, Room> with no external persistence
- [x] **Brownfield scope**: All changes extend existing files, no new frameworks or architectural patterns

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest |
| Sync | HTTP polling via REST (`GET /rooms/:code`, etc.) |
| Storage | In-memory services in `backend/src/services/` |

## Architecture

### Data Flow

```
Frontend (LobbyPage) → HTTP Polling (every 2s) → Backend GET /rooms/:code
                    ↓
      Room State Updates → roomStore → React Context → UI Updates

Room Creation: CreateRoomPage → POST /rooms → Backend generates code + hostId
Room Joining: JoinRoomPage → POST /rooms/:code/join → Backend adds participant
Host Transfer: Backend detects host leave → Auto-promote next participant
Room Cleanup: Last player leaves → Backend deletes room from memory Map
Disconnect: Poll heartbeat (`lastSeenAt` on GET with `participantId`) → evict stale ~15s; client leave on `pagehide` or explicit Leave (not React unmount / not navigate to `/game`)
```

### API Contracts

**Extended endpoints (building on existing):**

| Method | Endpoint | Request | Response | Changes |
|--------|----------|---------|----------|---------|
| `POST` | `/rooms` | `{ playerName? }` | `{ participantId, room }` | Add `hostId`; default name `player1` if omitted |
| `POST` | `/rooms/:code/join` | `{ playerName? }` | `{ participantId, room }` | Default name `playerN` if omitted |
| `GET` | `/rooms/:code` | `?participantId=id` | `{ room }` | Include host info in snapshot |
| `POST` | `/rooms/:code/leave` | `{ participantId }` | `{ success }` | **New:** Handle host transfer |
| `POST` | `/rooms/:code/start` | `{ participantId }` | `{ room }` | **New:** Host-only; sets `status` to `active` |

**Enhanced RoomSnapshot:**
- Add `hostId: string` field
- Add `canStart: boolean` (derived from participant count >= 2)
- Add `isHost: boolean` (derived from participantId match)

### File Structure

**Backend extensions:**
```
backend/src/
├── models/game.ts           # Add hostId to Room; isHost on ParticipantSnapshot (derived in toRoomSnapshot)
├── services/roomStore.ts    # Add leaveRoom, host transfer logic  
├── api/rooms.ts            # Add leave endpoint, enhanced validation
├── api/schemas.ts          # Add room code format validation, leave schema
```

**Frontend extensions:**
```
frontend/src/
├── state/roomStore.ts      # Add polling logic, leave method
├── services/api.ts         # Add leaveRoom, enhanced types
├── pages/LobbyPage.tsx     # Add polling, host controls, improved UI
├── pages/JoinRoomPage.tsx  # Add client-side code validation
```

## Dependencies

**No new dependencies required** - all functionality can be implemented using existing stack:

- Backend: Express routing, Zod validation, in-memory Map storage
- Frontend: React hooks (useEffect for polling), existing roomStore pattern
- HTTP polling using existing fetch patterns with setInterval/setTimeout for backoff
