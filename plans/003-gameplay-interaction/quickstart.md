# Quickstart: Validate Gameplay Interaction

Manual validation script for Scenario 3 after implementation. Requires Scenarios 1–2 (lobby + game start) working.

## Prerequisites

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Test 1 — Drawer draws; guesser sees strokes

1. Tab A (host/drawer) + Tab B (guesser) start game per Scenario 2 quickstart.
2. Tab A draws several strokes on canvas; complete each stroke (release mouse).
3. **Expect**:
   - Tab A sees strokes immediately while drawing and after release.
   - Tab B sees cumulative drawing within ~2s after each completed stroke (poll replay).
   - Tab B cannot draw on canvas.

## Test 2 — Clear canvas syncs

1. With drawing on canvas, Tab A clicks **Clear**.
2. **Expect**:
   - Tab A canvas empty immediately.
   - Tab B canvas empty within ~2s.

## Test 3 — Valid guess appears in history

1. Tab B submits `test` (wrong word).
2. **Expect**:
   - Both tabs show history entry: Guest / `test` / **incorrect** within ~2s.
   - Guest score remains `0`.

## Test 4 — Empty guess rejected inline

1. Tab B submits whitespace only (`   `).
2. **Expect**:
   - Inline error near guess input (no modal).
   - No new history entry; score unchanged.

## Test 5 — Correct guess scores +100 (case-insensitive)

1. Note drawer’s secret word (e.g. `castle`).
2. Tab B submits `Castle` (different case).
3. **Expect**:
   - History entry marked **correct**.
   - Guest score `100` on both tabs within ~2s.

## Test 6 — Duplicate correct adds 0

1. Tab B submits correct word again.
2. **Expect**:
   - Second history entry marked correct.
   - Guest score still `100` (not 200).

## Test 7 — Incorrect after correct

1. Tab B submits wrong guess after scoring.
2. **Expect**:
   - History shows incorrect entry.
   - Score remains `100`.

## Test 8 — Drawer cannot guess

1. Tab A (drawer) attempts guess form.
2. **Expect**:
   - Input disabled or submission rejected; no drawer entries in history.

## Test 9 — Two guessers score independently

1. Add Tab C as third player (if supported) OR use two guessers in 3-player room.
2. Each submits correct word.
3. **Expect**: Each scoring guesser reaches `100` independently.

## Test 10 — Mid-round refresh restores state

1. With strokes, guesses, and scores present, refresh Tab B.
2. **Expect**:
   - Canvas replays strokes.
   - Full guess history with indicators.
   - Correct scores for all players.

## Test 11 — Mid-stroke not visible to guessers

1. Tab A starts stroke (mouse down, dragging) without releasing.
2. **Expect**:
   - Tab A sees in-progress line.
   - Tab B does **not** show partial stroke until Tab A releases.

## Build check

```bash
cd backend && npm run build
cd frontend && npm run build
```

Both must succeed before checkpoint sign-off.
