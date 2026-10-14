import type { Board } from "../domain/board.ts";
import type { Card, MoveCardInput, NewCardInput } from "../domain/card.ts";

export interface CardStore {
  findBoard(boardId: number): Promise<Board | null>;
  listCards(boardId: number): Promise<Card[]>;
  createCard(boardId: number, input: NewCardInput): Promise<Card>;
  move(cardId: number, target: MoveCardInput): Promise<Card[] | null>;
}
