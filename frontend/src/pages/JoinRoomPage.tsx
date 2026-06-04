import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useRoomStore } from "../state/roomStore";

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,6}$/;

export function JoinRoomPage() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const roomStore = useRoomStore();

  const normalizedCode = roomCode.trim().toUpperCase();
  const canSubmit = normalizedCode.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (!ROOM_CODE_PATTERN.test(normalizedCode)) {
      setError("Room code must be 4-6 uppercase letters and numbers.");
      return;
    }

    try {
      setError(null);
      await roomStore.joinRoom(normalizedCode, playerName);
      navigate("/lobby");
    } catch (caughtError) {
      const raw = caughtError instanceof Error ? caughtError.message : "Unable to join room";
      setError(raw);
    }
  }

  return (
    <section className="panel panel--narrow placeholder-page">
      <PageHeader
        kicker="Existing lobby"
        title="Join Room"
        description="Enter the room code to join. Display name is optional (blank is stored as empty)."
      />
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Player name (optional)</span>
          <input
            className="form__input"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Second pencil"
          />
        </label>

        <label className="form__field">
          <span>Room code</span>
          <input
            className="form__input form__input--code"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={6}
            required
          />
        </label>
        {error ? <p className="form__error">{error}</p> : null}
        <div className="button-row">
          <button className="button button--primary" type="submit" disabled={!canSubmit}>
            Join Lobby
          </button>
          <button className="button button--secondary" type="button" onClick={() => navigate("/")}>
            Back
          </button>
        </div>
      </form>
    </section>
  );
}
