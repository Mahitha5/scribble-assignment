# Feature Specification: Room Management System

## Feature description

A multiplayer drawing game room system that allows players to create and join game rooms using unique codes. The system handles room creation, player management, host designation, and lobby functionality with near-real-time updates via HTTP polling (~2 seconds).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Room Creation (Priority: P1)

A player wants to start a new drawing game session by creating a room that other players can join.

**Independent Test**: Can be fully tested by creating a room, receiving a unique code, and verifying host status without any other players joining.

**Acceptance Scenarios**:

1. **Given** a player is on the main game interface, **When** they choose to create a room, **Then** a unique room code is generated and displayed
2. **Given** a room is created, **When** the creator views the lobby, **Then** they are designated as the host
3. **Given** a room is created, **When** the host views the room status, **Then** they can see they are the only participant and the game cannot start yet

---

### User Story 2 - Room Joining (Priority: P1)

A player wants to join an existing game room using a room code shared by the host.

**Independent Test**: Can be fully tested by entering a valid room code, joining the room, and seeing the lobby with other participants.

**Acceptance Scenarios**:

1. **Given** a valid room code exists, **When** a player enters the code and attempts to join (with or without a display name), **Then** they are added to the room lobby with their chosen name or an auto-assigned default (`player1`, `player2`, …)
2. **Given** a player joins a room, **When** they view the lobby, **Then** they can see all current participants and identify who the host is
3. **Given** multiple players are in a room, **When** they view the lobby, **Then** all players see the same participant list and host designation

---

### User Story 3 - Room Code Validation (Priority: P2)

A player attempts to join a room using an invalid or non-existent room code and receives clear feedback.

**Independent Test**: Can be fully tested by entering invalid codes and verifying appropriate error messages are displayed.

**Acceptance Scenarios**:

1. **Given** a player enters a non-existent room code, **When** they attempt to join, **Then** they receive a clear error message stating the code is invalid
2. **Given** a player enters an empty room code, **When** they attempt to join, **Then** they receive feedback requesting a valid code
3. **Given** a player enters a malformed room code (wrong length or invalid characters), **When** they attempt to join, **Then** they receive an error message stating "Room code must be 4-6 uppercase letters and numbers"

---

### User Story 4 - Lobby Updates and Polling (Priority: P2)

Players in a room lobby see near-real-time updates as other players join or leave, with updates occurring automatically every 2 seconds via HTTP polling.

**Independent Test**: Can be fully tested by having one player join/leave while another observes the lobby updates occurring within 2-3 seconds.

**Acceptance Scenarios**:

1. **Given** a player is in a room lobby, **When** another player joins the room, **Then** the lobby updates within 2-3 seconds to show the new participant
2. **Given** multiple players are in a lobby, **When** a player leaves the room, **Then** all remaining players see the updated participant list within 2-3 seconds
3. **Given** a player is in a lobby, **When** the lobby is refreshed, **Then** the current participant count and host status remain accurate

---

### User Story 5 - Game Start Control (Priority: P3)

The host can start the game only when there are at least 2 players in the room, while non-host players cannot start the game.

**Independent Test**: Can be fully tested by verifying start button availability based on player count and host status, without implementing the actual game mechanics.

**Acceptance Scenarios**:

1. **Given** a host is alone in a room, **When** they view the lobby, **Then** the game start option is disabled with a message indicating more players are needed
2. **Given** a host has at least 2 players in the room, **When** they view the lobby, **Then** the game start option is enabled and functional
3. **Given** a non-host player is in a room, **When** they view the lobby, **Then** they cannot see or access game start controls
4. **Given** a host starts the game, **When** the game begins, **Then** all players in the room transition from lobby to game state

---

### Edge Cases

