# Reflection Report

## What did the starter app already have?

The starter was a **runnable scaffold**, not a complete game. It gave enough structure to create and join rooms and navigate the UI, while leaving all gameplay logic for the lab to implement.

### Infrastructure and tooling

- A monorepo with separate **frontend** (Vite + React 18 + TypeScript) and **backend** (Node.js + Express + TypeScript) apps
- Dev scripts (`npm run dev`, `npm run build`) and minimal **Vitest** tests for schemas, room store, and the API client
- Engineering constraints documented in [AGENTS.md](AGENTS.md): in-memory storage only, HTTP polling (no WebSockets), no database, no authentication

### Backend

- Four REST endpoints: `GET /health`, `POST /rooms`, `POST /rooms/:code/join`, and `GET /rooms/:code`
- An in-memory room store ([backend/src/services/roomStore.ts](backend/src/services/roomStore.ts)) that generates 4-character room codes, creates rooms, joins players, and returns cloned snapshots
- Zod validation for basic request shapes ([backend/src/api/schemas.ts](backend/src/api/schemas.ts)) and centralized error handling
- Seed data for five starter words and two roles (`drawer`, `guesser`) in [backend/src/seed/starterData.ts](backend/src/seed/starterData.ts)
- A `Room` model locked to `status: "lobby"` with participants identified by server-issued UUIDs

### Frontend

- React Router setup with five pages: Start, Create Room, Join Room, Lobby, and Game
- A custom external store ([frontend/src/state/roomStore.ts](frontend/src/state/roomStore.ts)) using `useSyncExternalStore` to hold `participantId`, room snapshot, loading, and error state
- An API client ([frontend/src/services/api.ts](frontend/src/services/api.ts)) wrapping the three room endpoints
- Branded UI shell, shared components (cards, page header, room code badge), and light styling in [frontend/src/styles/app.css](frontend/src/styles/app.css)

### Flows that worked out of the box

- **Create room**: submit a player name → receive `participantId` + room snapshot → navigate to lobby
- **Join room**: enter name and room code → join via API → navigate to lobby
- **Lobby**: display participants from the latest snapshot; **manual refresh** via a button to re-fetch room state
- **Navigate to game**: any player could click "Start Game" and reach the game screen via client-side routing (no server-side game start)

### UI placeholders (present but not functional)

- Canvas area with static "Waiting for drawer..." text
- Guess form with input and submit button (submit did nothing)
- Scoreboard and activity/result panels with hardcoded placeholder content
- Start page marketing copy describing draw/guess/win steps (README notes this is presentational only)

### What it deliberately did not include

Per the README and code inspection, the starter had no host tracking, automatic polling, start-game API, drawer assignment, secret word visibility, drawing, guess submission, scoring, result state, or restart flow. Those gaps were the intended scope of the lab.

## What did you add?

### Spec Kit artifacts

- A project **constitution** (`.specify/memory/constitution.md`) defining engineering principles, AI usage rules, and review discipline
- **Discovery notes** ([discovery.md](discovery.md)) documenting starter gaps and assumptions
- Four feature iterations, each with **spec**, **plan**, **tasks**, and **checklists** under `specs/` for Scenarios 1–4

### Scenario 1 — Room setup & lobby

**Backend**

- Host flag on the creating participant; duplicate-name rejection on join (case-insensitive)
- Room code validation and normalization; stale-participant eviction and host transfer when the host goes inactive
- `canStartGame` and `isViewerHost` on room snapshots; start blocked until at least two players are present

**Frontend**

- `useLobbyPolling` hook (~2s interval) to keep the lobby participant list in sync
- Lobby UI shows host labels, status messaging, and a host-only **Start Game** button gated by `canStartGame`
- Join/create form validation and clearer error feedback

### Scenario 2 — Game start & drawer flow

**Backend**

- `POST /rooms/:code/start` — host-only; transitions `lobby` → `playing`
- Player name trimming; rejection of empty, whitespace-only, and duplicate names at start
- Deterministic `selectSecretWord(roomCode)` from the starter word list; host assigned as drawer
- `toRoomSnapshot` viewer rules: drawer sees the secret word; guessers see `"Guess word"`

**Frontend**

- `startGame` API client and room-store action; lobby navigates to `/game` on successful start or when polling detects `playing`
- Game page shows role, drawer name, and word display per viewer

### Scenario 3 — Gameplay interaction

**Backend**

- `POST /rooms/:code/strokes` and `POST /rooms/:code/canvas/clear` — drawer-only during `playing`
- `POST /rooms/:code/guesses` — trimmed, case-insensitive comparison; empty guesses rejected; drawer cannot guess
- Scoring: first correct guess per player awards 100 points; subsequent correct guesses score 0
- Round state on the room: `strokes`, `guesses`, `scores`; snapshots include frozen copies for all viewers

**Frontend**

- `DrawingCanvas` component with draw and view modes; stroke capture and server sync
- `GuessForm`, `Scoreboard`, and `ResultPanel` wired to live snapshot data
- `useGamePolling` hook (~2s) to sync canvas, guesses, and scores across tabs
- Host **Clear Canvas** action; guess submission disabled for the drawer

### Scenario 4 — Round end, result & restart

**Backend**

- Extended `RoomStatus` with `"result"`
- `POST /rooms/:code/end` — host-only; `playing` → `result`; reveals `wordDisplay` to all viewers
- `POST /rooms/:code/restart` — host-only; `result` → `lobby`; clears drawer, word, strokes, guesses, and scores
- Gameplay mutations return 409 when not `playing`; host transfer runs in `result` as well as `lobby`

**Frontend**

- Game page **result mode** on `/game`: revealed word, read-only canvas, frozen scoreboard and guess history
- Host **End Round** (during `playing`) and **Restart** (during `result`) on the game page button row
- `useGamePolling` navigates to `/lobby` when status returns to `lobby` after restart
- Lobby shows `Round ended — waiting for host to restart` during `result`; does not redirect back to game
- Exit Game during result lands on lobby and stays there until the host restarts

### Tests and validation

- Extended `backend/src/services/roomStore.test.ts` to 36 Vitest cases covering room lifecycle, gameplay, end/restart, mutation guards, and host transfer
- Backend and frontend `npm run build` both pass
- Manual two-browser validation scripts documented in each feature's `quickstart.md`

