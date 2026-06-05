import {
  createElement,
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren
} from "react";
import { api, type RoomSessionResponse, type RoomSnapshot } from "../services/api";

const SESSION_STORAGE_KEY = "scribble.session";

interface PersistedSession {
  participantId: string;
  roomCode: string;
}

export interface RoomState {
  room: RoomSnapshot | null;
  participantId: string | null;
  roomCode: string | null;
  error: string | null;
  isLoading: boolean;
}

type Listener = () => void;

function readPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedSession;

    if (!parsed.participantId || !parsed.roomCode) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writePersistedSession(session: PersistedSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

class RoomStore {
  private state: RoomState = {
    room: null,
    participantId: null,
    roomCode: null,
    error: null,
    isLoading: false
  };

  private listeners = new Set<Listener>();

  constructor() {
    const session = readPersistedSession();

    if (session) {
      this.state = {
        ...this.state,
        participantId: session.participantId,
        roomCode: session.roomCode
      };
    }
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  private setState(nextState: Partial<RoomState>) {
    this.state = {
      ...this.state,
      ...nextState
    };
    this.listeners.forEach((listener) => listener());
  }

  private persistSession() {
    if (this.state.participantId && this.state.roomCode) {
      writePersistedSession({
        participantId: this.state.participantId,
        roomCode: this.state.roomCode
      });
      return;
    }

    writePersistedSession(null);
  }

  clearSession() {
    writePersistedSession(null);
    this.setState({
      room: null,
      participantId: null,
      roomCode: null,
      error: null,
      isLoading: false
    });
  }

  private async withLoading<T>(operation: () => Promise<T>, options?: { silent?: boolean }) {
    if (!options?.silent) {
      this.setState({
        isLoading: true,
        error: null
      });
    }

    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected request failure";

      if (!options?.silent) {
        this.setState({ error: message });
      }

      throw error;
    } finally {
      if (!options?.silent) {
        this.setState({ isLoading: false });
      }
    }
  }

  setRoomSession(response: RoomSessionResponse) {
    this.setState({
      participantId: response.participantId,
      roomCode: response.room.code,
      room: response.room,
      error: null
    });
    this.persistSession();
  }

  setRoomSnapshot(room: RoomSnapshot) {
    this.setState({
      room,
      roomCode: room.code,
      error: null
    });
    this.persistSession();
  }

  hasSession() {
    return Boolean(this.state.participantId && this.state.roomCode);
  }

  async createRoom(playerName: string) {
    const response = await this.withLoading(() => api.createRoom(playerName));
    this.setRoomSession(response);
    return response;
  }

  async joinRoom(code: string, playerName: string) {
    const response = await this.withLoading(() => api.joinRoom(code, playerName));
    this.setRoomSession(response);
    return response;
  }

  async fetchRoom(options?: { silent?: boolean }) {
    const code = this.state.room?.code ?? this.state.roomCode;

    if (!code) {
      return null;
    }

    const response = await this.withLoading(
      () => api.fetchRoom(code, this.state.participantId ?? undefined),
      options
    );
    this.setRoomSnapshot(response.room);
    return response.room;
  }

  async startGame() {
    const code = this.state.room?.code ?? this.state.roomCode;
    const participantId = this.state.participantId;

    if (!code || !participantId) {
      throw new Error("Missing room session");
    }

    const response = await this.withLoading(() => api.startGame(code, participantId));
    this.setRoomSnapshot(response.room);
    return response.room;
  }
}

const RoomStoreContext = createContext<RoomStore | null>(null);

export function RoomStoreProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<RoomStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = new RoomStore();
  }

  return createElement(RoomStoreContext.Provider, { value: storeRef.current }, children);
}

export function useRoomStore() {
  const store = useContext(RoomStoreContext);

  if (!store) {
    throw new Error("RoomStoreProvider is missing");
  }

  return store;
}

export function useRoomState() {
  const store = useRoomStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export { SESSION_STORAGE_KEY };
