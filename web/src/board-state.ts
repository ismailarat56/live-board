import {
  applyBoardEvent,
  assertNever,
  type BoardEvent,
  type Card,
  type CardStatus,
} from "@live-board/shared";

export type BoardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; cards: Card[] };

export type BoardAction =
  | { type: "retried" }
  | { type: "loaded"; cards: Card[] }
  | { type: "failed"; message: string }
  | { type: "cardCreated"; card: Card }
  | { type: "cardsMoved"; cards: Card[] }
  | { type: "eventReceived"; event: BoardEvent };

export const initialBoardState: BoardState = { status: "loading" };

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "retried":
      return { status: "loading" };
    case "loaded":
    case "cardsMoved":
      return { status: "ready", cards: action.cards };
    case "failed":
      return { status: "error", message: action.message };
    case "cardCreated":
      if (state.status !== "ready") {
        return state;
      }

      return {
        status: "ready",
        cards: applyBoardEvent(state.cards, { type: "card_created", card: action.card }),
      };
    case "eventReceived":
      if (state.status !== "ready") {
        return state;
      }

      return { status: "ready", cards: applyBoardEvent(state.cards, action.event) };
    default:
      return assertNever(action);
  }
}

export function cardsInColumn(cards: readonly Card[], status: CardStatus): Card[] {
  return cards
    .filter((card) => card.status === status)
    .toSorted((a, b) => a.position - b.position);
}
