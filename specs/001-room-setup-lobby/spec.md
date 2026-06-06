# Feature Specification: Room Setup & Lobby

**Feature directory**: `specs/001-room-setup-lobby/`

## Feature description

Players can host or join a multiplayer drawing game by creating a new room or entering an existing room code. The person who creates the room becomes the host. All players land in a shared lobby where they see the room code, the current participant list, and whether the game can begin. The lobby stays up to date automatically so joiners appear without manual action. Only the host may start the game, and only when at least two players are in the room. Invalid or empty room codes are rejected with clear, actionable feedback. Each room is fully isolated from every other room.

### Success criteria

- A player can create a room and reach the lobby with a shareable code in one flow, without errors.
- Joining with a valid code adds the player to the correct room’s participant list within about 2 seconds for players already in that lobby.
- Joining with an empty, malformed, non-existent code, or a code for a room that has already started is rejected every time with a message that explains what went wrong.
- Joining with a display name already used in that room’s lobby is rejected with a message prompting the player to choose a different name.
- Non-host players never succeed in starting the game, regardless of how they attempt it.
- The host cannot start the game until at least two distinct participants are present; the start action remains unavailable or clearly blocked until then.
- Participants in one room never appear in another room’s lobby when both rooms exist at the same time.
- At least 95% of lobby refreshes during manual two-browser testing reflect the latest participant list within 3 seconds of a join.
- When the original host disconnects while the room is still in lobby, host privileges transfer to the next participant by join order and the new host can start once the two-player minimum is met.
- Inactive rooms are removed from server memory when every participant has been disconnected (no poll heartbeat) for about 6 seconds; join and poll attempts against an evicted room receive a clear not-found response.

## Clarifications

### Session 2026-06-05

- Q: When the host starts the game with 2+ players present, what should non-host players in the lobby experience? → A: All lobby players auto-navigate to the game screen when polling detects the room left lobby state.
- Q: What should count as a "malformed" room code at join time? → A: Wrong length or non-alphanumeric — must be exactly 4 letters/digits after trim.
- Q: What is the join/re-join policy once the game has started? → A: Block new joins and re-joins once the game has started; attempts receive clear feedback that the game is already in progress.
- Q: While the room is still in the lobby, if a player already in the room goes through join again (e.g., another tab), should a second participant entry be created? → A: Allow join from another tab only if the display name is not already taken in that room; if the name matches an existing participant, reject with an error prompting the user to choose a different name.
- Q: When the host closes their browser but the room is still in the lobby with other players present, what happens to host privileges? → A: Host role transfers to the next participant who joined after the original host (by join order).
- Q: When should an inactive room be removed from server memory? → A: When every participant has been disconnected (no poll heartbeat) for about 6 seconds; join and poll then fail with room not found.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Creates a Room (Priority: P1)

A player who wants to host chooses to create a new room, optionally enters a display name, and is taken to the lobby as the host with a unique room code they can share.

**Acceptance Scenarios**:

1. **Given** a player on the start screen, **When** they create a room, **Then** they enter the lobby, receive a unique room code, and are identified as the host.
2. **Given** a player has just created a room, **When** they view the lobby, **Then** they see themselves listed as the only participant, marked as the host, and the room code is visible for sharing.
3. **Given** a player creates a room, **When** another player later joins with that code, **Then** the host remains the host and does not change.

---

### User Story 2 - Player Joins by Room Code (Priority: P1)

A player who received a room code enters it to join an existing game lobby while the room is still waiting to start. Valid codes succeed; empty, invalid, unknown, or post-start codes fail with clear feedback.

**Acceptance Scenarios**:

1. **Given** a valid room code for an active room still in lobby state and a display name not already used in that room, **When** a player submits the join form, **Then** they enter that room’s lobby and appear in the participant list.
2. **Given** a player attempts to join, **When** they submit an empty or whitespace-only code, **Then** they remain off the lobby screen and see a clear message that a room code is required.
3. **Given** a player attempts to join, **When** they submit a code that does not match any active room, **Then** they are not added to any room and see a clear message that the room could not be found.
4. **Given** a player attempts to join, **When** they submit a code that is not exactly 4 alphanumeric characters after trimming (e.g., too short, too long, or contains symbols), **Then** they are not added to any room and see a clear message that the room code format is invalid.
5. **Given** a player attempts to join, **When** they submit a code in a different letter case than the displayed code (e.g., lowercase vs uppercase), **Then** the join succeeds if the code matches an active room still in lobby state (case-insensitive matching).
6. **Given** a room whose game has already started (no longer in lobby state), **When** a player attempts to join or re-join with that room’s code, **Then** they are not added to the room and see a clear message that the game has already started.
7. **Given** a room in lobby state where a participant named “Alex” is already present, **When** another player attempts to join with the display name “Alex” (any letter case), **Then** they are not added and see a clear message to join with a different name.
8. **Given** a room in lobby state where a participant named “Alex” is already present, **When** a player joins from another tab or browser with a different unused display name, **Then** they are added as a separate participant.

