# Feature Specification: Game Start & Drawer Flow

**Feature directory**: `specs/002-game-start-drawer/`

## Feature description

When the host starts a game from the lobby, the room transitions into the first round. Before the round can begin, every participant’s display name must be valid after trimming leading and trailing whitespace—empty or whitespace-only names block the start with a clear message. Once validation passes, names are stored in their trimmed form for the remainder of the game.

The current host becomes the drawer for the first round and is clearly identified to all players. A secret word is chosen deterministically from the fixed starter word list and shown only to the drawer; all other participants see the game screen without the secret word. Every participant in the room is taken to the game screen as the first round begins.

### Success criteria

- A host with two or more participants who all have valid trimmed names can start the game and reach the first-round game screen in one action.
- If any participant’s name is empty or whitespace-only at start time, the game does not begin and the host sees a clear message naming the offending participant(s) and explaining that names must be valid.
- If any two participants share the same trimmed display name (case-insensitive), the game does not begin and the host sees a clear message naming the colliding participant(s) and explaining that names must be unique.
- Within about 2 seconds of the game starting, every participant—including non-hosts—lands on the game screen reflecting the first round.
- The drawer is unambiguously indicated to all players on the game screen (e.g., label, badge, or role text).
- Only the drawer can see the secret word; every other participant sees the placeholder `Guess word` in the word area on every refresh during the round.
- The same room always receives the same secret word for its first round across repeated starts in a test environment, confirming deterministic selection from the starter list.
- Participant display names shown during the first round match their trimmed values (no leading or trailing whitespace).

## Clarifications

### Session 2026-06-05

