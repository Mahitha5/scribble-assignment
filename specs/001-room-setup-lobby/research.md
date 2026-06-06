# Research: Room Setup & Lobby

**Feature**: `specs/001-room-setup-lobby` (spec: `specs/001-room-setup-lobby/spec.md`)  
**Date**: 2026-06-05

## 1. Host disconnect detection

**Decision**: Treat each lobby poll (`GET /rooms/:code?participantId=`) as a heartbeat; update the requesting participant's `lastSeenAt`. If the current host's `lastSeenAt` is older than **6 seconds** (three missed 2s polls), run host succession.

**Rationale**: Reuses the required polling loop—no WebSockets, no background jobs, no new transport. Aligns with constitution's ~2s lobby refresh target.

**Alternatives considered**:
- *Immediate transfer on tab close*: Requires `beforeunload` beacons—unreliable, client-only, not enforceable server-side.
- *Never transfer host*: Conflicts with clarified spec (succession to next joiner).
- *Dedicated heartbeat endpoint*: Extra API surface without benefit over piggybacking on GET.

## 2. Host succession algorithm

**Decision**: On stale host detection while `status === "lobby"`, assign `isHost: true` to the next participant in `joinedAt` order after the current host among participants whose `lastSeenAt` is within the stale threshold. If none qualify, cascade to the next join-order slot regardless of presence (per spec edge case).

**Rationale**: Matches clarification: "transfers to the participant who joined immediately after the original host; cascades if unavailable."

**Alternatives considered**:
- *Longest-connected non-host*: Not spec-aligned.
- *Vote for new host*: Out of scope.

## 3. Room code validation

**Decision**: Zod schema `/^[A-Za-z0-9]{4}$/` after trim on join path params/body; normalize to uppercase for Map lookup. Return **400** with message `"Invalid room code format"` for malformed codes.

**Rationale**: Spec clarification B; separates format errors from 404 not-found.

**Alternatives considered**:
- *Server-only validation*: Worse UX; client pre-check still added on Join page.

## 4. Duplicate display names

**Decision**: Server rejects join when incoming name exactly matches an existing participant's name, or when both are defined and equal case-insensitively. Return **409** with `"Choose a different name"`. Display names are stored exactly as submitted—including whitespace-only values—with no trimming or default substitution; omitted `playerName` remains undefined.

**Rationale**: Spec clarification; fixes starter duplicate-default-name gap noted in discovery.

## 5. Client session persistence

**Decision**: Persist `{ participantId, roomCode }` in `localStorage` under key `scribble.session`. Hydrate on `RoomStore` init; clear on explicit leave or unrecoverable 404.

**Rationale**: Supports host refresh without re-join and name-uniqueness bypass for returning sessions (spec edge case).

**Alternatives considered**:
- *sessionStorage only*: Lost on new tab; spec allows multi-tab join with different names.
- *URL-only session*: Starter has no room code in route today; localStorage minimal change.

## 6. Lobby polling interval

**Decision**: `setInterval` 2000ms in `LobbyPage` (or `useLobbyPolling` hook), calling `roomStore.fetchRoom()`. Clear interval on unmount.

**Rationale**: Constitution and spec target ~2s; manual Refresh remains as fallback.

## 7. Start game transition

**Decision**: Add `POST /rooms/:code/start` body `{ participantId }`. Set `room.status = "playing"`. Frontend: host navigates on success; all clients navigate when poll observes `status !== "lobby"`.

**Rationale**: Server-authoritative start; polling-only sync for non-host navigation (spec clarification A).

**Alternatives considered**:
- *Client-only navigation for host*: Non-hosts would desync.
- *Full game state in Scenario 1*: Deferred drawer/word to Scenario 2.

## 8. Join blocked after start

**Decision**: `joinRoom` returns **409** (or **400**) with `"Game already in progress"` when `room.status !== "lobby"`.

**Rationale**: Spec clarification; distinct from 404 not-found.

## 9. Inactive room eviction

**Decision**: Remove a room from the in-memory Map when **all** participants have `lastSeenAt` older than **6 seconds** (same threshold as host stale detection). Run `evictIfAllParticipantsStale(room)` after heartbeat updates on `GET /rooms/:code`, and before join/start lookups. Applies to both `lobby` and `playing` rooms.

**Rationale**: Constitution **MUST** evict inactive rooms to limit memory growth. Reuses existing poll heartbeats—no timers, WebSockets, or sweeper threads. Abandoned lobbies and deserted in-progress rooms do not accumulate.

**Alternatives considered**:
- *Defer to later scenario*: Violates constitution; must ship with Scenario 1.
- *Separate long TTL (e.g. 30 min)*: Leaves abandoned rooms in memory; rejected.
- *Evict when last participant leaves immediately*: Requires reliable leave beacons; stale heartbeat is sufficient.
- *Dedicated eviction endpoint*: Unnecessary; piggyback on existing mutations.
