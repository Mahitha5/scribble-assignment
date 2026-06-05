import type { ParticipantScore } from "../services/api";
import { Card } from "./Card";

interface ScoreboardProps {
  scores: ParticipantScore[];
}

export function Scoreboard({ scores }: ScoreboardProps) {
  if (scores.length === 0) {
    return (
      <Card title="Scoreboard">
        <div className="placeholder-block">
          <p className="placeholder-block__text">Waiting for players...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Scoreboard">
      <ul className="scoreboard-list">
        {scores.map((entry) => (
          <li key={entry.participantId} className="scoreboard-list__item">
            <span>{entry.playerName}</span>
            <strong>{entry.score}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}
