# Feature Specification: Round End, Result & Restart

**Plan directory**: `plans/004-round-end-restart/`

## Feature description

When the host ends an active round, the room transitions to a shared result state visible to every participant. In result state, all players see the revealed secret word, each participant’s final round score, and the complete guess history from that round (including correct/incorrect indicators). Drawing and guess submission are no longer available. Only the host may restart the game; restart returns every participant to the lobby with the same player roster preserved (same participants, host assignment, and room code) while clearing all round-specific state so a new first round can begin cleanly.

### Success criteria

- The host can end an active round in one action; within about 2 seconds every participant sees the room in result state without manually refreshing.
- In result state, every participant—including former guessers and the drawer—sees the actual secret word (not the `Guess word` placeholder).
- In result state, every participant sees the same final scores for all players, matching the scores at the moment the round ended.
- In result state, every participant sees the full guess history from the ended round in submission order, with the same correct/incorrect indicators as during play.
- In result state, drawing, canvas clear, and guess submission are unavailable or rejected for all participants.
- Non-host participants cannot end the round or restart the game; only the host sees “End Round” (during `playing`) and “Restart” (during `result`) on the game page button row.
- The host can restart from result state in one action; within about 2 seconds every participant returns to the lobby screen.
- After restart, all participants from the ended round remain in the room with the same display names and host designation; no participant is removed or duplicated.
- After restart, round-specific state is cleared: no drawer assigned, no secret word, no canvas strokes, no guess history, and no round scores; the room is ready for the host to start a new first round under existing game-start rules.
- After restart, non-host participants cannot draw, guess, or see a secret word until the host starts a new game.
- Scores, guess history, and revealed word remain consistent across participants when two browsers poll the same room during result state.
- A participant who refreshes the browser during result state rejoins the same result view with word, scores, and history intact.
- A participant who refreshes after restart lands on the lobby with the preserved player list and no leftover round data.
- When the room enters result state, the existing game page adapts in place (no new route): draw/guess controls are hidden, the secret word is revealed, and scoreboard, guess history, and canvas remain visible with the canvas read-only showing the final drawing.
- A participant who uses “Exit Game” during result state navigates to the lobby locally, remains in the room, and is not redirected back to the game page until the host restarts; after restart they are already on the lobby with cleared round state.
- While room status is `result`, participants on the lobby see the current participant list and a clear status hint that the round has ended and the host must restart (e.g., “Round ended — waiting for host to restart”); the hint is removed after restart when status returns to `lobby`.

## Clarifications

### Session 2026-06-06

- Q: How should the result state be presented in the UI? → A: Same game page adapts — when status is `result`, hide guess/draw controls, reveal word, keep scoreboard/history/canvas read-only.
- Q: When a non-host uses “Exit Game” during result state, what should happen? → A: Stay on lobby until restart — remain in the room; lobby shows current roster; no redirect back to result view.
- Q: What should the lobby show while room status is `result`? → A: Show status hint — participant list plus a message that the round ended and the host must restart.
- Q: Where should host-only End Round / Restart controls appear? → A: Game page button row — “End Round” during `playing`, “Restart” during `result`; non-hosts see neither.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Ends Round and All Players See Results (Priority: P1)

The host concludes the active round. Every participant transitions to a result view that reveals the secret word and shows final outcomes.

**Acceptance Scenarios**:

1. **Given** a round is active with at least two participants, **When** the host chooses “End Round” on the game page button row, **Then** the room enters result state and every participant’s game page adapts to result mode within about 2 seconds without manually refreshing or navigating to a new route.
2. **Given** a round is active, **When** a non-host views the game page, **Then** they do not see an “End Round” control on the button row.
3. **Given** the room is in result state, **When** any participant views their game page, **Then** they see the actual secret word for the ended round (not the `Guess word` placeholder), with draw and guess controls hidden.
4. **Given** the room is in result state, **When** any participant views their screen, **Then** they see each participant’s final round score identical to what was shown when the round ended.
5. **Given** the room is in result state, **When** any participant views their screen, **Then** they see the complete guess history from that round in submission order with visible correct/incorrect indicators for every entry.
6. **Given** the room is in result state, **When** a non-host participant attempts to end the round, **Then** the action is unavailable or rejected and the room remains in result state.
7. **Given** the round had no guesses submitted, **When** the host ends the round, **Then** all participants still see the revealed secret word, all scores at 0, and an empty guess history in result state.

