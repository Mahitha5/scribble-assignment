# Feature Specification: Gameplay Interaction

**Plan directory**: `plans/003-gameplay-interaction/`

## Feature description

During an active first round, the designated drawer can draw on an interactive canvas and clear it; guessers can submit text guesses while the round is in progress. All participants enter the round with scores at zero. The drawer sees their strokes on the canvas as they draw; every participant—including guessers—receives the current drawing through periodic game-state updates. Drawing is synced as an ordered list of stroke segments: when the drawer completes a stroke (mouseup/touchend), that stroke is appended to shared round state; other players reconstruct the canvas by replaying all strokes from that list. Guess submissions are trimmed before validation; empty or whitespace-only guesses are rejected with clear feedback. Valid guesses are compared to the secret word case-insensitively after trimming. Every valid guess is recorded in a shared guess history visible to all players via the same periodic updates. A guesser’s first correct guess in the round adds 100 points to their score; incorrect guesses and any later correct duplicate guesses from the same guesser add 0.

### Success criteria

- The drawer can draw on the canvas during an active round and always sees the current drawing on their screen, including strokes they just made.
- Within about 2 seconds of the drawer drawing or clearing, every other participant sees the updated canvas state on their game screen.
- The drawer can clear the canvas during an active round; after the next sync, all participants see an empty canvas.
- A guesser who submits a non-empty guess after trimming sees that guess appear in the shared guess history for all players within about 2 seconds.
- Empty or whitespace-only guess submissions are rejected every time with a clear inline error near the guess input (no modal); no history entry is created and the score is unchanged.
- A guesser’s first correct guess (matching the secret word after trimming and case-insensitive comparison) awards exactly 100 points; incorrect guesses award 0 points.
- A guesser who already received 100 points from a first correct guess earns 0 additional points from further correct duplicate guesses, though those guesses still appear in history marked correct.
- After any number of guesses, each participant’s displayed score is 100 if they have at least one scoring correct guess in the round, otherwise 0 (only the first correct guess per guesser counts).
- The drawer cannot submit guesses; guess submission is available only to non-drawer participants during the active round.
- Guess history lists guesses in submission order with the guesser’s display name and trimmed guess text; all players see the same history on each refresh.
- Scores and guess history remain consistent across participants when two browsers poll the same room during manual testing.
- Every guess history entry visibly indicates whether that guess was correct or incorrect for all participants.
- After sync, every non-drawer participant’s canvas matches the drawer’s canvas by replaying the same ordered stroke list.
- Each completed drawer stroke is appended to shared state once (on stroke complete); in-progress strokes are visible locally to the drawer immediately but appear to other players only after that stroke is appended and their next sync occurs.

## Clarifications

### Session 2026-06-05

- Q: Should guess history show whether each guess was correct or incorrect? → A: Yes — each history entry shows whether it was correct or incorrect.
- Q: If the same guesser submits the secret word correctly more than once, how should scoring work? → A: +100 only on the first correct guess per guesser; later correct duplicate guesses add 0 but still appear in history.
- Q: How should drawing data be synced between players? → A: Incremental strokes — drawer appends stroke segments to shared state; other players replay all strokes to render the canvas.
- Q: When should the drawer persist a stroke to shared round state? → A: On stroke complete — append one segment when the drawer finishes a stroke (mouseup/touchend).
- Q: How should empty-guess rejection feedback be shown to the guesser? → A: Inline error near the guess input (no modal).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawer Draws and Clears Canvas (Priority: P1)

The drawer uses an interactive canvas to illustrate the secret word. They see their drawing immediately, and all players receive the latest canvas through automatic game-state updates.

**Acceptance Scenarios**:

1. **Given** a round is active and the viewer is the drawer, **When** they draw strokes on the canvas, **Then** those strokes are visible on their canvas without leaving the game screen (including while a stroke is still in progress).
2. **Given** a round is active and the drawer completes a stroke, **When** a guesser’s game screen receives its next automatic update, **Then** the guesser sees that completed stroke as part of the replayed drawing (within about 2 seconds of stroke completion).
3. **Given** a round is active and the viewer is the drawer, **When** they choose to clear the canvas, **Then** their canvas becomes empty immediately.
4. **Given** the drawer has cleared the canvas, **When** any guesser receives the next automatic update, **Then** they see an empty canvas.
5. **Given** a round is active and the viewer is a guesser, **When** they attempt to draw or clear the canvas, **Then** they cannot modify the canvas (read-only view).
6. **Given** the drawer has appended multiple strokes to shared state, **When** a guesser receives the next automatic update, **Then** their canvas shows the same picture as the drawer’s by replaying the full ordered stroke list.

