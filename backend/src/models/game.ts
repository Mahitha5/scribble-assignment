export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "playing";

export interface Participant {
  id: string;
  name?: string;
  isHost: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  drawerId?: string;
  secretWord?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantView {
  id: string;
  name?: string;
  isHost: boolean;
  joinedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: ParticipantView[];
  availableWords: string[];
  roles: ParticipantRole[];
  viewerParticipantId?: string;
  isViewerHost: boolean;
  canStartGame: boolean;
  drawerId?: string;
  viewerRole?: ParticipantRole;
  wordDisplay?: string;
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
