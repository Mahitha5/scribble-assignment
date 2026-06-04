# Feature Specification: Game Start & Drawer Flow

## Feature description

When the host starts a multiplayer drawing game from the lobby, the system preserves participant display names as stored in the lobby (as-is per room-management, no trim), transitions all players into the active game, assigns the first-round drawer, and selects a secret word from the fixed starter vocabulary. Only the drawer may see the secret word; all other participants see that a round is in progress but cannot view the word until a later result phase (out of scope here).

This feature depends on room setup and lobby behavior (host-only start with at least two players) and does not include drawing, guessing, scoring, round rotation, or restart flows.

## Clarifications

### Session 2026-06-04

- Q: What stable inputs define deterministic first-round word selection? → A: Room code only — participant list and join order are ignored when computing the word index.
- Q: How do clients move from lobby to game when start succeeds? → A: Auto-navigate on poll — any client on the lobby that observes active game phase routes to the game view automatically.
- Q: How is the secret word delivered so guessers never see it? → A: Server-side omission — the secret word is included in a client’s game snapshot only when the requesting participant is the drawer.
- Q: Should empty or whitespace-only player names block game start? → A: No — align with room-management (FR-016): names stay as-is from lobby; never assign server defaults; never reject start for name content.
- Q: Are server default names or duplicate-name blocking used? → A: No defaults in backend; duplicate display names are allowed (FR-017).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Player Names Preserved at Game Start (Priority: P1)

Before the first round begins, participant display names remain exactly as stored in the lobby (no trim). The backend does not assign defaults.

**Independent Test**: Two players join (one with blank name → `""`, one as `"  Ali  "`); host starts; verify names unchanged in the active round.

**Acceptance Scenarios**:

1. **Given** at least two players are in the lobby and the host initiates game start, **When** participants have stored names (including empty), **Then** the game start proceeds and names are unchanged
2. **Given** a participant’s lobby name is whitespace-only (e.g. `"   "`), **When** the host starts the game, **Then** that exact string remains and start proceeds
3. **Given** a participant’s lobby name has leading or trailing spaces, **When** the host starts the game, **Then** those spaces are still shown in the active round

---

### User Story 2 - First-Round Drawer Assignment (Priority: P1)

When the first round begins, one player is clearly designated as the drawer while everyone else is a guesser.

**Independent Test**: Host starts a two-player game; verify exactly one player is labeled as drawer and that player matches the **current room host** at start time (after any host transfer in the lobby).

**Acceptance Scenarios**:

1. **Given** a valid game start with two or more players, **When** the first round begins, **Then** the room host is assigned the drawer role for that round
2. **Given** the first round is active, **When** any participant views the game screen, **Then** they can clearly identify who the drawer is (by name and/or role label)
3. **Given** the first round is active, **When** a non-drawer participant views the game screen, **Then** they see themselves as a guesser and are not shown drawer-only controls for the secret word

---

### User Story 3 - Deterministic Secret Word Selection (Priority: P1)

The system chooses exactly one secret word for the first round from the fixed starter list, using a predictable rule derived from the room code alone so the same room code always receives the same word for its first round.

**Independent Test**: Start the same room code twice in separate test sessions and confirm the selected word is identical each time; start two different room codes and confirm words can differ.

**Acceptance Scenarios**:

1. **Given** the host starts the first round, **When** the round becomes active, **Then** the secret word is chosen from the starter vocabulary: `rocket`, `pizza`, `castle`, `guitar`, `sunflower`
2. **Given** the same room code as a prior successful first-round start, **When** the first round begins again in a fresh session, **Then** the same secret word is selected (deterministic from room code only, not random per attempt)
3. **Given** two different room codes, **When** each host starts the first round, **Then** each room’s word is computed from its own room code and may differ from other rooms

---

### User Story 4 - Drawer-Only Secret Word Visibility (Priority: P1)

The secret word must never be revealed to guessers during the active drawing round.

**Independent Test**: Open two browser sessions (drawer and guesser); after game start, confirm only the drawer’s session displays the secret word.

**Acceptance Scenarios**:

1. **Given** the first round is active and a player is the drawer, **When** they view the game screen, **Then** they can read the current secret word on their screen
2. **Given** the first round is active and a player is a guesser, **When** they view the game screen, **Then** they do not see the secret word (placeholder or omission is acceptable)
3. **Given** guessers refresh or receive automatic game-state updates on the standard polling cadence (~2 seconds), **When** updates arrive, **Then** the server response omits the secret word field entirely (not merely hidden in the UI)

---

### User Story 5 - Transition from Lobby to Active Game (Priority: P2)

All participants move from the lobby into the game together once start succeeds. Any client still on the lobby automatically navigates to the game view when polling reports the room has entered the active game phase.

**Independent Test**: Two tabs in the same room; host starts; both tabs land on the game view within a few seconds without manual refresh or an “Enter game” button.

**Acceptance Scenarios**:

1. **Given** a host successfully starts the game, **When** the round becomes active, **Then** every participant’s client on the lobby auto-navigates to the game view on the next poll (within ~2–3 seconds)
2. **Given** participants are on the game view, **When** game state is refreshed on the standard polling cadence, **Then** all players see consistent drawer identification and round status
3. **Given** a non-host is waiting in the lobby, **When** the host starts the game, **Then** the non-host’s client auto-navigates to the game view on poll without pressing start or any manual navigation control

---

### Edge Cases

