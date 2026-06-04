import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useIsHost, useRoomState, useRoomStore } from "../state/roomStore";

const POLL_BASE_MS = 2000;
const POLL_MAX_MS = 30_000;

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const isHost = useIsHost();
  const { room, error, isLoading, participantId } = useRoomState();
  const [pollError, setPollError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const skipLeaveOnUnmountRef = useRef(false);

  useEffect(() => {
    if (!room?.code) {
      return;
    }

    let cancelled = false;
    let delayMs = POLL_BASE_MS;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      try {
        const snapshot = await roomStore.fetchRoom();
        if (cancelled) {
          return;
        }

        setPollError(null);
        delayMs = POLL_BASE_MS;

        if (snapshot?.status === "active") {
          skipLeaveOnUnmountRef.current = true;
          navigate("/game", { replace: true });
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }

        setPollError("Connection issue — retrying…");
        delayMs = Math.min(delayMs * 2, POLL_MAX_MS);
      }

      timeoutId = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate, room?.code, roomStore]);

  // Best-effort leave on tab close only — not on React unmount (Strict Mode remount
  // and in-app navigation to /game would otherwise POST /leave and clear the session).
  useEffect(() => {
    function handlePageHide() {
      if (!skipLeaveOnUnmountRef.current) {
        void roomStore.leaveRoom();
      }
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [roomStore]);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  async function handleStartGame() {
    if (!isHost || !room?.canStart) {
      return;
    }

    try {
      setIsStarting(true);
      await roomStore.startGame();
      skipLeaveOnUnmountRef.current = true;
      navigate("/game", { replace: true });
    } catch {
      // Error surfaced via room store state
    } finally {
      setIsStarting(false);
    }
  }

  async function handleLeave() {
    skipLeaveOnUnmountRef.current = true;
    await roomStore.leaveRoom();
    navigate("/", { replace: true });
  }

  if (!room) {
    return null;
  }

  const statusMessage =
    error ?? pollError ?? (isHost ? "You are the host." : "Waiting for the host to start the game.");

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
                  <span>
                    {participant.name}
                    {participant.isHost ? " (Host)" : ""}
                    {participant.id === participantId ? " — you" : ""}
                  </span>
                  <span className="player-list__meta">joined</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p
            className="status-line"
            style={{
              backgroundColor: isLoading || pollError ? "#fef3c7" : "#e0e7ff",
              color: isLoading || pollError ? "#b45309" : "#3730a3"
            }}
          >
            {isLoading ? "Updating lobby…" : pollError ? "Reconnecting…" : "Lobby open"}
          </p>
          <p style={{ marginTop: "8px" }}>{statusMessage}</p>
          {room.participants.length < 2 ? (
            <p style={{ marginTop: "8px" }}>Need at least 2 players to start.</p>
          ) : null}
        </Card>
      </div>

      <div className="button-row button-row--spread">
        <button className="button button--secondary" type="button" onClick={() => void handleLeave()}>
          Leave Room
        </button>
        {isHost ? (
          <button
            className="button button--primary"
            type="button"
            disabled={!room.canStart || isStarting || isLoading}
            onClick={() => void handleStartGame()}
          >
            {isStarting ? "Starting…" : "Start Game"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
