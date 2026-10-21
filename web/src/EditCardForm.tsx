import { UpdateCardSchema, type Card, type UpdateCardInput } from "@live-board/shared";
import { useState, type KeyboardEvent, type SubmitEvent } from "react";
import { errorMessage, isVersionConflict, updateCard } from "./api.ts";

interface EditCardFormProps {
  card: Card;
  onSaved: (card: Card) => void;
  onStale: () => void;
  onClose: () => void;
}

export function EditCardForm({ card, onSaved, onStale, onClose }: EditCardFormProps) {
  const [initial] = useState(() => ({
    title: card.title,
    description: card.description ?? "",
    version: card.version,
  }));
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(expectedVersion: number) {
    const changes: UpdateCardInput = {};

    if (title !== initial.title) {
      changes.title = title;
    }

    if (description !== initial.description) {
      changes.description = description.trim() === "" ? null : description;
    }

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    const parsed = UpdateCardSchema.safeParse(changes);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form geçersiz.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      onSaved(await updateCard(card.id, parsed.data, expectedVersion));
      onClose();
    } catch (caught) {
      if (isVersionConflict(caught)) {
        setConflict(true);
        onStale();
      } else {
        setError(errorMessage(caught));
      }

      setPending(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!conflict) {
      void save(initial.version);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  return (
    <form className="edit-card" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <input
        aria-label="Yeni başlık"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={200}
        autoFocus
      />
      <textarea
        aria-label="Yeni açıklama"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
      />
      {conflict ? (
        <div className="conflict" role="alert">
          <p>Bu kart sen düzenlerken değişti. Şu anki hali:</p>
          <p className="conflict-current">
            <strong>{card.title}</strong>
            {card.description && <span> — {card.description}</span>}
          </p>
          <p>Kaydedersen yalnız senin değiştirdiğin alanlar yazılır.</p>
          <div className="edit-actions">
            <button type="button" disabled={pending} onClick={() => void save(card.version)}>
              {pending ? "Kaydediliyor..." : "Benimkini yine de kaydet"}
            </button>
            <button type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="edit-actions">
          <button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button type="button" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
