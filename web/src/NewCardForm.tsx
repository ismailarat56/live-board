import { NewCardSchema, type Card } from "@live-board/shared";
import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { createCard, errorMessage } from "./api.ts";

interface NewCardFormProps {
  boardId: number;
  onCreated: (card: Card) => void;
}

export function NewCardForm({ boardId, onCreated }: NewCardFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = NewCardSchema.safeParse({
      title,
      description: description.trim() === "" ? null : description,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form geçersiz.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const card = await createCard(boardId, parsed.data);
      onCreated(card);
      setTitle("");
      setDescription("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  return (
    <form className="new-card" onSubmit={handleSubmit} noValidate>
      <input
        aria-label="Kart başlığı"
        placeholder="Kart başlığı"
        value={title}
        onChange={handleTitleChange}
        maxLength={200}
      />
      <textarea
        aria-label="Açıklama"
        placeholder="Açıklama (isteğe bağlı)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Ekleniyor..." : "Kart ekle"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
