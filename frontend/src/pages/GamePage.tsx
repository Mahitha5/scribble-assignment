import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useGamePolling } from "../hooks/useGamePolling";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, roomCode } = useRoomState();
  const { pollError, isRefreshing } = useGamePolling();
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
          caughtError instanceof Error ? caughtError.message : "Unable to load game";

        if (message.toLowerCase().includes("unable to load room")) {
          roomStore.clearSession();
          navigate("/", { replace: true });
          return;
        }

        setInitialLoadError(message);
      }
    }

    if (!room || room.status !== "playing") {
      void loadInitialSnapshot();
    }

    return () => {
      active = false;
    };
  }, [navigate, participantId, room, roomCode, roomStore]);

  if (!participantId || !roomCode || !room) {
    return (
      <section className="panel placeholder-page">
        <p>{initialLoadError ?? "Loading game..."}</p>
      </section>
    );
  }

  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;
  const drawer = room.drawerId
    ? room.participants.find((participant) => participant.id === room.drawerId) ?? null
    : null;
  const viewerRole = room.viewerRole ?? (room.drawerId === participantId ? "drawer" : "guesser");
  const roleLabel = viewerRole === "drawer" ? "Drawer" : "Guesser";

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      {pollError ? <p className="status-line">{pollError}</p> : null}
      {isRefreshing ? <p className="status-line">Refreshing game...</p> : null}

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard />
          <ResultPanel />
        </aside>

        <div className="game-page__main">
          <Card title="Word">
            <p className="game-page__word">{room.wordDisplay ?? "Guess word"}</p>
          </Card>

          <Card title="Canvas">
            <div
              className="canvas-placeholder"
              style={{ minHeight: "500px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
            >
              {drawer ? `${drawer.name ?? "Someone"} is drawing...` : "Waiting for drawer..."}
            </div>
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewer?.name ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleLabel}</dd>
              </div>
              <div>
                <dt>Drawer</dt>
                <dd>{drawer?.name ?? "Unknown drawer"}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Your Guess">
            <GuessForm />
          </Card>
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