---

### User Story 2 - Guessers Submit Valid Guesses (Priority: P1)

Non-drawer participants submit text guesses during the round. Valid guesses enter shared history; invalid empty submissions are blocked.

**Acceptance Scenarios**:

1. **Given** a round is active and the viewer is a guesser, **When** they submit a guess with non-whitespace content, **Then** the guess is accepted and appears in guess history with their display name and the trimmed guess text.
2. **Given** a guesser submits `"  Rocket  "`, **When** the guess is recorded, **Then** the history shows the trimmed text `"Rocket"` (no leading or trailing whitespace).
3. **Given** a round is active, **When** a guesser submits an empty or whitespace-only guess, **Then** the submission is rejected with a clear inline error near the guess input (no modal), no new history entry is added, and their score is unchanged.
4. **Given** a round is active and the viewer is the drawer, **When** they attempt to submit a guess, **Then** guess submission is unavailable or rejected; the drawer cannot add entries to guess history.
5. **Given** a guesser has submitted a valid guess, **When** any participant views the game screen after the next automatic update, **Then** they see that guess in the shared history in submission order with a visible correct or incorrect indicator.
6. **Given** a guesser submits a correct guess, **When** any participant views guess history after sync, **Then** that entry is marked as correct; an incorrect guess entry is marked as incorrect.

---

### User Story 3 - Case-Insensitive Scoring (Priority: P1)

Guesses are evaluated against the secret word using trimmed, case-insensitive comparison. Correct guesses award 100 points; incorrect guesses award 0.

**Acceptance Scenarios**:

1. **Given** the secret word is `rocket` and a guesser submits `Rocket`, **When** the guess is processed, **Then** it is treated as correct and that guesser’s score increases by 100.
2. **Given** the secret word is `pizza` and a guesser submits `burger`, **When** the guess is processed, **Then** it is treated as incorrect and that guesser’s score increases by 0 (remains unchanged if no prior correct guesses).
3. **Given** all participants entered the round with score 0, **When** one guesser submits a correct guess and another submits an incorrect guess, **Then** the correct guesser’s score is 100 and the incorrect guesser’s score remains 0.
4. **Given** a guesser has already scored 100 from a correct guess in this round, **When** they submit another incorrect guess, **Then** their score remains 100 and the incorrect guess still appears in history with no additional points.
5. **Given** two different guessers each submit a correct guess for the same secret word, **When** both guesses are processed, **Then** each guesser’s score increases by 100 (both at 100 if they started at 0).
6. **Given** a guesser has already scored 100 from a first correct guess, **When** they submit the secret word correctly again, **Then** the duplicate entry appears in history marked correct but their score remains 100.

---

### User Story 4 - Synced Guess History and Scores via Polling (Priority: P2)

All players stay aligned on canvas state, guess history, and scores through periodic game-state updates without manual refresh.

**Acceptance Scenarios**:

1. **Given** two participants are in the same active round in separate browsers, **When** one guesser submits a valid guess, **Then** the other participant sees the new history entry within about 2 seconds without manually refreshing.
2. **Given** a correct guess is submitted, **When** all participants receive their next automatic update, **Then** every participant sees the same updated score for that guesser.
3. **Given** the drawer draws and a guesser submits a guess in quick succession, **When** participants poll, **Then** they receive a consistent snapshot that includes both the latest canvas and the latest guess history.
4. **Given** a participant refreshes the browser mid-round, **When** they rejoin the same room’s game screen, **Then** they see the current canvas, cumulative guess history, and up-to-date scores for all participants.

---

### Edge Cases

