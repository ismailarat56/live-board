import { assertNever } from "./assert-never.ts";
import type { BoardEvent } from "./board-events.ts";
import type { Card } from "./card.ts";
import { moveCard } from "./move-card.ts";

export function applyBoardEvent(cards: readonly Card[], event: BoardEvent): Card[] {
  switch (event.type) {
    case "card_created":
      if (cards.some((card) => card.id === event.card.id)) {
        return [...cards];
      }

      return [...cards, event.card];
    case "card_moved":
      return (
        moveCard(cards, event.cardId, {
          status: event.toStatus,
          position: event.toPosition,
        }) ?? [...cards]
      );
    case "card_deleted":
      return cards.filter((card) => card.id !== event.cardId);
    default:
      return assertNever(event);
  }
}