---

### User Story 3 - Live Lobby Updates (Priority: P2)

Players waiting in the lobby see an accurate, automatically updating participant list without needing to manually refresh the page.

**Acceptance Scenarios**:

1. **Given** two or more players are in the same room lobby, **When** a new player joins, **Then** all players already in that lobby see the updated participant list within about 2 seconds without clicking refresh.
2. **Given** a player is alone in a lobby, **When** a second player joins, **Then** the host sees the participant count increase to two within about 2 seconds.
3. **Given** a player is viewing the lobby, **When** automatic updates are in progress, **Then** the UI indicates loading or refreshing state without blocking interaction with non-destructive controls.
4. **Given** the host has started the game, **When** a non-host player’s lobby polling detects the room is no longer in lobby state, **Then** that player is automatically navigated to the game screen within about 2 seconds without manual action.

---

### User Story 4 - Host-Only Game Start with Minimum Players (Priority: P2)

Only the host can start the game, and only when at least two players are present. Non-hosts and under-populated rooms cannot start.

**Acceptance Scenarios**:

1. **Given** a room with exactly one participant (the host), **When** the host views the lobby, **Then** the start-game action is disabled or blocked with a clear reason (e.g., waiting for more players).
2. **Given** a room with two or more participants, **When** the host uses the start-game action, **Then** the game begins for that room and all participants—including the host—are navigated to the game screen as the room leaves lobby state.
3. **Given** a room with two or more participants, **When** a non-host player attempts to start the game, **Then** the action is not available to them or is rejected with a clear message that only the host can start.
4. **Given** a non-host attempts to start via any means outside the normal host control, **When** the request is processed, **Then** it is rejected and the room remains in the lobby state.
5. **Given** a room in lobby with three or more participants and the original host disconnects, **When** remaining players’ lobbies refresh, **Then** the participant who joined immediately after the original host is marked as the new host and may use the start-game action (if at least two participants remain).

---

### User Story 5 - Room Isolation (Priority: P2)

Multiple rooms can exist at the same time without cross-contamination of participants, codes, or lobby state.

**Acceptance Scenarios**:

1. **Given** Room A and Room B exist with different codes, **When** a player joins Room A, **Then** they appear only in Room A’s participant list and never in Room B’s.
2. **Given** players are in separate rooms, **When** each lobby updates automatically, **Then** each room shows only its own participants and code.
3. **Given** a player knows Room A’s code but not Room B’s, **When** they join Room A, **Then** they cannot see or affect Room B’s participants or start action.

---

### Edge Cases

- What happens when the host’s browser closes while others remain in the lobby? The room stays active; host designation transfers to the participant who joined immediately after the original host (by join order). If that participant is no longer present, transfer cascades to the next remaining participant in join order.
- What happens when the original host reconnects after host role has transferred? They rejoin as a non-host participant via their stored session; host privileges remain with the current host.
- What happens when a player tries to join with a code that has the wrong length or non-alphanumeric characters? The join is rejected with a clear invalid-format message before or instead of a generic not-found response.
- What happens when a player tries to join a room after the host has started the game? The join or re-join is rejected with a clear message that the game is already in progress; no new participant is added.
- What happens when a player tries to join after the backend has restarted and all in-memory rooms were cleared? The join fails with a clear “room not found” style message.
- What happens when two players create rooms at nearly the same time? Each receives a distinct code and an isolated room; codes do not collide.
- What happens when a player navigates directly to a lobby URL without a valid session for that room? They are redirected away or prompted to create/join again rather than seeing stale or foreign room data.
- What happens when automatic lobby updates fail temporarily (e.g., network error)? The player sees a non-blocking error message and the next automatic update retries; manual refresh may remain available as a fallback.
- What happens when a second player tries to join with the same display name as someone already in the lobby (e.g., both omit the name field, both enter `"  "`, or both enter the same text)? The join is rejected with a message to choose a different name; the existing participant is unchanged.
- What happens when a player opens the join screen in a new tab while already in the lobby under a different name? They may join successfully as a new participant if the new name is not already taken.
- What happens when the host refreshes the page? They re-enter the same room lobby via their stored participant session (not the join form) and retain host privileges; name-uniqueness checks apply only to new join submissions.
- What happens when the host starts the game while a non-host has the lobby open? The non-host’s next automatic lobby refresh detects the room has left lobby state and navigates them to the game screen without requiring a click.
- What happens when all participants disconnect from a lobby (every browser tab closed or network lost)? After about 6 seconds with no poll heartbeats from any participant, the room is evicted from server memory; a later join attempt with that code fails with a room-not-found message.
- What happens when a player polls or refreshes after their room was evicted? The server returns not found; the client clears the stored session and redirects to create/join rather than showing stale lobby data.
- What happens when a room has transitioned to `playing` and all participants stop polling? The same all-participants-stale eviction rule applies so abandoned in-progress rooms do not linger in memory.