- What happens when the drawer draws many strokes quickly? Each completed stroke is appended in order; guessers converge on the cumulative replayed drawing within about 2 seconds of the last completed stroke being appended.
- What happens while the drawer is mid-stroke (pointer still down)? The drawer sees the in-progress stroke locally; other players do not receive that partial stroke until the drawer completes it and it is appended to shared state.
- What happens when the drawer clears after drawing? Shared stroke list is emptied; all participants eventually see an empty canvas with no prior strokes after sync.
- What happens when a guesser submits only spaces or tabs? Submission is rejected with a clear inline error near the guess input; no history entry and no score change.
- What happens when a guess differs only by case from the secret word (e.g., `CASTLE` vs `castle`)? It is scored as correct (+100).
- What happens when a guess has leading/trailing spaces but correct content (e.g., `"  guitar  "`)? After trimming, it is compared case-insensitively and scored accordingly.
- What happens when the same guesser submits multiple guesses? Each valid guess appears in history in order; only the first guess per guesser that matches the secret word after trim and case-insensitive comparison adds 100 points; later correct duplicates add 0.
- What happens when the drawer disconnects mid-round? Behavior follows existing disconnect rules from prior features; gameplay interaction does not introduce new host-transfer rules during an active round.
- What happens when the backend restarts during an active round? In-memory state is lost; players must create or join again (consistent with room-setup assumptions).
- What happens when a participant tries to guess before any drawing exists? Guess submission still works; an empty canvas is valid.

## Data Requirements

- **Canvas state**: The current drawing for the active round, represented as an ordered list of stroke segments, modifiable only by the drawer, visible to all participants after sync via stroke replay.
- **Stroke segment**: One completed drawable stroke appended by the drawer on stroke complete (mouseup/touchend), e.g., a sequence of points with line styling; stored in submission order as part of shared round state.
- **Stroke list**: Ordered collection of all stroke segments for the current canvas; clearing the canvas empties this list; guessers and reconnecting players render by replaying the full list.
- **Guess**: A trimmed text submission from a non-drawer participant, with submitter identity and timestamp or sequence for ordering.
- **Guess history**: Ordered list of recorded guesses (submitter display name, trimmed guess text, and correct/incorrect indicator) shared identically to all participants on each update.
- **Score**: Non-negative integer per participant for the current round; starts at 0 for everyone when the round begins; increases by 100 on that guesser’s first correct guess only (0 for incorrect guesses and 0 for later correct duplicate guesses from the same guesser).
- **Correctness rule**: A guess is correct if its trimmed form equals the secret word under case-insensitive comparison.
- **Role gate**: Only the drawer may draw or clear; only non-drawer participants may submit guesses.
- **Game-state snapshot**: The player-visible round view including canvas, guess history, scores, drawer identification, and role-appropriate secret-word visibility (per game-start rules).

## Assumptions

- Room setup, lobby behavior, game start, drawer assignment, deterministic secret-word selection, and drawer-only word visibility are already implemented (Scenarios 1–2).
- Only the first round is in scope; drawer rotation, timers, and additional rounds are excluded.
- Scores are per-participant for the current round and start at 0 when the round begins.
- Multiple guesses per guesser are allowed during the round; each valid guess is recorded; only the first correct guess per guesser awards +100; all other guesses award +0 regardless of correctness.
- The round does not automatically end when someone guesses correctly; transition to result state and restart belong to Scenario 4.
- Synchronization uses periodic game-state updates with about a 2-second target interval, consistent with lobby and game-start behavior.
- Guess history shows all accepted guesses; each entry includes a visible correct or incorrect indicator for every participant.
- Empty or whitespace-only guess rejections show an inline error near the guess input, consistent with validation feedback patterns from prior features.
- Canvas is a single shared surface per round; drawing sync uses an incremental ordered stroke list appended on stroke complete (not full image snapshots or in-progress streaming); no layers, colors, or brush-size requirements are specified beyond basic drawable strokes and clear.
- No speed bonuses, drawer bonuses, or partial-credit scoring—only the fixed +100 / +0 rules.

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

- Round end, result screen, showing the revealed secret word to all players, and restart-to-lobby flows
- Multiple rounds, drawer rotation, timers, or countdowns
- Speed bonuses, drawer bonuses, or scoring rules other than +100 correct / +0 incorrect
- Custom or random word packs beyond the five starter words
- Spectator mode, moderation, room passwords, or invite links
- Advanced canvas features (eraser, undo, color palette, brush sizes, image upload)
- Chat or non-guess messaging
