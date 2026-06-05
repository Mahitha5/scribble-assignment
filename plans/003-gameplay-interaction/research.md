# Research: Gameplay Interaction

**Feature**: `plans/003-gameplay-interaction` (spec: `specs/003-gameplay-interaction/spec.md`)  
**Date**: 2026-06-05  
**Builds on**: `plans/002-game-start-drawer`

## 1. Canvas sync model

**Decision**: Store an ordered `strokes: StrokeSegment[]` on `Room`. Drawer appends one segment per completed stroke. All clients render by replaying the full list. Clear empties the array.

**Rationale**: Clarification session answer A; efficient for polling; matches spec “replay all strokes”; no image encoding/decoding.

**Alternatives considered**:
- *Full canvas bitmap snapshot*: Heavier payloads; rejected in clarification.
- *Hybrid image for guessers*: Unnecessary complexity for lab scope.

## 2. Stroke persistence timing

**Decision**: Client POSTs stroke to server on **mouseup/touchend** only. In-progress stroke is local to drawer until complete.

**Rationale**: Clarification session answer A; reduces request volume; guessers see completed strokes within ~2s poll after append.

**Alternatives considered**:
- *Stream points during drag*: More requests; no spec benefit.
- *Batch on poll interval only*: Would delay drawer persistence oddly; rejected.

## 3. Stroke coordinate system

**Decision**: Store points as **normalized coordinates** `{ x: number, y: number }` in range 0–1 relative to canvas width/height at draw time. Replay multiplies by current canvas client dimensions.

**Rationale**: Resilient to minor layout differences between drawer and guesser viewports; common canvas pattern.

**Alternatives considered**:
- *Absolute pixel coords*: Breaks on resize; rejected.
- *SVG path strings*: Equivalent expressiveness; normalized points simpler with existing canvas API.

## 4. Stroke segment shape

**Decision**: Minimal segment:

```typescript
interface StrokeSegment {
  id: string;           // uuid
  points: { x: number; y: number }[];
  color: string;        // default "#000000"
  lineWidth: number;    // default 4
}
```

**Rationale**: Sufficient for basic drawable strokes per spec; no brush palette requirement.

**Alternatives considered**:
- *Single line from/to*: Insufficient for curved freehand paths.
- *Pressure/width per point*: Out of scope.

## 5. Guess validation and feedback

**Decision**: Server trims guess text. Empty-after-trim → **400** `Guess cannot be empty`. Client shows **inline error** near guess input (no modal).

**Rationale**: Clarification session answer A; aligns with 001/002 validation UX patterns.

**Alternatives considered**:
- *Modal alert*: Rejected in clarification.
- *Client-only trim without server reject*: Fails API inspection tests.

## 6. Scoring — first correct only

**Decision**: On each guess, compute `isCorrect` via case-insensitive trimmed compare to `secretWord`. Award `scoredPoints = 100` only if `isCorrect && !participantAlreadyHasScoringCorrectGuess`. Otherwise `scoredPoints = 0`. Update `scores[participantId]` cumulatively (max 100 per round per spec).

**Rationale**: Clarification session answer B; prevents duplicate correct farming while still logging later correct entries as correct in history.

**Alternatives considered**:
- *+100 per every correct submission*: Rejected in clarification.
- *Block guesses after first correct*: Rejected; spec allows multiple guesses.

## 7. Guess history shape

**Decision**: Append-only `guesses` array on `Room`. Snapshot exposes `GuessView`: `{ id, playerName, text, isCorrect, scoredPoints, submittedAt }`. UI shows correct/incorrect indicator per entry.

**Rationale**: Clarification session answer A; shared identical history on every poll.

**Alternatives considered**:
- *Hide incorrect guesses*: Rejected; spec shows all accepted guesses.
- *Separate score-only channel*: Duplicates snapshot surface.

## 8. Role enforcement

**Decision**: Server-side gates:
- `appendStroke` / `clearCanvas`: caller must be `drawerId` and `status === "playing"`.
- `submitGuess`: caller must not be `drawerId`; must be known participant.

**Rationale**: Constitution: host/drawer rules enforced server-side; UI disable is additive only.

## 9. Gameplay field initialization

**Decision**: Set `strokes = []`, `guesses = []`, `scores = Object.fromEntries(participants.map(p => [p.id, 0]))` inside successful `startGame` before `status = "playing"`.

**Rationale**: Spec: all scores start at 0 when round begins; clean slate per round.

## 10. Mutation vs poll strategy

**Decision**: Drawer POSTs stroke/clear immediately on action. Guessers (and all clients) converge via existing 2000ms `GET /rooms/:code` poll. Mutation responses may return updated snapshot for caller optimistic sync; poll remains canonical for multi-client alignment.

**Rationale**: Constitution HTTP polling only; no push; POST + GET is standard lab pattern.

**Alternatives considered**:
- *Poll-only mutations via queued actions*: Over-engineered.
- *Return stroke in POST only, omit from GET*: Breaks guesser sync.

## 11. Guess history UI placement

**Decision**: Reuse `ResultPanel` (“Activity”) for ordered guess history with correct/incorrect badges; keep `Scoreboard` for numeric scores.

**Rationale**: Starter already has placeholder regions; minimal new layout churn.

**Alternatives considered**:
- *New `GuessHistory` component*: Acceptable alias; may extract from `ResultPanel` if cleaner.

## 12. Canvas component responsibilities

**Decision**: Single `DrawingCanvas` component with `mode: "draw" | "view"`. Drawer: pointer handlers + Clear button. View: replay strokes from props only; `pointer-events: none`.

**Rationale**: One replay implementation; role prop from `viewerRole`.