- Q: Can the host remove participants with empty/whitespace-only names from the lobby? → A: No; start is blocked with a clear message; invalid participants remain in the lobby until they fix their name or disconnect; no host kick/remove option.
- Q: What deterministic rule selects the first-round secret word from the starter list? → A: Index = (sum of uppercase room-code character codes) mod 5 into the ordered list (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`).
- Q: If two participants’ trimmed names collide (case-insensitive), can the host start? → A: No; start is blocked with a clear message that display names must be unique after trimming.
- Q: What should guessers see in the secret-word area on the game screen? → A: Fixed placeholder text `Guess word` (not the actual secret word).
- Q: When start is blocked by invalid or duplicate names, should the error name the offending participant(s)? → A: Yes; the host’s error message identifies which participant(s) have invalid or duplicate trimmed names.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validate Names Before First Round (Priority: P1)

Before the first round can begin, participant display names are trimmed and validated. Invalid names prevent the game from starting and inform the host what to fix.

**Acceptance Scenarios**:

1. **Given** a room in lobby with two or more participants whose names are non-empty after trimming, **When** the host starts the game, **Then** the game begins and each participant’s stored display name equals their trimmed input.
2. **Given** a room in lobby where at least one participant’s display name is empty or whitespace-only, **When** the host attempts to start the game, **Then** the room remains in lobby state and the host sees a clear message that names cannot be empty, identifying the offending participant(s).
3. **Given** a participant whose name has leading or trailing spaces but non-whitespace content (e.g., `"  Alex  "`), **When** the host starts the game, **Then** the game begins and that participant is shown as `"Alex"` everywhere in the first round.
4. **Given** a host attempts to start while a participant has an invalid name, **When** the start is rejected, **Then** no drawer is assigned, no secret word is chosen, and non-host players remain on the lobby screen.
5. **Given** a room in lobby where two participants’ trimmed names collide case-insensitively (e.g., `"Alex"` and `"  alex  "`), **When** the host attempts to start the game, **Then** the room remains in lobby state and the host sees a clear message that display names must be unique, identifying the colliding participant(s).

---

### User Story 2 - Assign Drawer at Round Start (Priority: P1)

When the first round begins, the current host becomes the drawer and every player can tell who is drawing.

**Acceptance Scenarios**:

1. **Given** a room where the host starts the game with valid participant names, **When** the first round begins, **Then** the current host is designated as the drawer.
2. **Given** the first round is active, **When** any participant views the game screen, **Then** the drawer is clearly identified (by name and/or role) and distinguishable from guessers.
3. **Given** the first round is active, **When** a non-host participant views the game screen, **Then** they see who the drawer is but are not shown as the drawer themselves.
4. **Given** host privileges transferred to another participant while still in lobby (per room-setup rules), **When** the new host starts the game, **Then** that new host becomes the drawer for the first round.

---

### User Story 3 - Deterministic Secret Word, Drawer-Only Visibility (Priority: P1)

The first round’s secret word comes from the fixed starter list using a deterministic rule. Only the drawer sees the word; guessers never receive it through the normal game view or periodic updates.

**Acceptance Scenarios**:

1. **Given** the first round has begun, **When** the drawer views the game screen, **Then** they see the secret word selected for that round.
2. **Given** the first round has begun, **When** any non-drawer participant views the game screen, **Then** they see the placeholder `Guess word` in the word area and never see the actual secret word.
3. **Given** the starter word list is `rocket`, `pizza`, `castle`, `guitar`, `sunflower` in that order, **When** the first round begins for a room with code `ABCD`, **Then** the secret word is `starterWords[(sum of char codes of "ABCD") mod 5]` and the same room code always yields the same word.
4. **Given** the first round is active, **When** the drawer refreshes or receives an automatic game-state update, **Then** they still see the same secret word and remain identified as the drawer.
5. **Given** the first round is active, **When** a guesser refreshes or receives an automatic game-state update, **Then** they still see only the placeholder `Guess word` and never the secret word.

---

### User Story 4 - All Players Enter Game Screen (Priority: P2)

Starting the game moves every participant from the lobby into the first-round game experience together.

**Acceptance Scenarios**:

1. **Given** a room with two or more participants and valid names, **When** the host starts the game, **Then** the host is navigated to the game screen for the first round.
2. **Given** a room with two or more participants and valid names, **When** the host starts the game, **Then** each non-host participant is automatically navigated to the game screen within about 2 seconds without manual action.
3. **Given** the first round is active, **When** any participant views the game screen, **Then** they see first-round context (drawer identified, scores at zero, secret word visibility per their role) rather than lobby content.

---

### Edge Cases

- What happens when only the host has a whitespace-only name and they try to start? Start is rejected; the error names the host as the offending participant; the room stays in lobby.
- What happens when one of several participants has `"   "` as their name? Start is rejected; the error names that participant; the invalid participant stays in the lobby (no host remove/kick); other players are unaffected and remain in the lobby.
- What happens when a participant’s trimmed name duplicates another’s (case-insensitive)? Start is rejected; the error names the colliding participant(s); the room stays in lobby.
- What happens when the host starts successfully and a guesser’s browser was on the lobby? The guesser’s next automatic update detects the room has left lobby state and navigates them to the game screen without the secret word.
- What happens when the drawer’s browser refreshes mid-round? They re-enter the same room’s first round as the drawer and still see the secret word.
- What happens when a guesser refreshes mid-round? They re-enter as a guesser and still do not see the secret word.
- What happens if someone attempts to start without being the host? The action is rejected (enforced by room-setup rules); no drawer or secret word is assigned.
- What happens if the backend restarts after the first round began? In-memory state is lost; players must create or join again (consistent with room-setup assumptions).

## Data Requirements

- **Trimmed display name**: Each participant’s name after removing leading and trailing whitespace, used for validation at game start and for display during the first round.
- **Name validity**: A name is valid if, after trimming, it contains at least one non-whitespace character. Trimmed display names must be unique within the room (case-insensitive) before the game can start.
- **First round state**: The room has left lobby and entered an active first round with a designated drawer, a chosen secret word, and all participants on the game screen.
- **Drawer**: Exactly one participant per first round who draws and is the only person who may see the secret word.
- **Secret word**: One value from the ordered starter list (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`), at index `(sum of uppercase room-code character codes) mod 5`.
- **Role-specific game view**: The player-visible game snapshot that includes drawer identification for everyone; the drawer’s view shows the secret word, and every guesser’s view shows the placeholder `Guess word` instead.
- **Starter word list**: Fixed, ordered list of five words; no custom or random word packs in this feature.

## Assumptions

- Room setup and lobby behavior (host-only start, two-player minimum, lobby polling, host transfer on disconnect, room isolation) are already implemented and remain in effect.
- “Host (or first player)” means the participant who holds host privileges at the moment of starting the game; in normal flow this is the room creator or the successor host after transfer.
- Name trimming and empty-name rejection apply at game-start time; lobby join/create may still accept raw names, but invalid names must be corrected (or participants must re-join with valid names) before the host can start. The host cannot remove participants with invalid names; start remains blocked until names are fixed or those participants disconnect.
- Deterministic word selection: `index = (sum of uppercase room-code character codes) mod 5` into the ordered starter list; the same room code always yields the same first-round word.
- Only the first round is in scope; drawer rotation, timers, and additional rounds are excluded.
- Scores remain at zero entering the first round; scoring and guess mechanics belong to the gameplay scenario.
- Synchronization uses periodic updates consistent with lobby behavior (~2 second target for detecting state changes).
- Drawing canvas interaction, guess submission, and results are not part of this feature.

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

- Interactive drawing, canvas clear, and stroke sync
- Guess submission, guess history, and scoring
- Result display and restart-to-lobby flows
- Multiple rounds, drawer rotation, timers, or countdowns
- Custom or random word packs beyond the five starter words
- Spectator mode, moderation (including host kick/remove of participants), room passwords, or invite links
- Changing host-election rules beyond join-order transfer already defined in room setup
