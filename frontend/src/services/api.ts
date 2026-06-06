export type ParticipantRole = "drawer" | "guesser";

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
}

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "playing" | "result";
  participants: Participant[];
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

export interface StrokeInput {
  points: Point[];
  color?: string;
  lineWidth?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new Error(errorBody.message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}${query}`);
  },
  startGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  appendStroke(code: string, participantId: string, stroke: StrokeInput) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
      method: "POST",
      body: JSON.stringify({ participantId, stroke })
    });
  },
  clearCanvas(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/canvas/clear`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  submitGuess(code: string, participantId: string, text: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/guesses`, {
      method: "POST",
      body: JSON.stringify({ participantId, text })
    });
  },
  endRound(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/end`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  restartGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/restart`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  }
};
