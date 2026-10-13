import type { Board } from "../domain/board.ts";
import {
  CARD_STATUSES,
  type Card,
  type MoveCardInput,
  type NewCardInput,
} from "../domain/card.ts";
import { moveCard } from "../domain/move-card.ts";

export interface CardStore {
  findBoard(boardId: number): Board | null;
  listCards(boardId: number): Card[];
  createCard(boardId: number, input: NewCardInput): Card;
  move(cardId: number, target: MoveCardInput): Card[] | null;
}

export function createMemoryStore(): CardStore {
  const boards: Board[] = [{ id: 1, name: "Live Board" }];
  let cards: Card[] = [];
  let nextCardId = 1;

  function columnIndex(card: Card): number {
    return CARD_STATUSES.indexOf(card.status);
  }

  function listCards(boardId: number): Card[] {
    return cards
      .filter((card) => card.boardId === boardId)
      .toSorted(
        (a, b) => columnIndex(a) - columnIndex(b) || a.position - b.position
      );
  }

  return {
    findBoard(boardId) {
      return boards.find((board) => board.id === boardId) ?? null;
    },

    listCards,

    createCard(boardId, input) {
      const position = cards.filter(
        (card) => card.boardId === boardId && card.status === input.status
      ).length;

      const card: Card = {
        ...input,
        id: nextCardId,
        boardId,
        position,
        createdAt: new Date().toISOString(),
      };

      nextCardId += 1;
      cards = [...cards, card];

      return card;
    },

    move(cardId, target) {
      const boardId = cards.find((card) => card.id === cardId)?.boardId;
      const next = moveCard(cards, cardId, target);

      if (next === null || boardId === undefined) {
        return null;
      }

      cards = next;

      return listCards(boardId);
    },
  };
}
