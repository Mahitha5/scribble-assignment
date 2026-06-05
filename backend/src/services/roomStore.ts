import { randomUUID } from "node:crypto";
import type { Participant, Room, RoomSnapshot } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

export const STALE_THRESHOLD_MS = 6_000;

const rooms = new Map<string, Room>();

export type RoomStoreErrorCode =
  | "INVALID_CODE"
  | "ROOM_NOT_FOUND"
  | "DUPLICATE_NAME"
  | "GAME_IN_PROGRESS"
  | "NOT_HOST"
  | "INSUFFICIENT_PLAYERS";

export class RoomStoreError extends Error {
  readonly code: RoomStoreErrorCode;

  constructor(code: RoomStoreErrorCode, message: string) {
    super(message);
    this.name = "RoomStoreError";
    this.code = code;
  }
}

function now() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function isDuplicateDisplayName(existing: string | undefined, incoming: string | undefined) {
  if (existing === incoming) {
    return true;
  }

  if (existing === undefined || incoming === undefined) {
    return false;
  }

  return existing.toLowerCase() === incoming.toLowerCase();
}

export function isValidRoomCode(code: string) {
  return /^[A-Za-z0-9]{4}$/.test(code.trim());
}

export function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

function isStale(lastSeenAt: string, referenceMs = nowMs()) {
  return referenceMs - Date.parse(lastSeenAt) > STALE_THRESHOLD_MS;
}

function isParticipantPresent(participant: Participant, referenceMs = nowMs()) {
  return !isStale(participant.lastSeenAt, referenceMs);
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

function persistRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
}

function createParticipant(name?: string, isHost = false): Participant {
  const timestamp = now();

  return {
    id: randomUUID(),
    name,
    isHost,
    joinedAt: timestamp,
    lastSeenAt: timestamp
  };
}

function participantsByJoinOrder(room: Room) {
  return [...room.participants].sort((left, right) => left.joinedAt.localeCompare(right.joinedAt));
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function resolveHostTransfer(room: Room, referenceMs = nowMs()) {
  if (room.status !== "lobby") {
    return;
  }

  const host = room.participants.find((participant) => participant.isHost);

  if (!host || !isStale(host.lastSeenAt, referenceMs)) {
    return;
  }

  const ordered = participantsByJoinOrder(room);
  const hostIndex = ordered.findIndex((participant) => participant.id === host.id);

  if (hostIndex === -1) {
    return;
  }

  room.participants.forEach((participant) => {
    participant.isHost = false;
  });

  let newHost: Participant | undefined;

  for (let offset = 1; offset < ordered.length; offset += 1) {
    const candidate = ordered[(hostIndex + offset) % ordered.length];

    if (candidate.id === host.id) {
      continue;
    }

    const liveParticipant = room.participants.find((participant) => participant.id === candidate.id);

    if (liveParticipant && isParticipantPresent(liveParticipant, referenceMs)) {
      newHost = liveParticipant;
      break;
    }
  }

  if (!newHost) {
    for (let offset = 1; offset < ordered.length; offset += 1) {
      const candidate = ordered[(hostIndex + offset) % ordered.length];

      if (candidate.id !== host.id) {
        newHost = room.participants.find((participant) => participant.id === candidate.id);
        break;
      }
    }
  }

  if (newHost) {
    newHost.isHost = true;
    persistRoom(room);
  }
}

export function evictIfAllParticipantsStale(code: string, referenceMs = nowMs()) {
  const room = rooms.get(code);

  if (!room) {
    return true;
  }

  if (room.participants.length === 0) {
    rooms.delete(code);
    return true;
  }

  const allStale = room.participants.every((participant) => isStale(participant.lastSeenAt, referenceMs));

  if (allStale) {
    rooms.delete(code);
    return true;
  }

  return false;
}

function assertValidCode(code: string) {
  if (!isValidRoomCode(code)) {
    throw new RoomStoreError("INVALID_CODE", "Invalid room code format");
  }
}

function loadPreparedRoom(code: string, notFoundMessage: string) {
  assertValidCode(code);

  const normalized = normalizeRoomCode(code);
  let room = rooms.get(normalized);

  if (!room) {
    throw new RoomStoreError("ROOM_NOT_FOUND", notFoundMessage);
  }

  resolveHostTransfer(room);
  evictIfAllParticipantsStale(normalized);
  room = rooms.get(normalized);

  if (!room) {
    throw new RoomStoreError("ROOM_NOT_FOUND", notFoundMessage);
  }

  return room;
}

export function touchParticipant(code: string, participantId: string) {
  const room = loadPreparedRoom(code, "Unable to load room");
  const participant = room.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new RoomStoreError("ROOM_NOT_FOUND", "Unable to load room");
  }

  participant.lastSeenAt = now();
  persistRoom(room);
  return room;
}

export function createRoom(playerName?: string) {
  const participant = createParticipant(playerName, true);
  const room: Room = {
    code: generateUniqueCode(),
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

export function joinRoom(code: string, playerName?: string) {
  const room = loadPreparedRoom(code, "Unable to join room");

  if (room.status !== "lobby") {
    throw new RoomStoreError("GAME_IN_PROGRESS", "Game already in progress");
  }

  const incomingName = playerName;
  const duplicateName = room.participants.some((participant) =>
    isDuplicateDisplayName(participant.name, incomingName)
  );

  if (duplicateName) {
    throw new RoomStoreError("DUPLICATE_NAME", "Choose a different name");
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  persistRoom(room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  if (!isValidRoomCode(code)) {
    return null;
  }

  const room = rooms.get(normalizeRoomCode(code));
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  persistRoom(room);
  return getRoom(room.code);
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const viewer = viewerParticipantId
    ? room.participants.find((participant) => participant.id === viewerParticipantId)
    : undefined;
  const isViewerHost = viewer?.isHost ?? false;

  return {
    code: room.code,
    status: room.status,
    participants: room.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      isHost: participant.isHost,
      joinedAt: participant.joinedAt
    })),
    availableWords: listWords(),
    roles: [...STARTER_ROLES],
    viewerParticipantId,
    isViewerHost,
    canStartGame: isViewerHost && room.status === "lobby" && room.participants.length >= 2
  };
}

export function getRoomSnapshot(code: string, participantId?: string) {
  if (participantId) {
    touchParticipant(code, participantId);
  }

  const room = loadPreparedRoom(code, "Unable to load room");

  return toRoomSnapshot(room, participantId);
}

export function startGame(code: string, participantId: string) {
  const room = loadPreparedRoom(code, "Unable to load room");

  if (room.status !== "lobby") {
    throw new RoomStoreError("GAME_IN_PROGRESS", "Game already in progress");
  }

  const participant = room.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new RoomStoreError("ROOM_NOT_FOUND", "Unable to load room");
  }

  if (!participant.isHost) {
    throw new RoomStoreError("NOT_HOST", "Only the host can start the game");
  }

  if (room.participants.length < 2) {
    throw new RoomStoreError("INSUFFICIENT_PLAYERS", "Waiting for more players");
  }

  room.status = "playing";
  persistRoom(room);

  return toRoomSnapshot(room, participantId);
}

/** Test helper */
export function clearAllRooms() {
  rooms.clear();
}

/** Test helper */
export function setParticipantLastSeenAt(code: string, participantId: string, lastSeenAt: string) {
  const room = rooms.get(normalizeRoomCode(code));

  if (!room) {
    return;
  }

  const participant = room.participants.find((entry) => entry.id === participantId);

  if (participant) {
    participant.lastSeenAt = lastSeenAt;
    persistRoom(room);
  }
}
