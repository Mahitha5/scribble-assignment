# Scribble Starter

This repository is a scaffold for the Scribble lab.

## Overview

This lab starts from a runnable but intentionally incomplete Scribble-style guessing game with a minimal REST backend and an in-memory room system. The work is a brownfield enhancement: inspect the starter, produce Spec Kit artifacts, implement the missing behavior incrementally, validate against acceptance criteria, and reflect on the AI-assisted workflow.

Granular, meaningful commits are encouraged so implementation decisions remain easy to assess.

| Item | Details |
|------|---------|
| Project type | Brownfield enhancement |
| Tech model | Frontend + minimal REST backend, in-memory store, manual room refresh in the starter; polling added by learners |
| Difficulty | Intermediate |
| Prerequisites | Comfort reading an existing codebase. |

It already provides:

- `frontend/`: Vite + React + TypeScript client
- `backend/`: Node.js + Express + TypeScript service
- starter routes and screens for Start, Create Room, Join Room, Lobby, and Game
- starter room API with in-memory state
- starter seed data:
  - words: `rocket`, `pizza`, `castle`, `guitar`, `sunflower`
  - roles: `drawer`, `guesser`

It does not implement the required room and gameplay features described in the business scenarios below.

The current UI uses Scribble branding and presentational copy, but the supported behavior is still the scaffold described in this document.

## Prerequisites

Before starting, confirm the following are available:

- **Node.js 18+** and **npm 9+**
- **Git** installed and configured
- A modern browser for testing multi-player flows
- A code editor (VS Code recommended)
- Access to a Spec Kit-compatible AI coding assistant
- Spec Kit CLI installed and verified

You should be comfortable with TypeScript, React components and hooks, REST APIs, command-line usage, and reading an existing codebase without immediately rewriting it.

## Repository Workflow

1. **Fork** this repository to your own GitHub account
2. Clone your fork locally and work from it
3. Create a branch (e.g., `assignment`, `scribble-lab`, or similar)
4. Commit your artifacts and implementation changes as you progress
5. When the lab is complete, **raise a Pull Request** from your branch to `main` on your fork
6. Include your **email**, **role**, and follow the PR template provided

> Keep commits granular and meaningful. The PR diff is what reviewers will assess.

## Learning Objectives

By the end of this lab you should be able to:

- Inspect an existing codebase before writing new code
- Write a constitution that constrains AI-assisted development
- Write a feature specification with explicit acceptance criteria and edge cases
- Resolve ambiguity through structured clarification
- Produce a technical plan tied to real files and a real state model
- Decompose work into ordered, testable tasks
- Implement incrementally and validate each slice against the spec
- Critically review AI-generated output before committing it
- Produce a clear reflection report

## Current Implementation

The current branch is scaffold-only.

Implemented today:

- app shell and page routing
- branded landing page and cleaned starter UI
- create room flow
- join room by code flow
- fetch room snapshot flow
- in-memory room storage on the backend
- lobby participant display from the latest fetched snapshot
- game screen placeholders for canvas, guess input, scoreboard, and results
- basic light UI styling

Not implemented yet:

- host behavior or host-only permissions
- automatic lobby polling
- start game flow
- drawer assignment
- secret word visibility rules
- drawing interaction
- clear canvas action
- guess submission and synced history
- scoring
- result state
- restart flow

## API Included In The Starter

Backend endpoints currently available:

- `GET /health`
- `POST /rooms`
- `POST /rooms/:code/join`
- `GET /rooms/:code`

The backend stores all room data in memory only. Restarting the backend clears all rooms.

## Run The Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:3001`.

## Run The Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

If needed, point the frontend at a different backend with `VITE_API_URL`.

## Quick Verification

Use this to confirm the starter works from a clean clone:

1. Start the backend and confirm `http://localhost:3001/health` returns `{ "ok": true }`.
2. Start the frontend and open `http://localhost:5173`.
3. Confirm the Start screen shows `Create Room` and `Join Room`.
4. Create a room and confirm you land on the Lobby screen.
5. Open another tab, join the same room, and use the Lobby refresh button to load the latest participant list.
6. Open the Game screen and confirm the canvas, guess input, scoreboard, and result areas are placeholders only.
7. Treat any start-page marketing copy as presentational only; use this README for actual supported scope.

## Recommended Build Order

Within each feature group, follow this loop:

1. Discovery: read the relevant starter files and document gaps and assumptions.
2. Specify: update the spec with acceptance criteria.
3. Clarify: resolve ambiguity before planning.
4. Plan: update state model changes, file-level changes, and data flow.
5. Tasks: decompose the plan into ordered, testable work.
6. Implement: complete one meaningful slice at a time and commit it.
7. Validate: verify the acceptance criteria with two browser tabs.
8. Move forward only after the current scenario passes.

## Required Spec Kit Artifacts

Maintain these artifacts throughout the lab:

- discovery notes with at least 3 incomplete behaviors, at least 2 assumptions, and relevant files
- `/speckit.constitution` covering engineering principles, AI usage rules, and review discipline
- `/speckit.specify` files updated incrementally by feature group with acceptance criteria
- `/speckit.plan` updated incrementally with state model, data flow, and file-level plan
- `/speckit.tasks` updated incrementally with ordered tasks and dependencies

