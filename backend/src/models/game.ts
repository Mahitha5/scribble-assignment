export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "playing" | "result";

export interface Point {
  x: number;
  y: number;
}

export interface StrokeSegment {
  id: string;
  points: Point[];
  color: string;
  lineWidth: number;
}

export interface GuessEntry {
  id: string;
  participantId: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  scoredPoints: number;
  submittedAt: string;
}

export interface GuessView {
  id: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  scoredPoints: number;
  submittedAt: string;
}

export interface ParticipantScore {
  participantId: string;
  playerName: string;
  score: number;
}

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
  strokes?: StrokeSegment[];
  guesses?: GuessEntry[];
  scores?: Record<string, number>;
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
  strokes?: StrokeSegment[];
  guesses?: GuessView[];
  scores?: ParticipantScore[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
