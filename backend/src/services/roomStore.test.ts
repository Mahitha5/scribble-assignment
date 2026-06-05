import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllRooms,
  createRoom,
  evictIfAllParticipantsStale,
  getRoomSnapshot,
  joinRoom,
  RoomStoreError,
  selectSecretWord,
  setParticipantLastSeenAt,
  startGame,
  STALE_THRESHOLD_MS
} from "./roomStore.js";

describe("roomStore", () => {
  beforeEach(() => {
    clearAllRooms();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearAllRooms();
  });

  it("createRoom returns a room with a 4-character uppercase code and host participant", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.room.participants[0].isHost).toBe(true);
    expect(result.participantId).toBeDefined();
  });

  it("stores omitted display names without coercion", () => {
    const result = createRoom();

    expect(result.room.participants[0].name).toBeUndefined();
  });

  it("stores whitespace-only display names as submitted", () => {
    const result = createRoom("  ");

    expect(result.room.participants[0].name).toBe("  ");
  });

  it("rejects duplicate omitted display names", () => {
    const host = createRoom();
    expect(() => joinRoom(host.room.code)).toThrow("Choose a different name");
  });

  it("rejects duplicate whitespace-only display names", () => {
    const host = createRoom("  ");
    expect(() => joinRoom(host.room.code, "  ")).toThrow("Choose a different name");
  });

  it("joinRoom throws for an unknown room code", () => {
    expect(() => joinRoom("ZZZZ", "Bob")).toThrow(RoomStoreError);
  });

  it("joinRoom rejects duplicate names case-insensitively", () => {
    const host = createRoom("Alex");
    expect(() => joinRoom(host.room.code, "alex")).toThrow("Choose a different name");
  });

  it("joinRoom rejects malformed room codes", () => {
    expect(() => joinRoom("AB", "Bob")).toThrow("Invalid room code format");
  });

  it("joinRoom accepts case-insensitive room codes", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code.toLowerCase(), "Guest");

    expect(guest.room.participants).toHaveLength(2);
  });

  it("joinRoom rejects rooms that already started", () => {
    const host = createRoom("Host");
    joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    expect(() => joinRoom(host.room.code, "Latecomer")).toThrow("Game already in progress");
  });

  it("startGame requires host and at least two players", () => {
    const host = createRoom("Host");

    expect(() => startGame(host.room.code, host.participantId)).toThrow("Waiting for more players");

    const guest = joinRoom(host.room.code, "Guest");
    expect(() => startGame(host.room.code, guest.participantId)).toThrow("Only the host can start the game");

    const started = startGame(host.room.code, host.participantId);

    expect(started.status).toBe("playing");
    expect(started.canStartGame).toBe(false);
    expect(started.drawerId).toBe(host.participantId);
    expect(started.viewerRole).toBe("drawer");
    expect(started.wordDisplay).toBe(selectSecretWord(host.room.code));
  });

  it("startGame rejects empty or whitespace-only names", () => {
    const host = createRoom("Host");
    joinRoom(host.room.code, "   ");

    expect(() => startGame(host.room.code, host.participantId)).toThrow(
      "Player names cannot be empty:"
    );
  });

  it("startGame rejects undefined display names", () => {
    const host = createRoom("Host");
    joinRoom(host.room.code);

    expect(() => startGame(host.room.code, host.participantId)).toThrow(
      "Player names cannot be empty:"
    );
  });

  it("startGame rejects duplicate trimmed names", () => {
    const host = createRoom("Alex");
    joinRoom(host.room.code, "  alex  ");

    expect(() => startGame(host.room.code, host.participantId)).toThrow(
      "Display names must be unique:"
    );
  });

  it("startGame trims names and assigns deterministic secret word", () => {
    const host = createRoom("  Host  ");
    const guest = joinRoom(host.room.code, " Guest ");

    const started = startGame(host.room.code, host.participantId);

    expect(started.participants.find((participant) => participant.id === host.participantId)?.name).toBe(
      "Host"
    );
    expect(started.participants.find((participant) => participant.id === guest.participantId)?.name).toBe(
      "Guest"
    );
    expect(started.wordDisplay).toBe(selectSecretWord(host.room.code));
  });

  it("guessers receive Guess word placeholder in snapshot", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    const guesserView = getRoomSnapshot(host.room.code, guest.participantId);

    expect(guesserView.viewerRole).toBe("guesser");
    expect(guesserView.wordDisplay).toBe("Guess word");
    expect(guesserView).not.toHaveProperty("secretWord");
  });

  it("selectSecretWord is deterministic for a room code", () => {
    expect(selectSecretWord("ABCD")).toBe(selectSecretWord("abcd"));
    expect(selectSecretWord("ABCD")).toBe(selectSecretWord("ABCD"));
  });

  it("successor host becomes drawer after transfer", () => {
    const host = createRoom("Host");
    const second = joinRoom(host.room.code, "Second");

    const staleAt = new Date(Date.now() - STALE_THRESHOLD_MS - 1).toISOString();
    setParticipantLastSeenAt(host.room.code, host.participantId, staleAt);
    setParticipantLastSeenAt(host.room.code, second.participantId, new Date().toISOString());

    getRoomSnapshot(host.room.code, second.participantId);

    const started = startGame(host.room.code, second.participantId);

    expect(started.drawerId).toBe(second.participantId);
    expect(started.viewerRole).toBe("drawer");
  });

  it("transfers host to the next joiner when the current host goes stale", () => {
    const host = createRoom("Host");
    const second = joinRoom(host.room.code, "Second");
    joinRoom(host.room.code, "Third");

    const staleAt = new Date(Date.now() - STALE_THRESHOLD_MS - 1).toISOString();
    setParticipantLastSeenAt(host.room.code, host.participantId, staleAt);
    setParticipantLastSeenAt(host.room.code, second.participantId, new Date().toISOString());

    const snapshot = getRoomSnapshot(host.room.code, second.participantId);

    expect(snapshot.participants.find((participant) => participant.id === second.participantId)?.isHost).toBe(
      true
    );
    expect(snapshot.participants.find((participant) => participant.id === host.participantId)?.isHost).toBe(
      false
    );
  });

  it("evictIfAllParticipantsStale removes abandoned rooms", () => {
    const host = createRoom("Host");
    const staleAt = new Date(Date.now() - STALE_THRESHOLD_MS - 1).toISOString();
    setParticipantLastSeenAt(host.room.code, host.participantId, staleAt);

    expect(evictIfAllParticipantsStale(host.room.code)).toBe(true);
    expect(() => joinRoom(host.room.code, "Guest")).toThrow("Unable to join room");
  });

  it("original host reconnects as non-host after transfer", () => {
    const host = createRoom("Host");
    const second = joinRoom(host.room.code, "Second");

    const staleAt = new Date(Date.now() - STALE_THRESHOLD_MS - 1).toISOString();
    setParticipantLastSeenAt(host.room.code, host.participantId, staleAt);
    setParticipantLastSeenAt(host.room.code, second.participantId, new Date().toISOString());

    getRoomSnapshot(host.room.code, second.participantId);

    const reconnected = getRoomSnapshot(host.room.code, host.participantId);

    expect(reconnected.isViewerHost).toBe(false);
    expect(reconnected.participants.find((participant) => participant.id === second.participantId)?.isHost).toBe(
      true
    );
  });
});
