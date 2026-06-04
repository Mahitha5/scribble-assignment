export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "active";

export interface ParticipantSnapshot {
  id: string;
  name: string;
  joinedAt: string;
  isHost: boolean;
  role?: ParticipantRole;
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

function playerNameBody(playerName?: string) {
  return { playerName: playerName ?? "" };
}

export const api = {
  createRoom(playerName?: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify(playerNameBody(playerName))
    });
  },
  joinRoom(code: string, playerName?: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify(playerNameBody(playerName))
    });
  },
  leaveRoom(code: string, participantId: string) {
    return request<{ success: boolean }>(`/rooms/${encodeURIComponent(code)}/leave`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  startGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}${query}`);
  }
};
