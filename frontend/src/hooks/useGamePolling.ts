import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

function isRoomNotFoundError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("unable to load room");
}

export function useGamePolling() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { roomCode, participantId } = useRoomState();
  const [pollError, setPollError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!roomCode || !participantId) {
      return;
    }

    let active = true;

    async function poll() {
      try {
        setIsRefreshing(true);
        setPollError(null);
        await roomStore.fetchRoom({ silent: true });
      } catch (error) {
        if (!active) {
          return;
        }

        if (isRoomNotFoundError(error)) {
          roomStore.clearSession();
          navigate("/", { replace: true });
          return;
        }

        setPollError(error instanceof Error ? error.message : "Unable to refresh game");
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    }

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [navigate, participantId, roomCode, roomStore]);

  return { pollError, isRefreshing };
}
