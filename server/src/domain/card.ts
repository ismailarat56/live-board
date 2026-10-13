import { assertNever } from "./assert-never.ts";

export type CardStatus = "todo" | "doing" | "done";

export const CARD_STATUSES: readonly CardStatus[] = ["todo", "doing", "done"];

export interface Card {
  id: number;
  boardId: number;
  title: string;
  description: string | null;
  status: CardStatus;
  position: number;
  createdAt: string;
}

export type NewCardInput = Omit<
  Card,
  "id" | "boardId" | "position" | "createdAt"
>;

export type MoveCardInput = Pick<Card, "status" | "position">;

export function isCardStatus(value: unknown): value is CardStatus {
  return CARD_STATUSES.some((status) => status === value);
}

export function statusLabel(status: CardStatus): string {
  switch (status) {
    case "todo":
      return "Yapılacak";
    case "doing":
      return "Yapılıyor";
    case "done":
      return "Bitti";
    default:
      return assertNever(status);
  }
}