- What happens if the host tries to start with only one player? → Start remains blocked (inherited from lobby rules); this feature does not apply until the minimum player count is met
- What happens if a participant’s stored name is a single character? → Allowed (stored as-is; no trim)
- What happens when two participants have the same display name? → Allowed; drawer is still identified by role/host, not unique name (FR-017)
- How is the drawer identified if host privileges were transferred before start? → The current host at start time becomes the drawer for the first round
- Can guessers infer the word from shared game-state updates? → Server MUST omit the secret word from guesser snapshots on every poll; client-side hiding alone is insufficient
- What happens if start is requested while another start is in progress? → Only one transition occurs; clients converge on the active round via polling
- What if a participant is not on the lobby route when the game starts? → When they next poll room state and the phase is active, they MUST be routed to the game view (same auto-navigate rule)
- What happens when the backend restarts mid-round? → In-memory state is lost; players must re-create or re-join rooms (inherited platform constraint)
- What happens if a participant’s stored name is whitespace-only at start? → Preserved as-is; start is not blocked

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST preserve participant display names exactly as stored in the lobby when the active round begins (no trimming)
- **FR-002**: System MUST NOT assign server default display names at game start; game start MUST NOT be rejected based on name content (including empty or whitespace-only)
- **FR-003**: System MUST allow game start only when the lobby already satisfies the minimum of two participants and host-only start control (per room-management behavior)
- **FR-004**: System MUST transition all participants in the room from lobby to active game state when start succeeds; any client with an active room session MUST auto-navigate to the game view when polling observes the active game phase—including clients not currently on the lobby route (no manual “enter game” step)
- **FR-005**: System MUST assign the drawer role for the first round to the current room host at the moment start succeeds
- **FR-006**: System MUST assign guesser role to every other participant for the first round
- **FR-007**: System MUST expose drawer identity to all participants in a way that is obvious in the game UI (name and/or role label)
- **FR-008**: System MUST select the first-round secret word exclusively from the starter list: `rocket`, `pizza`, `castle`, `guitar`, `sunflower`
- **FR-009**: System MUST select the secret word deterministically from the room code only (participant list and join order MUST NOT affect the selection) so repeated first-round starts for the same room code always yield the same word
- **FR-010**: System MUST include the secret word in a participant’s game snapshot only when that participant is the drawer; the drawer MUST see the word on their game screen
- **FR-011**: System MUST omit the secret word from game snapshots delivered to guessers (server-side omission on every poll/request, not client-side hiding alone)
- **FR-012**: System MUST keep drawer and guesser roles synchronized for all participants via the same polling-based refresh model used in the lobby
- **FR-013**: System MUST initialize first-round gameplay metadata (active round, roles, selected word for drawer-side use) atomically at start so clients do not observe partial state

### Data Requirements

The feature extends in-memory room state with:

- Game phase indicator (lobby vs active first round)
- Per-participant role (`drawer` or `guesser`) for the current round
- Secret word for the current round (stored server-side; included in per-participant snapshots only when the requesting participant is the drawer)
- Display names for all participants unchanged from lobby at start (no renaming to defaults)
- Room code as the sole input for deterministic word selection

### Key Entities

- **Active Round**: A single in-progress drawing round with one drawer, one secret word, and guessers; no multi-round rotation in this feature
- **Participant Role**: Either `drawer` or `guesser` for the active round; exactly one drawer per room
- **Secret Word**: A value from the starter vocabulary bound to the active round and visibility rules
- **Game Snapshot**: Per-requesting-participant room state; drawer snapshots include the secret word, guesser snapshots omit it entirely at the server

## Assumptions

- Room creation, join, host designation, lobby polling, and host-only start with a two-player minimum are already available from the room-management feature
- Player naming follows `specs/001-room-management` FR-016/FR-017: as-is storage, no trim, duplicates allowed, no backend defaults
- “First player” in the business scenario means the room host when start succeeds; host transfer before start updates who becomes drawer
- Only one first round exists per game session in this lab; drawer rotation and additional rounds are out of scope
- Standard ~2 second polling applies to the game view as in the lobby
- Starter vocabulary is fixed to the five words listed above; no custom word packs

## Success Criteria *(mandatory)*

- **Name preservation**: 100% of game-start attempts keep lobby display names unchanged (including whitespace-only strings); no server-assigned default names appear after start
- **Start cohesion**: When start succeeds, all participants in the room see the active game state within 3 seconds without manual reload
- **Drawer clarity**: In moderated usability checks, 95% of participants correctly identify the drawer on first viewing the game screen
- **Word privacy**: In dual-session tests, 0% of guesser poll responses contain the secret word field during the active round across at least 10 poll cycles, and 0% of guesser UIs display it
- **Determinism**: Repeating first-round start with the same room code produces the same secret word in 100% of trials, regardless of who joined or in what order
- **Vocabulary compliance**: 100% of assigned secret words belong to the starter list

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

- Canvas drawing, clear-canvas, and stroke sync (gameplay interaction feature)
- Guess submission, guess history, scoring, and correct-guess detection
- Round end, result screen, final word reveal to all players, and restart-to-lobby
- Drawer rotation, timers, countdowns, bonus scoring, or multiple rounds
- Custom or random word packs beyond the five starter words
- Spectator mode, chat, moderation, and room passwords
- Re-validating or changing player names after the round has started (names are fixed at start for this round)
- Server default display names (`player1`, `player2`, …) and duplicate-name rejection
