import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STARTER_WORDS } from "../seed/starterData.js";
import {
  STALE_PARTICIPANT_MS,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  pickSecretWordForRoomCode,
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

  it("pickSecretWordForRoomCode is deterministic and uses starter vocabulary", () => {
    const wordA = pickSecretWordForRoomCode("ABCD");
    const wordB = pickSecretWordForRoomCode("ABCD");
    expect(wordA).toBe(wordB);
    expect(STARTER_WORDS).toContain(wordA);
  });

  it("startGame assigns drawer to host, secret word, and preserves names", () => {
    const host = createRoom("");
    const guest = joinRoom(host.room.code, "  Ali  ");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const started = startGame(host.room.code, host.participantId);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    expect(started.room.drawerId).toBe(host.participantId);
    expect(started.room.secretWord).toBe(pickSecretWordForRoomCode(host.room.code));
    expect(started.room.participants.map((p) => p.name)).toEqual(["", "  Ali  "]);
  });

  it("toRoomSnapshot exposes roles and omits secretWord for guesser", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const started = startGame(host.room.code, host.participantId);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    const drawerView = toRoomSnapshot(started.room, host.participantId);
    expect(drawerView.secretWord).toBe(started.room.secretWord);
    expect(drawerView.drawerId).toBe(host.participantId);
    expect(drawerView.availableWords).toBeUndefined();

    const guesserView = toRoomSnapshot(started.room, guest.participantId);
    expect("secretWord" in guesserView).toBe(false);
    expect(JSON.stringify(guesserView)).not.toMatch(/"secretWord"\s*:/);
    expect(guesserView.participants.find((p) => p.id === guest.participantId)?.role).toBe("guesser");
    expect(guesserView.participants.find((p) => p.id === host.participantId)?.role).toBe("drawer");
  });

  it("guesser snapshot omits secretWord across 10 iterations", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const started = startGame(host.room.code, host.participantId);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    for (let index = 0; index < 10; index += 1) {
      const snapshot = toRoomSnapshot(started.room, guest.participantId);
      expect("secretWord" in snapshot).toBe(false);
    }
  });

  it("second startGame while active returns already_started without mutating round", () => {
    const host = createRoom("Host");
    const guest = joinRoom(host.room.code, "Guest");
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }

    const started = startGame(host.room.code, host.participantId);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    const second = startGame(host.room.code, host.participantId);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("already_started");
    }

    const room = getRoom(host.room.code, host.participantId);
    expect(room?.drawerId).toBe(started.room.drawerId);
    expect(room?.secretWord).toBe(started.room.secretWord);
    expect(room?.participants.map((p) => p.name)).toEqual(["Host", "Guest"]);
  });

  it("transferred host becomes drawer on start", () => {
    const host = createRoom("Host");
    const guest1 = joinRoom(host.room.code, "Guest1");
    const guest2 = joinRoom(host.room.code, "Guest2");
    expect(guest1.ok).toBe(true);
    expect(guest2.ok).toBe(true);
    if (!guest1.ok || !guest2.ok) {
      return;
    }

    leaveRoom(host.room.code, host.participantId);
    const room = getRoom(host.room.code, guest1.participantId);
    expect(room?.hostId).toBe(guest1.participantId);

    const started = startGame(host.room.code, guest1.participantId);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    expect(started.room.drawerId).toBe(guest1.participantId);
    const snapshot = toRoomSnapshot(started.room, guest1.participantId);
    expect(snapshot.participants.find((p) => p.id === guest1.participantId)?.role).toBe("drawer");
  });
});
