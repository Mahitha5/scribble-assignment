import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendStroke,
  clearAllRooms,
  clearCanvas,
  createRoom,
  endRound,
  evictIfAllParticipantsStale,
  getRoomSnapshot,
  joinRoom,
  restartGame,
  RoomStoreError,
  selectSecretWord,
  setParticipantLastSeenAt,
  startGame,
  STALE_THRESHOLD_MS,
  submitGuess
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
    expect(started.strokes).toEqual([]);
    expect(started.guesses).toEqual([]);
    expect(started.scores?.every((entry) => entry.score === 0)).toBe(true);
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

  it("appendStroke adds strokes in order for the drawer only", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    const first = appendStroke(host.room.code, host.participantId, {
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 }
      ],
      color: "#000000",
      lineWidth: 4
    });
    const second = appendStroke(host.room.code, host.participantId, {
      points: [
        { x: 0.3, y: 0.3 },
        { x: 0.4, y: 0.4 }
      ],
      color: "#000000",
      lineWidth: 4
    });

    expect(first.strokes).toHaveLength(1);
    expect(second.strokes).toHaveLength(2);
    expect(() =>
      appendStroke(host.room.code, guest.participantId, {
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.6, y: 0.6 }
        ],
        color: "#000000",
        lineWidth: 4
      })
    ).toThrow("Only the drawer can update the canvas");
  });

  it("clearCanvas empties stroke list for the drawer", () => {
    const host = createRoom("Host");
    joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    appendStroke(host.room.code, host.participantId, {
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 }
      ],
      color: "#000000",
      lineWidth: 4
    });

    const cleared = clearCanvas(host.room.code, host.participantId);

    expect(cleared.strokes).toEqual([]);
  });

  it("submitGuess rejects empty guesses and drawer submissions", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    expect(() => submitGuess(host.room.code, guest.participantId, "   ")).toThrow(
      "Guess cannot be empty"
    );
    expect(() => submitGuess(host.room.code, host.participantId, "rocket")).toThrow(
      "The drawer cannot submit guesses"
    );
  });

  it("submitGuess scores first correct guess only and compares case-insensitively", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    const started = startGame(host.room.code, host.participantId);
    const secretWord = started.wordDisplay ?? "";

    const firstCorrect = submitGuess(host.room.code, guest.participantId, `  ${secretWord.toUpperCase()}  `);
    const duplicateCorrect = submitGuess(host.room.code, guest.participantId, secretWord);
    const incorrect = submitGuess(host.room.code, guest.participantId, "wrong");

    expect(firstCorrect.guesses?.[0]).toMatchObject({
      text: secretWord.toUpperCase(),
      isCorrect: true,
      scoredPoints: 100
    });
    expect(duplicateCorrect.guesses?.[1]).toMatchObject({
      isCorrect: true,
      scoredPoints: 0
    });
    expect(incorrect.guesses?.[2]).toMatchObject({
      isCorrect: false,
      scoredPoints: 0
    });
    expect(firstCorrect.scores?.find((entry) => entry.participantId === guest.participantId)?.score).toBe(
      100
    );
  });

  it("two guessers can each score 100 independently", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    const third = joinRoom(host.room.code, "Third");
    const started = startGame(host.room.code, host.participantId);
    const secretWord = started.wordDisplay ?? "";

    submitGuess(host.room.code, guest.participantId, secretWord);
    const thirdResult = submitGuess(host.room.code, third.participantId, secretWord);

    expect(thirdResult.scores?.find((entry) => entry.participantId === guest.participantId)?.score).toBe(
      100
    );
    expect(thirdResult.scores?.find((entry) => entry.participantId === third.participantId)?.score).toBe(
      100
    );
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

  it("endRound transitions playing to result and reveals word to all viewers", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    const started = startGame(host.room.code, host.participantId);
    const secretWord = started.wordDisplay ?? "";

    appendStroke(host.room.code, host.participantId, {
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 }
      ],
      color: "#000000",
      lineWidth: 4
    });
    submitGuess(host.room.code, guest.participantId, secretWord);

    const ended = endRound(host.room.code, host.participantId);
    const hostView = getRoomSnapshot(host.room.code, host.participantId);
    const guestView = getRoomSnapshot(host.room.code, guest.participantId);

    expect(ended.status).toBe("result");
    expect(ended.wordDisplay).toBe(secretWord);
    expect(ended.drawerId).toBe(host.participantId);
    expect(ended.strokes).toHaveLength(1);
    expect(ended.guesses).toHaveLength(1);
    expect(ended.scores?.find((entry) => entry.participantId === guest.participantId)?.score).toBe(100);
    expect(ended.viewerRole).toBeUndefined();
    expect(ended.canStartGame).toBe(false);

    expect(hostView.wordDisplay).toBe(secretWord);
    expect(guestView.wordDisplay).toBe(secretWord);
    expect(guestView.viewerRole).toBeUndefined();
  });

  it("endRound rejects non-host participants", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    expect(() => endRound(host.room.code, guest.participantId)).toThrow("Only the host can end the round");
  });

  it("endRound rejects when game is not playing", () => {
    const host = createRoom("Host");
    joinRoom(host.room.code, "Guest");

    expect(() => endRound(host.room.code, host.participantId)).toThrow("Game is not in progress");
  });

  it("appendStroke, clearCanvas, and submitGuess reject when status is result", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    const started = startGame(host.room.code, host.participantId);
    const secretWord = started.wordDisplay ?? "";

    endRound(host.room.code, host.participantId);

    expect(() =>
      appendStroke(host.room.code, host.participantId, {
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 }
        ],
        color: "#000000",
        lineWidth: 4
      })
    ).toThrow("Game is not in progress");

    expect(() => clearCanvas(host.room.code, host.participantId)).toThrow("Game is not in progress");
    expect(() => submitGuess(host.room.code, guest.participantId, secretWord)).toThrow(
      "Game is not in progress"
    );
  });

  it("restartGame clears round state, preserves participants, and returns to lobby", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    const started = startGame(host.room.code, host.participantId);
    const secretWord = started.wordDisplay ?? "";

    appendStroke(host.room.code, host.participantId, {
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 }
      ],
      color: "#000000",
      lineWidth: 4
    });
    submitGuess(host.room.code, guest.participantId, secretWord);
    endRound(host.room.code, host.participantId);

    const restarted = restartGame(host.room.code, host.participantId);

    expect(restarted.status).toBe("lobby");
    expect(restarted.participants).toHaveLength(2);
    expect(restarted.drawerId).toBeUndefined();
    expect(restarted.wordDisplay).toBeUndefined();
    expect(restarted.strokes).toBeUndefined();
    expect(restarted.guesses).toBeUndefined();
    expect(restarted.scores).toBeUndefined();
    expect(restarted.canStartGame).toBe(true);
  });

  it("restartGame rejects non-host participants", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);
    endRound(host.room.code, host.participantId);

    expect(() => restartGame(host.room.code, guest.participantId)).toThrow(
      "Only the host can restart the game"
    );
  });

  it("restartGame rejects when room is not in result", () => {
    const host = createRoom("Host");
    joinRoom(host.room.code, "Guest");
    startGame(host.room.code, host.participantId);

    expect(() => restartGame(host.room.code, host.participantId)).toThrow("Round has not ended");
  });

  it("transfers host during result so successor can restart", () => {
    const host = createRoom("Host");
    const second = joinRoom(host.room.code, "Second");
    startGame(host.room.code, host.participantId);
    endRound(host.room.code, host.participantId);

    const staleAt = new Date(Date.now() - STALE_THRESHOLD_MS - 1).toISOString();
    setParticipantLastSeenAt(host.room.code, host.participantId, staleAt);
    setParticipantLastSeenAt(host.room.code, second.participantId, new Date().toISOString());

    const snapshot = getRoomSnapshot(host.room.code, second.participantId);

    expect(snapshot.status).toBe("result");
    expect(snapshot.isViewerHost).toBe(true);
    expect(snapshot.participants.find((participant) => participant.id === second.participantId)?.isHost).toBe(
      true
    );

    const restarted = restartGame(host.room.code, second.participantId);

    expect(restarted.status).toBe("lobby");
    expect(restarted.canStartGame).toBe(true);
  });
});