## Data Requirements

- **Room**: A uniquely coded gathering space with a lifecycle status (`lobby` vs `playing`), creation timestamp, and ordered list of participants. Each room is independent of all others. Join and re-join are permitted only while status is `lobby`. Rooms are evicted from memory when every participant exceeds the disconnect stale threshold (~6 seconds without a poll heartbeat).
- **Room status**: `lobby` means waiting to start (user-facing “in lobby state”); `playing` means the game is in progress (user-facing “left lobby state”, “game already started”, or “no longer in lobby state”). These map directly to the `status` field in API contracts and implementation.
- **Room code**: A fixed 4-character alphanumeric identifier (letters A–Z and digits 0–9) assigned at creation, displayed in uppercase. Join input is trimmed; matching is case-insensitive. Codes with wrong length or non-alphanumeric characters after trim are rejected as malformed.
- **Participant**: A player instance within a room with a stable identifier for the session, a display name stored exactly as submitted (including whitespace-only values such as `"  "`; no trimming, defaults, or empty-string coercion), join time, and a boolean or equivalent indicating whether they are the host. Display names must be unique within a room while in lobby state (compared case-insensitively when both are present).
- **Host**: Exactly one participant per room holds host privileges at any time. The room creator is the initial host. If the current host disconnects while the room is still in lobby, host status transfers to the next participant by join order (the participant who joined immediately after the original creator, then the next if unavailable).
- **Lobby snapshot**: The player-visible view of a room while waiting to start—room code, participant names, host indicator, participant count, and whether start is allowed.

## Assumptions

- Display names may be optional in this phase; values are stored exactly as submitted with no server-side trimming or defaults (whitespace-only strings such as `"  "` are preserved). Detailed name trimming and rejection of empty/whitespace-only names belong to the game-start scenario and are not required here beyond basic join/create flows. Join attempts reject duplicate display names within the same lobby (exact match, or case-insensitive when both names are present).
- Room codes are exactly four alphanumeric characters (A–Z, 0–9), displayed uppercase at creation; join validation rejects any other format after trimming whitespace.
- Player identity for host checks and session continuity is tracked per browser session via a participant identifier returned when creating or joining; no accounts or login are used.
- Starting the game transitions the room out of the lobby; drawer assignment, secret word visibility, and round rules are defined in the next feature group.
- In-memory room storage means all rooms are lost on server restart; players must create or join again after restart.
- A manual “refresh room” control may coexist with automatic updates but does not replace the ~2 second automatic refresh requirement.

## Out of Scope

Per the Scribble constitution, the following are always excluded unless the constitution
is formally amended:

- WebSockets or real-time push sync (use HTTP polling only)
- Databases or persistent storage (in-memory backend only)
- Authentication, accounts, or sessions
- New state-management or routing libraries beyond the starter
- Deployment, CI, Docker, or hosting work unrelated to local validation
- Rewriting the starter from scratch

Additionally for this feature group:

- Player name trimming and rejection of empty/whitespace-only names (Scenario 2 — Game Start)
- Drawer assignment, secret word selection, and word visibility rules
- Drawing, guessing, scoring, results, and restart flows
- Multiple rounds, timers, drawer rotation, spectators, moderation, room passwords, or invite links
- Arbitrary host election, voting, or moderation-driven host changes (host succession on disconnect is in scope and limited to join-order transfer per edge cases above)
- Maximum room capacity limits beyond the two-player minimum for start
- Configurable eviction TTLs, background sweeper jobs, or persistence of evicted room history
