import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { DrawingCanvas } from "../components/DrawingCanvas";
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

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
        const snapshot = await roomStore.fetchRoom();

        if (!active || !snapshot) {
          return;
        }

        if (snapshot.status === "lobby") {
          navigate("/lobby", { replace: true });
        }
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

    void loadInitialSnapshot();

    return () => {
      active = false;
    };
  }, [navigate, participantId, roomCode, roomStore]);

  if (!participantId || !roomCode || !room) {
    return (
      <section className="panel placeholder-page">
        <p>{initialLoadError ?? "Loading game..."}</p>
      </section>
    );
  }

  const isPlaying = room.status === "playing";
  const isResult = room.status === "result";
  const isRoundActive = isPlaying || isResult;
  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;
  const drawer = room.drawerId
    ? room.participants.find((participant) => participant.id === room.drawerId) ?? null
    : null;
  const viewerRole =
    room.viewerRole ??
    (isPlaying && room.drawerId === participantId ? "drawer" : isPlaying ? "guesser" : undefined);
  const roleLabel =
    viewerRole === "drawer" ? "Drawer" : viewerRole === "guesser" ? "Guesser" : isResult ? "Spectator" : "Player";
  const strokes = room.strokes ?? [];
  const guesses = room.guesses ?? [];
  const scores = room.scores ?? [];
  const isDrawer = isPlaying && viewerRole === "drawer";
  const canDraw = isDrawer;
  const showGuessForm = isPlaying && !isDrawer;
  const pageTitle = isResult ? "Round Results" : "Guess the Word!";

  async function handleEndRound() {
    try {
      setActionError(null);
      setIsEndingRound(true);
      await roomStore.endRound();
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to end round");
    } finally {
      setIsEndingRound(false);
    }
  }

  async function handleRestart() {
    try {
      setActionError(null);
      setIsRestarting(true);
      await roomStore.restartGame();
      navigate("/lobby", { replace: true });
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unable to restart game");
    } finally {
      setIsRestarting(false);
    }
  }

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">{pageTitle}</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      {pollError ? <p className="status-line">{pollError}</p> : null}
      {actionError ? <p className="status-line">{actionError}</p> : null}
      {isRefreshing ? <p className="status-line">Refreshing game...</p> : null}

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard scores={scores} />
          <ResultPanel guesses={guesses} />
        </aside>

        <div className="game-page__main">
          <Card title="Word">
            <p className="game-page__word">{room.wordDisplay ?? (isResult ? "—" : "Guess word")}</p>
          </Card>

          <Card title="Canvas">
            <div className="canvas-panel">
              <DrawingCanvas
                mode={canDraw ? "draw" : "view"}
                strokes={strokes}
                onStrokeComplete={
                  canDraw
                    ? async (stroke) => {
                        if (room.status !== "playing") {
                          return;
                        }

                        await roomStore.appendStroke(stroke);
                      }
                    : undefined
                }
              />
              {canDraw ? (
                <div className="button-row button-row--compact canvas-panel__actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => {
                      if (room.status !== "playing") {
                        return;
                      }

                      void roomStore.clearCanvas();
                    }}
                  >
                    Clear Canvas
                  </button>
                </div>
              ) : isPlaying ? (
                <p className="canvas-panel__hint">
                  {drawer ? `${drawer.name ?? "Someone"} is drawing...` : "Waiting for drawer..."}
                </p>
              ) : isResult ? (
                <p className="canvas-panel__hint">Final drawing</p>
              ) : null}
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
              {isRoundActive ? (
                <div>
                  <dt>Drawer</dt>
                  <dd>{drawer?.name ?? "Unknown drawer"}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {showGuessForm ? (
            <Card title="Your Guess">
              <GuessForm
                disabled={!isPlaying || isDrawer}
                onSubmit={async (text) => {
                  if (room.status !== "playing") {
                    return;
                  }

                  await roomStore.submitGuess(text);
                }}
              />
            </Card>
          ) : null}
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
        {isPlaying && room.isViewerHost ? (
          <button
            className="button button--primary"
            type="button"
            disabled={isEndingRound}
            onClick={() => {
              void handleEndRound();
            }}
          >
            {isEndingRound ? "Ending..." : "End Round"}
          </button>
        ) : null}
        {isResult && room.isViewerHost ? (
          <button
            className="button button--primary"
            type="button"
            disabled={isRestarting}
            onClick={() => {
              void handleRestart();
            }}
          >
            {isRestarting ? "Restarting..." : "Restart"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
