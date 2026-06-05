import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useLobbyPolling } from "../hooks/useLobbyPolling";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, roomCode, error, isLoading } = useRoomState();
  const { pollError, isRefreshing } = useLobbyPolling();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!participantId || !roomCode) {
      navigate("/", { replace: true });
    }
  }, [navigate, participantId, roomCode]);

  useEffect(() => {
    if (!participantId || !roomCode) {
      return;
    }

    let active = true;

    async function loadInitialSnapshot() {
      try {
        setInitialLoadError(null);
        await roomStore.fetchRoom();
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error ? caughtError.message : "Unable to load room";

        if (message.toLowerCase().includes("unable to load room")) {
          roomStore.clearSession();
          navigate("/", { replace: true });
          return;
        }

        setInitialLoadError(message);
      }
    }

    if (!room) {
      void loadInitialSnapshot();
    }

    return () => {
      active = false;
    };
  }, [navigate, participantId, room, roomCode, roomStore]);

  async function handleRefresh() {
    try {
      setRefreshError(null);
      await roomStore.fetchRoom();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to refresh room";

      if (message.toLowerCase().includes("unable to load room")) {
        roomStore.clearSession();
        navigate("/", { replace: true });
        return;
      }

      setRefreshError(message);
    }
  }

  async function handleStartGame() {
    try {
      setStartError(null);
      setIsStarting(true);
      await roomStore.startGame();
      navigate("/game", { replace: true });
    } catch (caughtError) {
      setStartError(caughtError instanceof Error ? caughtError.message : "Unable to start game");
    } finally {
      setIsStarting(false);
    }
  }

  if (!participantId || !roomCode || !room) {
    return (
      <section className="panel placeholder-page">
        <p>{initialLoadError ?? "Loading lobby..."}</p>
      </section>
    );
  }

  const statusMessage =
    pollError ??
    refreshError ??
    startError ??
    error ??
    (room.isViewerHost && !room.canStartGame
      ? "Waiting for more players before you can start."
      : "Waiting for the host to start the game.");

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  <span className="player-list__meta">
                    {participant.isHost ? "host" : "joined"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p
            className="status-line"
            style={{
              backgroundColor: isLoading || isRefreshing ? "#fef3c7" : "#e0e7ff",
              color: isLoading || isRefreshing ? "#b45309" : "#3730a3"
            }}
          >
            {isLoading || isRefreshing ? "Refreshing players..." : "Ready to play"}
          </p>
          <p style={{ marginTop: "8px" }}>{statusMessage}</p>
        </Card>
      </div>

      <div className="button-row button-row--spread">
        <button className="button button--secondary" disabled={isLoading} onClick={handleRefresh}>
          {isLoading ? "Refreshing..." : "Refresh Room"}
        </button>
        {room.canStartGame ? (
          <button
            className="button button--primary"
            disabled={isStarting}
            onClick={handleStartGame}
          >
            {isStarting ? "Starting..." : "Start Game"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
