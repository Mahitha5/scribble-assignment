import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STALE_PARTICIPANT_MS,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
  toRoomSnapshot
} from "./roomStore.js";

describe("roomStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createRoom returns a room with a 4-6 character uppercase code and host", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-Z0-9]{4,6}$/);
    expect(result.room.hostId).toBe(result.participantId);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.room.participants[0].lastSeenAt).toBeDefined();
  });

  it("createRoom stores empty name when playerName is omitted", () => {
    const result = createRoom();

    expect(result.room.participants[0].name).toBe("");
  });

  it("joinRoom stores empty name when playerName is omitted", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code);

    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    expect(guest.room.participants.map((participant) => participant.name)).toEqual(["Host", ""]);
  });

  it("createRoom stores playerName with whitespace as-is", () => {
    const result = createRoom("  Ali  ");

    expect(result.room.participants[0].name).toBe("  Ali  ");
  });

  it("joinRoom allows duplicate display names", () => {
    const host = createRoom("Alice");
    const guest = joinRoom(host.room.code, "Alice");

    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    expect(guest.room.participants.map((participant) => participant.name)).toEqual(["Alice", "Alice"]);
  });

  it("joinRoom returns not_found for an unknown room code", () => {
    const result = joinRoom("ZZZZ", "Bob");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_found");
    }
  });

  it("toRoomSnapshot sets canStart when at least two players are present", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const snapshot = toRoomSnapshot(guest.room);
    expect(snapshot.canStart).toBe(true);
    expect(snapshot.participants.find((p) => p.isHost)?.name).toBe("Host");
  });

  it("leaveRoom transfers host to earliest joined remaining player", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const left = leaveRoom(host.room.code, host.participantId);
    expect(left.ok).toBe(true);
    if (!left.ok || !left.room) {
      return;
    }

    expect(left.room.hostId).toBe(guest.participantId);
    expect(left.room.participants).toHaveLength(1);
  });

  it("leaveRoom deletes the room when the last participant leaves", () => {
    const host = createRoom("Solo");
    const left = leaveRoom(host.room.code, host.participantId);
    expect(left.ok).toBe(true);
    if (!left.ok) {
      return;
    }

    expect(left.room).toBeNull();
    expect(getRoom(host.room.code)).toBeNull();
  });

  it("getRoom evicts participants stale longer than STALE_PARTICIPANT_MS", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    vi.advanceTimersByTime(STALE_PARTICIPANT_MS + 1);
    const refreshed = getRoom(host.room.code, host.participantId);

    expect(refreshed?.participants).toHaveLength(1);
    expect(refreshed?.participants[0].id).toBe(host.participantId);
  });

  it("startGame requires host and at least two players", () => {
    const host = createRoom("Host");
    const soloStart = startGame(host.room.code, host.participantId);
    expect(soloStart.ok).toBe(false);

    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const guestStart = startGame(host.room.code, guest.participantId);
    expect(guestStart.ok).toBe(false);
    if (!guestStart.ok) {
      expect(guestStart.reason).toBe("not_host");
    }

    const started = startGame(host.room.code, host.participantId);
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(started.room.status).toBe("active");
    }
  });
});
