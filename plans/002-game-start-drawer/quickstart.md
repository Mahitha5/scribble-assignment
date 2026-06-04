# Game Start & Drawer Flow — Quickstart

## Overview

Validates Scenario 2: host start, drawer assignment, deterministic secret word, drawer-only visibility, lobby→game auto-navigation.

**Prerequisites**

- Feature 001 working (create, join, lobby poll, start endpoint)
- `cd backend && npm run dev` (port 3001)
- `cd frontend && npm run dev` (port 5173)
- Two browser tabs (or normal + incognito)

---

## Automated checks

```bash
cd backend && npm test
cd frontend && npm run build
```

Expected backend tests (after implement):

- `pickSecretWordForRoomCode` determinism
- Guesser snapshot omits `secretWord` (including 10 consecutive polls)
- Host → drawer; names unchanged at start

---

## Manual: Two-tab happy path

### 1. Setup lobby

| Step | Tab A (Host) | Tab B (Guest) |
|------|--------------|---------------|
| 1 | Create room, name `Host` | — |
| 2 | Copy room code | Join with code, name `Guest` |
| 3 | Lobby shows 2 players | Lobby shows 2 players within ~3s |

### 2. Start game

| Step | Tab A | Tab B |
|------|-------|-------|
| 4 | Click **Start Game** | Wait (no Start button) |
| 5 | Lands on `/game` | Auto-navigates to `/game` within ~3s without refresh |

### 3. Drawer and word

| Check | Tab A (host/drawer) | Tab B (guesser) |
|-------|---------------------|-----------------|
| Role label | Shows as drawer | Shows as guesser |
| Secret word | Visible on screen | **Not** visible (placeholder OK) |
| Network poll | Response JSON includes `secretWord` | Response JSON has **no** `secretWord` key |

Repeat guest poll 10× in DevTools — never appears.

### 4. Determinism (optional)

1. Note room code and drawer’s word
2. Restart backend (clears rooms)
3. Recreate **same code** is not possible (random codes) — instead: unit test `pickSecretWordForRoomCode("ABCD")` twice → equal

For manual sanity: run backend test file for golden code vectors.

---

## Manual: Name preservation

1. Host creates with blank name
2. Guest joins as `  Ali  ` (spaces intentional)
3. Start → game player list shows `""` and `  Ali  ` unchanged

---

## Manual: Host transfer before start

1. Host A creates; Guest B joins
2. Host A leaves (or use test hook) — B becomes host
3. B starts → B is drawer in game UI

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Guest stuck on lobby | Poll not running; check `participantId` on GET |
| Guesser sees word | Client-only hide; fix `toRoomSnapshot` omission |
| Word changes on re-start | New room code; determinism is per code |
| Both see full word list | `availableWords` leaked on active snapshot — omit field |

---

## Out of scope for this quickstart

Drawing on canvas, submitting guesses, scoring, results, restart.
