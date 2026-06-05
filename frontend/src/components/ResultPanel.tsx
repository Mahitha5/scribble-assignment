import type { GuessView } from "../services/api";
import { Card } from "./Card";

interface ResultPanelProps {
  guesses: GuessView[];
}

export function ResultPanel({ guesses }: ResultPanelProps) {
  return (
    <Card title="Activity">
      {guesses.length === 0 ? (
        <p className="placeholder-block__text">Game activity and guesses will appear here.</p>
      ) : (
        <ul className="guess-history">
          {guesses.map((guess) => (
            <li key={guess.id} className="guess-history__item">
              <div className="guess-history__meta">
                <span className="guess-history__player">{guess.playerName}</span>
                <span
                  className={
                    guess.isCorrect
                      ? "guess-history__badge guess-history__badge--correct"
                      : "guess-history__badge guess-history__badge--incorrect"
                  }
                >
                  {guess.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="guess-history__text">{guess.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
