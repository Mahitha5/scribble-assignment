# Quickstart: Validate Round End, Result & Restart

Manual validation script for Scenario 4 after implementation. Requires Scenarios 1–3 working.

## Prerequisites

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Setup

1. Tab A (host) creates room; Tab B joins with different name.
2. Host starts game; play briefly — drawer draws, guesser submits at least one correct and one incorrect guess.
3. Note secret word on drawer tab and final scores.

## Test 1 — Host ends round; all see results

1. Tab A (host) clicks **End Round**.
2. **Expect** (within ~2s on Tab B):
   - Both tabs stay on `/game` (no new route).
   - Both show actual secret word (not `Guess word`).
   - Scores match pre-end values.
   - Full guess history with correct/incorrect badges.
   - Canvas read-only with final drawing.
   - Draw, clear, and guess controls hidden/disabled.
   - Tab B does **not** see **End Round** or **Restart**.

## Test 2 — Gameplay frozen in result

1. Tab A attempts draw/clear; Tab B attempts guess.
2. **Expect**: Actions unavailable or rejected; history and scores unchanged after poll.

## Test 3 — Host restarts; all return to lobby

1. Tab A clicks **Restart**.
2. **Expect** (within ~2s):
   - Tab A on `/lobby`.
   - Tab B auto-navigates from game to `/lobby`.
   - Same participant list and host flag.
   - No word, strokes, history, or scores on lobby/game views.
   - Host can **Start Game** again.

## Test 4 — Fresh round after restart

1. Host starts new game.
2. **Expect**: Scores 0; new round per Scenario 2 rules; drawer/word assignment deterministic.

## Test 5 — Exit Game during result

1. Play a round; host ends.
2. Tab B clicks **Exit Game** → lands on lobby.
3. **Expect**:
   - Tab B still in participant list.
   - Status hint: `Round ended — waiting for host to restart`.
   - Tab B **not** redirected back to game while status is `result`.
4. Host clicks **Restart**.
5. **Expect**: Tab B lobby hint removed; normal lobby state.

## Test 6 — Refresh during result

1. End round; refresh Tab B browser on game page.
2. **Expect**: Result view restored — word, scores, history, canvas.

## Test 7 — Non-host cannot end or restart

1. During `playing`, Tab B has no **End Round** button.
2. During `result`, Tab B has no **Restart** button.
3. Direct API calls as non-host return 403.

## Test 8 — Two-browser sync

1. End round with both on game page.
2. **Expect**: Identical word, scores, history on both tabs without manual refresh.

## Build check

```bash
cd backend && npm run build
cd frontend && npm run build
```

Both must succeed before handoff.
