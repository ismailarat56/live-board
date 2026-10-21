import type { Card } from "@live-board/shared";
import { useState } from "react";
import { EditCardForm } from "./EditCardForm.tsx";
import type { Direction } from "./move-target.ts";

const DIRECTIONS: readonly Direction[] = ["left", "up", "down", "right"];

const LABELS: Record<Direction, string> = {
  left: "Önceki sütuna taşı",
  up: "Yukarı taşı",
  down: "Aşağı taşı",
  right: "Sonraki sütuna taşı",
};

const SYMBOLS: Record<Direction, string> = {
  left: "←",
  up: "↑",
  down: "↓",
  right: "→",
};

interface CardItemProps {
  card: Card;
  busy: boolean;
  canMove: (direction: Direction) => boolean;
  onMove: (direction: Direction) => void;
  onSaved: (card: Card) => void;
  onStale: () => void;
  onDelete: () => void;
}

export function CardItem({
  card,
  busy,
  canMove,
  onMove,
  onSaved,
  onStale,
  onDelete,
}: CardItemProps) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");

  if (mode === "edit") {
    return (
      <li className="card">
        <EditCardForm
          card={card}
          onSaved={onSaved}
          onStale={onStale}
          onClose={() => setMode("view")}
        />
      </li>
    );
  }

  return (
    <li className="card">
      <h3>{card.title}</h3>
      {card.description && <p>{card.description}</p>}
      <div className="moves">
        {DIRECTIONS.map((direction) => (
          <button
            key={direction}
            type="button"
            aria-label={`${card.title}: ${LABELS[direction]}`}
            title={LABELS[direction]}
            disabled={busy || !canMove(direction)}
            onClick={() => onMove(direction)}
          >
            {SYMBOLS[direction]}
          </button>
        ))}
      </div>
      {mode === "confirm" ? (
        <div className="card-actions" role="group" aria-label={`${card.title}: silme onayı`}>
          <span>Silinsin mi?</span>
          <button type="button" className="danger" disabled={busy} onClick={onDelete}>
            Evet, sil
          </button>
          <button type="button" onClick={() => setMode("view")}>
            Vazgeç
          </button>
        </div>
      ) : (
        <div className="card-actions">
          <button
            type="button"
            aria-label={`${card.title}: düzenle`}
            disabled={busy}
            onClick={() => setMode("edit")}
          >
            Düzenle
          </button>
          <button
            type="button"
            aria-label={`${card.title}: sil`}
            disabled={busy}
            onClick={() => setMode("confirm")}
          >
            Sil
          </button>
        </div>
      )}
    </li>
  );
}
