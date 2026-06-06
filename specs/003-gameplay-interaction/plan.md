# Implementation Plan: Gameplay Interaction

**Input**: Feature specification from `specs/003-gameplay-interaction/spec.md`

**Feature directory**: `specs/003-gameplay-interaction/`

## Summary

Extend the active first round (Scenario 2) with full gameplay: drawer draws on an HTML canvas and clears it; guessers submit guesses; all state syncs via existing `GET /rooms/:code` polling (~2s). Drawing uses an **incremental ordered stroke list** appended on **stroke complete** (mouseup/touchend). Guess submission trims input, rejects empty guesses with **inline errors**, compares case-insensitively to `secretWord`, records history with **correct/incorrect indicators**, and awards **+100 only on each guesser’s first correct guess** (+0 otherwise). Drawer cannot guess; guessers have read-only canvas.

Technical approach: add `strokes`, `guesses`, and `scores` to in-memory `Room`; add `POST /rooms/:code/strokes`, `POST /rooms/:code/canvas/clear`, and `POST /rooms/:code/guesses`; extend `RoomSnapshot` and `startGame` initialization; replace canvas/guess/scoreboard placeholders with `DrawingCanvas`, wired `GuessForm`, `Scoreboard`, and `GuessHistory` (or enhanced `ResultPanel`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **TypeScript-First**: Changes stay in typed TS/ESM in `backend/` and `frontend/`
- [x] **REST + Zod**: New mutation endpoints + extended snapshot; all payloads Zod-validated
- [x] **React + Vite patterns**: Extend `RoomStore`, hooks, and game components; no new state libraries
- [x] **HTTP polling only**: Canvas/guesses/scores sync via `GET /rooms/:code` (~2000ms); strokes/guesses mutate via POST only
- [x] **In-memory only**: `strokes`, `guesses`, `scores` on `Room` in `roomStore` Map only
- [x] **Brownfield scope**: Builds on 001–002; deterministic scoring per constitution V

**Post-design re-check**: Drawer-only draw/clear enforced server-side. Guesser-only guess enforced server-side. `secretWord` never compared client-side for authority—server scores guesses. No round-end/result/restart in this slice. No WebSockets or new deps.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Zod, tsx, Vitest |
| Frontend | React 18, React Router 6, Vite, TypeScript, Vitest, HTML `<canvas>` |
| Sync | HTTP polling via REST (`GET /rooms/:code`, etc.) |
| Storage | In-memory services in `backend/src/services/`; client session in `localStorage` |

## Architecture

### Data Flow

1. **Round bootstrap (enhanced `startGame`)**: On successful start → initialize `strokes: []`, `guesses: []`, `scores: { [participantId]: 0 }` for all participants (existing drawer/word assignment unchanged).
2. **Drawer draws**: Pointer down/move/up on canvas → drawer sees stroke locally in real time → on **mouseup/touchend** → `POST /rooms/:code/strokes` with normalized point list → server verifies drawer, appends `StrokeSegment` → returns updated snapshot (optional) or client relies on poll.
3. **Drawer clears**: Click Clear → local canvas cleared immediately → `POST /rooms/:code/canvas/clear` → server empties `strokes` → guessers see empty canvas on next poll (~2s).
4. **Guessers view canvas**: `useGamePolling` (2000ms) → `GET /rooms/:code` → snapshot includes `strokes` → `DrawingCanvas` replays full stroke list (read-only).
5. **Guess submission**: Guesser submits → `POST /rooms/:code/guesses` with `{ participantId, text }` → server trims, rejects empty (400 + message), rejects drawer (403), evaluates correctness, applies first-correct-only scoring, appends `GuessEntry` → client shows inline error on 400 or clears input on success.
6. **History & scores sync**: Same poll snapshot includes `guesses` (name, trimmed text, `isCorrect`) and per-participant `scores` → `Scoreboard` + guess history panel update for all roles within ~2s.
7. **Session restore**: Refresh mid-round → `fetchRoom` returns cumulative strokes, guesses, scores; canvas replays; history intact.

### API Contracts

See `specs/003-gameplay-interaction/contracts/rooms-api.md` for new endpoints and extended snapshot fields.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/rooms/:code/strokes` | Drawer appends completed stroke |
| `POST` | `/rooms/:code/canvas/clear` | Drawer clears stroke list |
| `POST` | `/rooms/:code/guesses` | Guesser submits guess |
| `GET` | `/rooms/:code` | Extended playing snapshot: `strokes`, `guesses`, `scores` |

### File Structure

**Backend**

| File | Change |
|------|--------|
| `backend/src/models/game.ts` | Add `Point`, `StrokeSegment`, `GuessEntry`, `ParticipantScore`; extend `Room` and `RoomSnapshot` |
| `backend/src/api/schemas.ts` | Zod schemas for stroke, clear, guess bodies |
| `backend/src/api/rooms.ts` | Register three new routes; map new `RoomStoreError` codes |
| `backend/src/services/roomStore.ts` | `appendStroke`, `clearCanvas`, `submitGuess`, scoring helpers; init gameplay fields in `startGame`; extend `toRoomSnapshot` |
| `backend/src/services/roomStore.test.ts` | Tests: stroke append/clear auth, guess trim/score/history, first-correct-only, drawer blocked |

**Frontend**

| File | Change |
|------|--------|
| `frontend/src/services/api.ts` | Types + `appendStroke`, `clearCanvas`, `submitGuess` |
| `frontend/src/state/roomStore.ts` | Wrapper methods for gameplay mutations |
| `frontend/src/components/DrawingCanvas.tsx` | **New** — canvas draw (drawer) / replay (all); clear button |
| `frontend/src/components/GuessForm.tsx` | Wire submit API; inline empty error; disable for drawer |
| `frontend/src/components/Scoreboard.tsx` | Render `scores` from snapshot |
| `frontend/src/components/ResultPanel.tsx` | Render guess history with correct/incorrect indicators |
| `frontend/src/pages/GamePage.tsx` | Replace placeholders; pass `viewerRole`; integrate `DrawingCanvas` |
| `frontend/src/app.css` | Minimal canvas/history styles if needed |

## Implementation Sequence

1. **Models** — `StrokeSegment`, `GuessEntry`, `scores` map; snapshot view types.
2. **`startGame` init** — zero scores, empty strokes/guesses arrays.
3. **Pure helpers** — `trimGuess`, `isCorrectGuess`, `computeGuessPoints` (first-correct-only), `normalizeStrokePoints`.
4. **`appendStroke` / `clearCanvas`** — drawer auth; mutate `room.strokes`.
5. **`submitGuess`** — guesser auth; empty reject; score + history append.
6. **`toRoomSnapshot` extension** — include `strokes`, `guesses`, `scores` when `playing`.
7. **API routes + Zod + error mapping** — 400 empty guess, 403 wrong role, 404/409 unchanged.
8. **Backend tests** — scoring, history, role gates, stroke ordering.
9. **Frontend API + store methods**.
10. **`DrawingCanvas`** — local draw + POST on stroke complete; poll replay for guessers; clear.
11. **`GuessForm` / `Scoreboard` / `ResultPanel`** — bind snapshot fields.
12. **`GamePage` integration** — role-aware props.
13. **Manual validation** — two-browser script in `quickstart.md`.

## Dependencies

No new npm packages. Builds on 001 lobby and 002 game-start (`drawerId`, `secretWord`, `useGamePolling`).

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Canvas flicker on poll replay | Full replay from stroke list; drawer merges server strokes without clearing in-progress local stroke |
| Coordinate mismatch across clients | Normalize points to 0–1 relative to canvas dimensions |
| Double +100 on duplicate correct | Server tracks prior scoring correct per `participantId` before awarding points |
| Drawer guesses via API | Server rejects with 403; UI disables form |
| Large stroke lists over poll | Single round, lab scale; no optimization required in scope |
| Client-side scoring drift | Server is source of truth; snapshot drives UI |

## Related Artifacts

- `specs/003-gameplay-interaction/research.md` — design decisions
- `specs/003-gameplay-interaction/data-model.md` — entity extensions
- `specs/003-gameplay-interaction/contracts/rooms-api.md` — REST contract delta
- `specs/003-gameplay-interaction/quickstart.md` — manual test script
- `specs/002-game-start-drawer/` — prerequisite drawer/word/polling
