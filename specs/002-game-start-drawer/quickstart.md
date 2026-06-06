# Quickstart: Validate Game Start & Drawer Flow

Manual validation script for Scenario 2 after implementation. Requires Scenario 1 (lobby) working.

## Prerequisites

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Test 1 — Happy path: start, drawer, word visibility

1. Tab A (host) creates room as `Host`; Tab B joins as `Guest`.
2. Tab A clicks **Start Game**.
3. **Expect**:
   - Both tabs on `/game` within ~2s.
   - Tab A (drawer): sees actual secret word; identified as drawer.
   - Tab B (guesser): sees `Guess word` placeholder only; sees Host as drawer.
   - Scoreboard shows 0 for all (placeholder OK).

## Test 2 — Deterministic word

1. Note room code from Tab A (e.g. `WXYZ`).
2. Compute `sum(uppercase char codes) % 5` → index into `rocket, pizza, castle, guitar, sunflower`.
3. **Expect**: Drawer’s `wordDisplay` matches computed word; same code always same word after recreate.

## Test 3 — Name trim on start

1. Tab B joins with name `  Pat  ` (spaces).
2. Host starts game.
3. **Expect**: Participant list on game screen shows `Pat` (trimmed); game proceeds.

## Test 4 — Empty name blocks start

1. Tab B joins with name `   ` (whitespace only).
2. Host clicks Start.
3. **Expect**:
   - Stays in lobby; error names the offending participant.
   - Tab B still in lobby; no drawer/word assigned.

## Test 5 — Duplicate trimmed names block start

1. Tab A host name `Alex`; Tab B joins as `  alex  ` (if join allowed by 001 raw rules).
2. Host clicks Start.
3. **Expect**: Start rejected; error names colliding participants; room stays lobby.

## Test 6 — Host is drawer after transfer

1. Room with 3 players; close original host tab; wait ~6–8s for transfer.
2. New host starts game.
3. **Expect**: New host is drawer and sees secret word; others see `Guess word`.

## Test 7 — Game poll / refresh

1. Mid-round, drawer refreshes browser.
2. **Expect**: Returns as drawer with same word.
3. Guesser refreshes.
4. **Expect**: Still guesser; still `Guess word` only.

## Test 8 — No kick for bad names

1. Room with whitespace-name participant (Test 4 setup).
2. **Expect**: Host has no remove/kick control; only start blocked until guest fixes or disconnects.

## Build check

```bash
cd backend && npm run build
cd frontend && npm run build
```

Both must succeed before checkpoint sign-off.
