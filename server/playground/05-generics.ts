import type { Card, NewCardInput } from "../src/domain/card.ts";
import { fail, ok, type ApiResponse } from "../src/http/api-response.ts";

function firstOrNull<T>(items: readonly T[]): T | null {
  return items[0] ?? null;
}

function findById<T extends { id: number }>(
  items: readonly T[],
  id: number
): T | null {
  return items.find((item) => item.id === id) ?? null;
}

const cards: Card[] = [
  {
    id: 1,
    boardId: 1,
    title: "Tasarımı çiz",
    description: null,
    status: "todo",
    position: 0,
    createdAt: new Date().toISOString(),
  },
];

const firstTitle = firstOrNull(["a", "b"]);
const found = findById(cards, 1);

function toResponse(list: Card[]): ApiResponse<Card[]> {
  return list.length > 0 ? ok(list) : fail("EMPTY", "Kart yok.");
}

const response = toResponse(cards);

if (response.success) {
  console.log(response.data.length);
} else {
  console.log(response.error.code);
}

const input: NewCardInput = {
  title: "Testleri yaz",
  description: null,
  status: "todo",
};

const draft: Partial<Card> = { title: "Taslak" };

console.log(firstTitle, found?.title, input, draft);