---

### User Story 2 - Result State Freezes Gameplay (Priority: P1)

While results are displayed, no further gameplay actions affect the round outcome.

**Acceptance Scenarios**:

1. **Given** the room is in result state, **When** the former drawer attempts to draw or clear the canvas, **Then** those actions are unavailable or rejected and the displayed canvas reflects the final state at round end.
2. **Given** the room is in result state, **When** a former guesser attempts to submit a guess, **Then** the submission is unavailable or rejected and no new history entry appears.
3. **Given** the room is in result state, **When** any participant receives automatic game-state updates, **Then** the secret word remains revealed, scores do not change, and guess history does not grow.

---

### User Story 3 - Host Restarts to Lobby with Clean Slate (Priority: P1)

From result state, the host restarts the game. Everyone returns to the lobby with players preserved and round data cleared.

**Acceptance Scenarios**:

1. **Given** the room is in result state and the viewer is the host, **When** they choose “Restart” on the game page button row, **Then** the room returns to lobby state and every participant sees the lobby screen within about 2 seconds without manually refreshing.
2. **Given** the room is in result state, **When** a non-host views the game page, **Then** they do not see a “Restart” control on the button row.
3. **Given** the host has restarted from result state, **When** any participant views the lobby, **Then** the participant list matches the roster from before the ended round (same participants, names, and host flag).
4. **Given** the host has restarted from result state, **When** any participant views the lobby, **Then** no drawer is assigned, no secret word is visible, no canvas strokes are shown, no guess history is shown, and no round scores are shown.
5. **Given** the host has restarted from result state, **When** the host starts a new game under existing game-start rules, **Then** a fresh first round begins with scores reset to 0 for everyone, following deterministic drawer and secret-word rules from prior features.
6. **Given** the room is in result state, **When** a non-host participant attempts to restart, **Then** the action is unavailable or rejected and the room remains in result state.

---

### User Story 4 - Synced Result and Restart via Polling (Priority: P2)

Participants stay aligned on result contents and lobby return through periodic game-state updates.

**Acceptance Scenarios**:

1. **Given** two participants are in the same room during result state in separate browsers, **When** one receives an automatic update, **Then** both see the same revealed word, scores, and guess history without manual refresh.
2. **Given** the host restarts while multiple participants are on the result screen, **When** non-host participants receive their next automatic update, **Then** they navigate to the lobby and see the cleared round state.
3. **Given** a participant refreshes the browser during result state, **When** they rejoin the same room, **Then** they see the current result view with word, scores, and full guess history.
4. **Given** a participant refreshes after the host restarted, **When** they rejoin the same room, **Then** they land on the lobby with the preserved player list and no round data.
5. **Given** the room is in result state and a non-host uses “Exit Game”, **When** they land on the lobby, **Then** they remain in the participant list, are not redirected back to the game page, see the lobby roster, and see a status hint that the round ended and the host must restart.
6. **Given** the host has restarted from result state, **When** any participant views the lobby, **Then** the result-state status hint is no longer shown.

---

### Edge Cases

