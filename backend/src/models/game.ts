export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "active";

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  lastSeenAt: string;
}

export interface ParticipantSnapshot {
  id: string;
  name: string;
  joinedAt: string;
  isHost: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  status: RoomStatus;
  canStart: boolean;
  participants: ParticipantSnapshot[];
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
