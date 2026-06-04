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
  role?: ParticipantRole;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
  drawerId?: string;
  secretWord?: string;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  status: RoomStatus;
  canStart: boolean;
  participants: ParticipantSnapshot[];
  roles: ParticipantRole[];
  drawerId?: string;
  secretWord?: string;
  availableWords?: string[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