- What happens when the host ends the round immediately after game start with no drawing or guesses? Result state shows the secret word, all scores at 0, and empty guess history; restart still returns everyone to lobby cleanly.
- What happens when the host ends the round after multiple guesses and score changes? Final scores and full history at end time are frozen and shown identically to all players in result state.
- What happens when a non-host tries to end or restart? Action is rejected or unavailable; room state unchanged.
- What happens when the host disconnects during result state? Host transfer follows existing lobby disconnect rules; the new host may restart from result state.
- What happens when a non-host disconnects during result state and reconnects (same session)? They see the current result state on next poll or refresh.
- What happens when the backend restarts during result or after restart? In-memory state is lost; players must create or join again (consistent with room-setup assumptions).
- What happens if a participant uses “Exit Game” during result state? They navigate to the lobby locally, remain in the room with the current roster visible, see a status hint that the round ended and the host must restart, and are not auto-redirected to the game page while status stays `result`; when the host restarts, lobby polling reflects cleared lobby state and the hint is removed (no manual navigation required).
- What happens when the host restarts and immediately starts again? The new first round follows game-start validation (names, uniqueness, two-player minimum) with fresh round state.

## Data Requirements

- **Room status**: Extends lifecycle with a `result` state between active play (`playing`) and return to `lobby`; transitions are host-initiated end (playing → result) and host-initiated restart (result → lobby).
- **Revealed word**: In result state, the secret word is visible to all participants in the word display area; during active play it remains drawer-only per prior features.
- **Final scores**: Snapshot of each participant’s round score at end time; frozen in result state and shown identically to all viewers.
- **Final guess history**: Complete ordered list from the ended round (submitter display name, trimmed guess text, correct/incorrect indicator); frozen in result state; same content all participants see on each update.
- **Round state to clear on restart**: Drawer assignment, secret word, canvas strokes, guess entries, and per-round scores; participant list, host flag, room code, and trimmed display names are preserved.
- **Role gates in result**: No drawing, clearing, or guessing; only the host may end (from playing) or restart (from result).
- **Host controls**: On the game page button row, the host sees “End Round” while status is `playing` and “Restart” while status is `result`; non-hosts see neither control.
- **Result presentation**: No separate result route; the game page renders result mode when status is `result`—revealed word, read-only canvas with final strokes, frozen scoreboard and guess history, and no draw/guess controls.
- **Lobby during result**: Snapshot or lobby view exposes room status so the lobby can show participant list plus a result-state status hint; hint is absent when status is `lobby`.
- **Game-state snapshot**: Player-visible view includes status, participants, and in result state the revealed word, final scores, full guess history, and final canvas strokes; after restart, lobby-appropriate fields only.

## Assumptions

- Room setup, lobby behavior, game start, drawer assignment, secret-word selection, and gameplay interaction (drawing, guessing, scoring) are already implemented (Scenarios 1–3).
- Only one round per game session is in scope; restart clears round state and returns to lobby for a new first round—not automatic multi-round rotation or drawer rotation.
- The host manually ends the round; there is no automatic end trigger (timer, all-correct-guessed, etc.).
- End-round and restart are host-only actions on the game page button row (“End Round” during `playing`, “Restart” during `result`), consistent with host-only game start.
- When the host ends the round, non-host participants remain on the game page, which adapts to result mode when polling detects the status change; when the host restarts, non-host participants on the game page auto-navigate to the lobby (consistent with lobby-to-game transition behavior). Participants who used “Exit Game” during result already on the lobby are not redirected to the game page while status is `result`.
- Synchronization uses periodic game-state updates with about a 2-second target interval.
- Guess history and scoring rules during play match Scenario 3; result state displays that history without modification.
- Host transfer on disconnect during result state follows the same rules as during lobby (next participant by join order).
- Join and re-join while in result state follow existing rules for rooms that have left lobby (blocked for new joiners).

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

- Multiple rounds within one session without returning to lobby (drawer rotation, round counters beyond “Round 1” labeling cleanup)
- Timers, countdowns, or automatic round end when someone guesses correctly
- Speed bonuses, drawer bonuses, or scoring changes at result time
- Leaderboards across sessions, cumulative session scores, or persistent stats
- Custom or random word packs beyond the five starter words
- Spectator mode, moderation, room passwords, or invite links
- Export or share of result summaries
- Chat or non-guess messaging
