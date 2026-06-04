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
