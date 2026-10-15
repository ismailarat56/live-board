import type { Card } from "@live-board/shared";
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
}

export function CardItem({ card, busy, canMove, onMove }: CardItemProps) {
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
    </li>
  );
}
