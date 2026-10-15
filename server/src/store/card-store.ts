import type { Card, MoveCardInput, NewCardInput } from "@live-board/shared";
import type { Board } from "../domain/board.ts";

export interface CardStore {
  findBoard(boardId: number): Promise<Board | null>;
  listCards(boardId: number): Promise<Card[]>;
  createCard(boardId: number, input: NewCardInput): Promise<Card>;
  move(cardId: number, target: MoveCardInput): Promise<Card[] | null>;
}
