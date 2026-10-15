import {
  assertNever,
  statusLabel,
  type Card,
  type CardStatus,
} from "@live-board/shared";

export type BoardEvent =
  | { type: "card_created"; card: Card }
  | {
      type: "card_moved";
      cardId: number;
      toStatus: CardStatus;
      toPosition: number;
    }
  | { type: "card_deleted"; cardId: number };

export function describeEvent(event: BoardEvent): string {
  switch (event.type) {
    case "card_created":
      return `Yeni kart: ${event.card.title}`;
    case "card_moved":
      return `Kart ${event.cardId} -> ${statusLabel(event.toStatus)}`;
    case "card_deleted":
      return `Kart ${event.cardId} silindi`;
    default:
      return assertNever(event);
  }
}
