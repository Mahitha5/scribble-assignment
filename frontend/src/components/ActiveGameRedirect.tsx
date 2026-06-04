import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRoomState } from "../state/roomStore";

/** Routes clients with an active session to /game when the room phase is active (FR-004). */
export function ActiveGameRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { room } = useRoomState();

  useEffect(() => {
    if (room?.status === "active" && pathname !== "/game") {
      navigate("/game", { replace: true });
    }
  }, [navigate, pathname, room?.status]);

  return null;
}
