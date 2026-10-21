import type {
  Card,
  MoveCardInput,
  NewCardInput,
  UpdateCardInput,
} from "@live-board/shared";
import type { Board } from "../domain/board.ts";

export type UpdateResult =
  | { kind: "updated"; card: Card }
  | { kind: "not_found" }
  | { kind: "conflict"; currentVersion: number };

export type DeleteResult =
  | { kind: "deleted"; boardId: number }
  | { kind: "not_found" }
  | { kind: "conflict"; currentVersion: number };

export interface CardStore {
  findBoard(boardId: number): Promise<Board | null>;
  listCards(boardId: number): Promise<Card[]>;
  createCard(boardId: number, input: NewCardInput): Promise<Card>;
  move(cardId: number, target: MoveCardInput): Promise<Card[] | null>;
  updateCard(
    cardId: number,
    input: UpdateCardInput,
    expectedVersion: number
  ): Promise<UpdateResult>;
  deleteCard(cardId: number, expectedVersion: number): Promise<DeleteResult>;
}