- What happens if a player tries to rejoin immediately after leaving? → Rejoin is a fresh join with a new `participantId`; prior session is invalid after leave
- How does the system handle network interruptions during polling? → Poll uses exponential backoff (FR-015); lobby keeps last known state and surfaces errors until recovery
- How does the system handle player disconnections (tab close without leave)? → Poll heartbeat via `GET` with `participantId` updates `lastSeenAt`; participants not seen for ~15s are removed; clients call best-effort `leave` on `pagehide` (tab close), not on React effect unmount
- What happens when the host navigates to `/game` after starting? → In-app navigation keeps the room session; do **not** call `POST /leave` on route change to `/game`
- What happens in React Strict Mode (dev double-mount)? → Lobby must **not** call `leave` in `useEffect` cleanup; only explicit Leave, `pagehide`, or stale server eviction end membership
- What occurs if two players try to create rooms simultaneously?
- How are duplicate room codes prevented?
- What happens if a player tries to join the same room multiple times?
- How does the system handle rooms that become empty?
- What happens if the same room code is generated twice simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow players to create new game rooms with unique room codes
- **FR-002**: System MUST generate unique, easy-to-share room codes for each created room using 4-6 character uppercase alphanumeric format (A-Z, 0-9)
- **FR-003**: System MUST allow players to join existing rooms using valid room codes
- **FR-004**: System MUST designate the room creator as the host automatically
- **FR-005**: System MUST reject invalid, empty, or non-existent room codes with clear error messages
- **FR-006**: System MUST maintain complete isolation between different game rooms
- **FR-007**: System MUST update lobby information via HTTP polling every 2 seconds
- **FR-008**: System MUST display current participants and host designation in the lobby
- **FR-009**: System MUST allow only the host to start the game
- **FR-010**: System MUST require at least 2 players before allowing game start
- **FR-011**: System MUST prevent duplicate room code generation
- **FR-012**: System MUST handle player disconnections and lobby updates gracefully: poll heartbeat (`lastSeenAt` via `GET ?participantId=`), evict participants absent for ~15s, best-effort `leave` on tab close (`pagehide`) or explicit Leave control, and preserve lobby UX during transient poll failures. Client MUST NOT call `leave` on React component unmount (including Strict Mode remount or in-app navigation to `/game`); session ends only via explicit leave, tab close, or server eviction
- **FR-013**: System MUST transfer host privileges to the next player who joined when the current host leaves a room with other players present
- **FR-014**: System MUST immediately clean up and remove empty rooms from memory when the last player leaves
- **FR-015**: System MUST implement retry logic with exponential backoff when lobby polling fails or times out
- **FR-016**: System MUST treat `playerName` as optional on create and join; when missing, empty, or whitespace-only, assign `player1` for the first participant in a new room and the lowest unused `playerN` (`player2`, `player3`, …) when joining an existing room

### Data Requirements

The feature requires the following data to be maintained in memory:

- Room state information (code, participants, host designation, creation time)
- Player information within rooms (display name, join time, host status)
- Room code registry to prevent duplicates and enable lookup
- Lobby state for each room (participant list, game status)

### Key Entities

- **Room**: Represents a game session with a unique code, designated host, participant list, and current state (lobby/active)
- **Player**: Represents a participant in a room with display name and role (host/participant)
- **Room Code**: Unique identifier allowing players to discover and join specific rooms

## Clarifications

### Session 2026-06-03

- Q: What should the room code format be? → A: Alphanumeric codes (4-6 chars, uppercase)
- Q: What should happen when the host leaves a room with other players? → A: Transfer host to next player who joined
- Q: How do players get their display names in rooms? → A: Optional field on Create/Join pages; if omitted, backend assigns `player1` on create and the next unused `playerN` on join (incrementing by 1)
- Q: Is `playerName` required on create/join? → A: No — optional in request body; empty/whitespace/missing triggers server default naming
- Q: When should empty rooms be cleaned up from memory? → A: Immediately after last player leaves
- Q: How should the system handle polling failures or timeouts? → A: Retry with exponential backoff
- Q: How should disconnections be handled without WebSockets? → A: `lastSeenAt` heartbeat on each poll (`GET` with `participantId`); evict participants stale for ~15s; best-effort `leave` on `pagehide` (tab close) or explicit Leave — **not** on React `useEffect` cleanup (avoids Strict Mode and `/game` navigation bugs)
- Q: When must the client call `POST /leave`? → A: Only on explicit Leave button, `pagehide` (tab close/navigation away from site), never on lobby unmount or navigation to `/game` within the SPA

## Success Criteria *(mandatory)*

- **Room Creation**: Players can successfully create rooms and receive unique codes within 1 second
- **Room Joining**: Players can join valid rooms using codes with 99% success rate
- **Error Handling**: Invalid room codes are rejected with clear feedback within 500ms
- **Room Isolation**: Players in different rooms never see each other's activities or data
- **Lobby Updates**: Lobby information refreshes and displays accurate participant lists within 2-3 seconds
- **Host Control**: Only hosts can access game start functionality, and it's unavailable with fewer than 2 players
- **Code Uniqueness**: Room code collisions occur less than 0.01% of the time
- **Polling Reliability**: Lobby polling maintains 95% uptime with graceful degradation during network issues


## Out of Scope

Per the Scribble constitution, the following are always excluded unless the constitution
is formally amended:

- WebSockets or real-time push sync (use HTTP polling only)
- Databases or persistent storage (in-memory backend only)
- Authentication, accounts, or sessions
- New state-management or routing libraries beyond the starter
- Deployment, CI, Docker, or hosting work unrelated to local validation
- Rewriting the starter from scratch

This specification explicitly excludes:

- Game mechanics and drawing functionality (separate feature)
- Player profile management or persistent player data
- Room customization options (themes, settings, etc.)
- Advanced room management (password protection, private rooms)
- Player communication features (chat, voice, etc.)
- Room analytics or usage tracking
- Advanced lobby features (spectator mode, player roles beyond host)
