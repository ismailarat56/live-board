import {
  assertNever,
  CARD_STATUSES,
  type Card,
  type MoveCardInput,
} from "@live-board/shared";
import { cardsInColumn } from "./board-state.ts";

export type Direction = "left" | "right" | "up" | "down";

export function moveTarget(
  cards: readonly Card[],
  card: Card,
  direction: Direction
): MoveCardInput | null {
  const column = CARD_STATUSES.indexOf(card.status);

  switch (direction) {
    case "left":
    case "right": {
      const status = CARD_STATUSES[direction === "left" ? column - 1 : column + 1];

      if (status === undefined) {
        return null;
      }

      return { status, position: cardsInColumn(cards, status).length };
    }
    case "up":
      return card.position > 0
        ? { status: card.status, position: card.position - 1 }
        : null;
    case "down": {
      const last = cardsInColumn(cards, card.status).length - 1;

      return card.position < last
        ? { status: card.status, position: card.position + 1 }
        : null;
    }
    default:
      return assertNever(direction);
  }
}
