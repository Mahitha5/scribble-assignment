import { useState } from "react";

interface GuessFormProps {
  disabled?: boolean;
  onSubmit: (text: string) => Promise<void>;
}

export function GuessForm({ disabled = false, onSubmit }: GuessFormProps) {
  const [guessText, setGuessText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(guessText);
      setGuessText("");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to submit guess";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <input
          className="form__input"
          value={guessText}
          onChange={(event) => {
            setGuessText(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Type your guess here..."
          disabled={disabled || isSubmitting}
        />
      </label>
      {error ? <p className="form__error">{error}</p> : null}
      <div className="button-row button-row--compact">
        <button
          className="button button--primary"
          type="submit"
          disabled={disabled || isSubmitting}
        >
          Submit Guess
        </button>
      </div>
    </form>
  );
}
