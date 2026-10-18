import type {
  Card,
  MoveCardInput,
  NewCardInput,
  UpdateCardInput,
} from "@live-board/shared";
import type { Board } from "../domain/board.ts";

export interface CardStore {
  findBoard(boardId: number): Promise<Board | null>;
  listCards(boardId: number): Promise<Card[]>;
  createCard(boardId: number, input: NewCardInput): Promise<Card>;
  move(cardId: number, target: MoveCardInput): Promise<Card[] | null>;
  updateCard(cardId: number, input: UpdateCardInput): Promise<Card | null>;
  deleteCard(cardId: number): Promise<{ boardId: number } | null>;
}
