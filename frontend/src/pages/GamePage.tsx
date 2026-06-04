import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useIsDrawer, useRoomState, useRoomStore, useViewerRole } from "../state/roomStore";

const POLL_BASE_MS = 2000;
const POLL_MAX_MS = 30_000;

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, error } = useRoomState();
  const viewerRole = useViewerRole();
  const isDrawer = useIsDrawer();
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room?.code || room.status !== "active") {
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
        await roomStore.fetchRoom();
        if (cancelled) {
          return;
        }
        setPollError(null);
        delayMs = POLL_BASE_MS;
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
  }, [room?.code, room?.status, roomStore]);

  if (!room) {
    return null;
  }

  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;
  const drawerParticipant = room.participants.find((participant) => participant.role === "drawer");

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      {pollError ? (
        <p className="status-line" style={{ marginBottom: "12px" }}>
          {pollError}
        </p>
      ) : null}
      {error ? (
        <p className="status-line" style={{ marginBottom: "12px" }}>
          {error}
        </p>
      ) : null}

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard />
          <ResultPanel />
          <Card title="Players">
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>
                    {participant.name}
                    {participant.role === "drawer" ? " (Drawer)" : participant.role === "guesser" ? " (Guesser)" : ""}
                    {participant.id === participantId ? " — you" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="game-page__main">
          {isDrawer && room.secretWord ? (
            <Card title="Secret Word">
              <p className="game-page__secret-word">{room.secretWord}</p>
            </Card>
          ) : null}

          <Card title="Canvas">
            <div
              className="canvas-placeholder"
              style={{
                minHeight: "500px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb"
              }}
            >
              {isDrawer
                ? "You are drawing — waiting for guessers…"
                : drawerParticipant
                  ? `${drawerParticipant.name} is drawing…`
                  : "Waiting for drawer…"}
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
                <dd>
                  {viewerRole === "drawer"
                    ? "Drawer"
                    : viewerRole === "guesser"
                      ? "Guesser"
                      : "Playing"}
                </dd>
              </div>
            </dl>
          </Card>

          {viewerRole === "guesser" ? (
            <Card title="Secret Word">
              <p>The word is hidden while the round is in progress.</p>
            </Card>
          ) : null}

          {viewerRole === "guesser" ? (
            <Card title="Your Guess">
              <GuessForm />
            </Card>
          ) : null}
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