## Business Scenarios

### Scenario 1 — Room Setup & Lobby

**Given** a player wants to host or join a drawing game, **When** they create or join a room via a unique code, **Then** the creator is automatically the host; invalid/empty codes are rejected with clear feedback; rooms are fully isolated; the lobby refreshes via polling (~2s); and only the host can start the game once at least 2 players are present.

### Scenario 2 — Game Start & Drawer Flow

**Given** a game is starting and player names are stored as entered (no trim; no backend defaults; duplicate names allowed), **When** the host starts with at least two players, **Then** the current host becomes the drawer, the secret word is chosen deterministically from the room code (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`), only the drawer’s poll responses include `secretWord`, and all clients auto-navigate to `/game` when the room phase is active.

### Scenario 3 — Gameplay Interaction

**Given** a round is active with a drawer and guessers (all scores start at 0), **When** the drawer draws/clears the canvas and guessers submit their guesses, **Then** the drawing is visible on the drawer's screen; guesses are trimmed, case-insensitively compared, and empty ones rejected; the guess history is synced to all players via polling; correct guesses score 100 (incorrect add 0).

### Scenario 4 — Result, Restart & Final Validation

**Given** a round has ended, **When** the result state is displayed and the host restarts, **Then** all players see the correct word, final scores, and full guess history; on restart, everyone returns to the lobby with players preserved and all round state cleared.

## Phased Checkpoints

Work through the scenarios in order and complete each checkpoint before moving to the next one.

| Group | Scenario | What You Should Have By The End |
|-------|----------|-------------------------------|
| 1. Room setup and lobby | Scenario 1 | Host tracking on room creation, join validation with clear error messages, verified multi-room isolation, automatic lobby polling within about 2 seconds, host-only start with 2-player minimum |
| 2. Game start and drawer flow | Scenario 2 | Player names as-is (no trim), drawer assignment, deterministic secret word selection, drawer-only word visibility |
| 3. Gameplay interaction | Scenario 3 | Interactive drawing canvas, clear canvas, guess submission with validation, synced guess history via polling, deterministic scoring |
| 4. Result, restart, and final validation | Scenario 4 | Shared result state visible to all players, clean restart to lobby with players preserved and round state cleared |

Complete a minimum of 4 specify iterations.

## Artifact Contents

- Constitution: workflow rules, coding standards, deterministic game-rule principles, AI usage rules, self-review, and testing expectations
- Specification: room lifecycle and isolation, lobby polling cadence, start-game preconditions, drawer assignment, word selection, drawing and clear behavior, guess validation, guess history sync, scoring, result contents, restart reset, edge cases, and acceptance criteria
- Plan: findings, relevant files and endpoints, frontend and backend state model, data flow, implementation sequence, testing strategy, and risks
- Tasks: discovery, artifact, backend, frontend, game logic, testing, documentation, and review work

## Explicitly Out Of Scope

The following items are intentionally out of scope for this lab.

**Do not build them, and do not include them in your spec, plan, or tasks.**

- WebSockets or real-time sync
- databases or persistent storage
- authentication, accounts, or sessions
- deployment, hosting, CI, or Docker work
- new state-management or routing libraries beyond what the starter ships
- multiple rounds, drawer rotation, timers, countdowns, speed bonuses, or drawer bonuses
- custom or random word packs
- spectator mode
- moderation features such as kick or mute
- room passwords or invite links
- rewriting the starter from scratch
- unjustified top-level dependencies
- unrelated refactors

**Why these boundaries matter:** They keep the lab at a focused, medium level of difficulty. Out-of-scope work rarely improves the outcome and often creates drift between the spec, plan, tasks, and implementation.

## Evaluation Rubric

Artifacts are graded for internal consistency, traceability to implementation, and quality of reasoning, not for rigid wording or template mimicry.

| Area | What Good Looks Like |
|------|---------------------|
| Discovery | ≥3 gaps + ≥2 assumptions documented; relevant files listed |
| Spec Kit artifacts | Constitution, spec, plan, tasks committed and internally consistent |
| Working game flow | Two browsers can join a room, play one round, see synced result, restart |
| Edge cases & validation | Empty/invalid inputs, case-insensitive guess, multi-room isolation handled |
| Implementation alignment | Code behavior matches the spec; deviations are documented |
| Reflection | Reflection explains decisions, AI usage, tradeoffs |
| Submission clarity (code optional for product roles) | Submission is easy to review |

## Reflection Report

Provide a brief reflection report in an `.md` file. Use these prompts as a starting point:

- What did the starter app already have?
- What did you add?

> Spec Kit is the focus of this lab. The game is the vehicle. Each commit should remain explainable and traceable to your spec.

## Build Validation

Run both builds before handing off changes:

```bash
cd backend
npm run build
```

```bash
cd frontend
npm run build
```

## Troubleshooting

- If the frontend cannot reach the backend, verify the backend is running on port `3001`.
- If the backend port is already in use, run `PORT=<new-port> npm run dev`.
- If local commands are missing, rerun `npm install` in the relevant app directory.
