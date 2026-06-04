import { randomUUID } from "node:crypto";
import type { Participant, ParticipantRole, Room, RoomSnapshot } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

/** Participants without a poll heartbeat longer than this are treated as disconnected. */
export const STALE_PARTICIPANT_MS = 15_000;

const MAX_CODE_GENERATION_ATTEMPTS = 10;

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 4 + Math.floor(Math.random() * 3);
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    if (!rooms.has(code)) {
      return code;
    }
  }

  throw new Error("Failed to generate unique room code");
}

function storePlayerNameAsIs(name?: string): string {
  return name ?? "";
}

function createParticipant(name?: string): Participant {
  const timestamp = now();
  return {
    id: randomUUID(),
    name: storePlayerNameAsIs(name),
    joinedAt: timestamp,
    lastSeenAt: timestamp
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

function touchParticipant(room: Room, participantId: string) {
  const participant = room.participants.find((entry) => entry.id === participantId);
  if (participant) {
    participant.lastSeenAt = now();
  }
}

function transferHost(room: Room) {
  const hostPresent = room.participants.some((participant) => participant.id === room.hostId);
  if (hostPresent) {
    return;
  }

  const remaining = [...room.participants].sort(
    (left, right) => Date.parse(left.joinedAt) - Date.parse(right.joinedAt)
  );

  if (remaining.length > 0) {
    room.hostId = remaining[0].id;
  }
}

function pruneStaleParticipants(room: Room): boolean {
  const cutoff = Date.now() - STALE_PARTICIPANT_MS;
  const before = room.participants.length;
  room.participants = room.participants.filter((participant) => {
    const lastSeen = Date.parse(participant.lastSeenAt);
    return !Number.isNaN(lastSeen) && lastSeen >= cutoff;
  });

  if (room.participants.length !== before) {
    transferHost(room);
    return true;
  }

  return false;
}

function persistOrDeleteRoom(room: Room) {
  if (room.participants.length === 0) {
    rooms.delete(room.code);
    return null;
  }

  room.updatedAt = now();
  rooms.set(room.code, room);
  return cloneRoom(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

/** Deterministic first-round word from room code only (sum of char codes mod vocabulary size). */
export function pickSecretWordForRoomCode(code: string): string {
  let sum = 0;
  for (const char of code) {
    sum += char.charCodeAt(0);
  }
  const index = sum % STARTER_WORDS.length;
  return STARTER_WORDS[index]!;
}

export function createRoom(playerName?: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    hostId: participant.id,
    status: "lobby",
    participants: [participant],
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export type JoinRoomResult =
  | { ok: true; room: Room; participantId: string }
  | { ok: false; reason: "not_found" | "duplicate" };

/** After leave, prior participantId is invalid; rejoin always creates a new participant. */
export function joinRoom(code: string, playerName?: string, existingParticipantId?: string) {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" } satisfies JoinRoomResult;
  }

  if (
    existingParticipantId &&
    room.participants.some((participant) => participant.id === existingParticipantId)
  ) {
    return { ok: false, reason: "duplicate" } satisfies JoinRoomResult;
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    ok: true,
    room: cloneRoom(room),
    participantId: participant.id
  } satisfies JoinRoomResult;
}

export type LeaveRoomResult =
  | { ok: true; room: Room | null }
  | { ok: false; reason: "not_found" | "not_in_room" };

export function leaveRoom(code: string, participantId: string): LeaveRoomResult {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (!room.participants.some((participant) => participant.id === participantId)) {
    return { ok: false, reason: "not_in_room" };
  }

  room.participants = room.participants.filter((participant) => participant.id !== participantId);
  transferHost(room);

  const updated = persistOrDeleteRoom(room);
  return { ok: true, room: updated };
}

export type StartGameResult =
  | { ok: true; room: Room }
  | { ok: false; reason: "not_found" | "not_host" | "not_enough_players" | "already_started" };

export function startGame(code: string, participantId: string): StartGameResult {
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, reason: "not_found" };
  }

  if (room.status === "active") {
    return { ok: false, reason: "already_started" };
  }

  if (room.hostId !== participantId) {
    return { ok: false, reason: "not_host" };
  }

  if (room.participants.length < 2) {
    return { ok: false, reason: "not_enough_players" };
  }

  const namesBefore = room.participants.map((participant) => participant.name);

  room.status = "active";
  room.drawerId = room.hostId;
  room.secretWord = pickSecretWordForRoomCode(room.code);
  room.updatedAt = now();
  rooms.set(room.code, room);

  const namesAfter = room.participants.map((participant) => participant.name);
  if (namesBefore.join("\u0000") !== namesAfter.join("\u0000")) {
    throw new Error("startGame must not modify participant names");
  }

  return { ok: true, room: cloneRoom(room) };
}

export function getRoom(code: string, viewerParticipantId?: string) {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  if (viewerParticipantId) {
    touchParticipant(room, viewerParticipantId);
  }

  pruneStaleParticipants(room);
  return persistOrDeleteRoom(room);
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

function participantRole(room: Room, participantId: string): ParticipantRole | undefined {
  if (room.status !== "active" || !room.drawerId) {
    return undefined;
  }
  return participantId === room.drawerId ? "drawer" : "guesser";
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const isDrawerViewer =
    room.status === "active" &&
    Boolean(room.drawerId) &&
    viewerParticipantId === room.drawerId;

  const snapshot: RoomSnapshot = {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    canStart: room.status === "lobby" && room.participants.length >= 2,
    participants: room.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      joinedAt: participant.joinedAt,
      isHost: participant.id === room.hostId,
      ...(room.status === "active" && room.drawerId
        ? { role: participantRole(room, participant.id)! }
        : {})
    })),
    roles: [...STARTER_ROLES],
    ...(room.status === "active" && room.drawerId ? { drawerId: room.drawerId } : {}),
    ...(room.status === "lobby" ? { availableWords: listWords() } : {})
  };

  if (isDrawerViewer && room.secretWord) {
    snapshot.secretWord = room.secretWord;
  }

  return snapshot;
}
