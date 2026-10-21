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
  | { status: "ready"; cards: Card[]; refreshError?: string };

export type BoardAction =
  | { type: "retried" }
  | { type: "loaded"; cards: Card[] }
  | { type: "failed"; message: string }
  | { type: "cardCreated"; card: Card }
  | { type: "cardsMoved"; cards: Card[] }
  | { type: "cardUpdated"; card: Card }
  | { type: "cardDeleted"; cardId: number }
  | { type: "eventReceived"; event: BoardEvent };

export const initialBoardState: BoardState = { status: "loading" };

function applyWhenReady(state: BoardState, event: BoardEvent): BoardState {
  if (state.status !== "ready") {
    return state;
  }

  return { ...state, cards: applyBoardEvent(state.cards, event) };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "retried":
      return state.status === "ready" ? state : { status: "loading" };
    case "loaded":
      return { status: "ready", cards: action.cards };
    case "cardsMoved":
      return state.status === "ready"
        ? { ...state, cards: action.cards }
        : { status: "ready", cards: action.cards };
    case "failed":
      return state.status === "ready"
        ? { ...state, refreshError: action.message }
        : { status: "error", message: action.message };
    case "cardCreated":
      return applyWhenReady(state, { type: "card_created", card: action.card });
    case "cardUpdated":
      return applyWhenReady(state, {
        type: "card_updated",
        cardId: action.card.id,
        title: action.card.title,
        description: action.card.description,
        version: action.card.version,
      });
    case "cardDeleted":
      return applyWhenReady(state, { type: "card_deleted", cardId: action.cardId });
    case "eventReceived":
      return applyWhenReady(state, action.event);
    default:
      return assertNever(action);
  }
}

export function cardsInColumn(cards: readonly Card[], status: CardStatus): Card[] {
  return cards
    .filter((card) => card.status === status)
    .toSorted((a, b) => a.position - b.position);
}
