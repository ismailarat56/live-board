import { statusLabel, type Card, type CardStatus } from "@live-board/shared";
import { CardItem } from "./CardItem.tsx";
import type { Direction } from "./move-target.ts";

interface ColumnProps {
  status: CardStatus;
  cards: Card[];
  busy: boolean;
  canMove: (card: Card, direction: Direction) => boolean;
  onMove: (card: Card, direction: Direction) => void;
  onSaved: (card: Card) => void;
  onStale: () => void;
  onDelete: (card: Card) => void;
}

export function Column({
  status,
  cards,
  busy,
  canMove,
  onMove,
  onSaved,
  onStale,
  onDelete,
}: ColumnProps) {
  return (
    <section className="column" aria-labelledby={`column-${status}`}>
      <h2 id={`column-${status}`}>
        {statusLabel(status)} <span className="count">{cards.length}</span>
      </h2>
      {cards.length === 0 ? (
        <p className="empty">Kart yok</p>
      ) : (
        <ol className="cards">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              busy={busy}
              canMove={(direction) => canMove(card, direction)}
              onMove={(direction) => onMove(card, direction)}
              onSaved={onSaved}
              onStale={onStale}
              onDelete={() => onDelete(card)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
