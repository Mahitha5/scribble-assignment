import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useRoomStore } from "../state/roomStore";

export function CreateRoomPage() {
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const roomStore = useRoomStore();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError(null);
      await roomStore.createRoom(playerName);
      navigate("/lobby");
    } catch (caughtError) {
      const raw = caughtError instanceof Error ? caughtError.message : "Unable to create room";
      setError(raw);
    }
  }

  return (
    <section className="panel panel--narrow placeholder-page">
      <PageHeader
        kicker="New lobby"
        title="Create Room"
        description="Optionally enter a display name, or leave blank for an empty name."
      />
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Player name (optional)</span>
          <input
            className="form__input"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Sketch captain"
          />
        </label>
        {error ? <p className="form__error">{error}</p> : null}
        <div className="button-row">
          <button className="button button--primary" type="submit">
            Create and Continue
          </button>
          <button className="button button--secondary" type="button" onClick={() => navigate("/")}>
            Back
          </button>
        </div>
      </form>
    </section>
  );
}
