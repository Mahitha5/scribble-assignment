# Research: Game Start & Drawer Flow

**Feature**: `specs/002-game-start-drawer` (spec: `specs/002-game-start-drawer/spec.md`)  
**Date**: 2026-06-05  
**Builds on**: `specs/001-room-setup-lobby`

## 1. Name validation timing and trimming

**Decision**: Validate and trim names only inside `startGame`, not at join/create. On successful start, overwrite each participant’s `name` with trimmed value. On failure, leave raw lobby names unchanged.

**Rationale**: Matches clarified spec layering with 001 (lobby stores raw names; 002 gates start). Avoids retroactive lobby mutation on failed start.

**Alternatives considered**:
- *Trim at join*: Would change 001 behavior; rejected.
- *Reject empty names at join*: Out of scope for 001; deferred to start per spec.

## 2. Duplicate detection at start vs join

**Decision**: At start, compare **trimmed** names case-insensitively. Reject with **400** and message naming colliding participants (use lobby-stored display names in the error for host recognition).

**Rationale**: Clarification session answer A; 002 backstop for pairs like `"Alex"` + `"  alex  "` that 001 join may allow.

**Alternatives considered**:
- *Allow duplicates at start*: Rejected in clarification.
- *Auto-suffix dedup*: Rejected; out of spec.

## 3. Deterministic secret word selection

**Decision**: `index = (sum of uppercase room-code character codes) mod 5` into ordered `STARTER_WORDS`.

```typescript
function selectSecretWord(roomCode: string): string {
  const upper = roomCode.toUpperCase();
  const sum = [...upper].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return STARTER_WORDS[sum % STARTER_WORDS.length];
}
```

**Rationale**: Clarification session answer B; constitution deterministic rules; reproducible per room code in tests.

**Alternatives considered**:
- *Always `rocket`*: Too trivial; less coverage of deterministic requirement.
- *Random selection*: Violates constitution.

## 4. Drawer assignment

**Decision**: Set `room.drawerId` to the `participantId` of the participant with `isHost === true` at start time (after name validation).

**Rationale**: Spec: current host becomes drawer; covers host-transfer case from 001.

**Alternatives considered**:
- *First join-order participant*: Conflicts with spec when host transferred.
- *Rotate drawer*: Out of scope (single round).

## 5. Secret word visibility (role-specific snapshot)

**Decision**: Store `secretWord` on server `Room` only. In `toRoomSnapshot`, compute:
- `viewerRole`: `"drawer"` if `viewerParticipantId === drawerId`, else `"guesser"`
- `wordDisplay`: actual `secretWord` for drawer, literal `"Guess word"` for guessers
- Do **not** expose a separate `secretWord` field to guessers in JSON

**Rationale**: Clarification: guessers see `Guess word` placeholder; prevents client-side leakage via extra fields.

**Alternatives considered**:
- *Omit word area for guessers*: Rejected; placeholder required.
- *Client-side masking*: UI-only; fails polling/API inspection tests.

## 6. Game-state synchronization

**Decision**: Reuse `GET /rooms/:code?participantId=` with 2000ms polling on `GamePage` via new `useGamePolling` hook (mirror `useLobbyPolling`).

**Rationale**: Constitution HTTP-only sync; no new endpoints; heartbeat/eviction from 001 continues during `playing`.

**Alternatives considered**:
- *Dedicated `/game` endpoint*: Unnecessary API surface.
- *Poll only on lobby*: Game refresh/session restore would be stale.

## 7. Start error messages naming offenders

**Decision**: Return messages such as:
- `Player names cannot be empty: {comma-separated lobby names}`
- `Display names must be unique: {comma-separated lobby names}`

Use stored (pre-trim) names in the message so the host can match lobby list entries.

**Rationale**: Clarification session answer A.

## 8. Empty-name participant handling

**Decision**: No host kick/remove. Start blocked until invalid participants fix names or disconnect (natural stale eviction from 001).

**Rationale**: Clarification session; constitution forbids moderation/kick.

## 9. Interaction with 001 `playing` stub

**Decision**: Replace minimal `status: "playing"` transition with full round bootstrap fields (`drawerId`, `secretWord`, trimmed names). Lobby auto-navigate unchanged.

**Rationale**: 001 explicitly deferred drawer/word to Scenario 2; same endpoint extended rather than new route.
