import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Card, CardStatus } from "@live-board/shared";
import { moveCard } from "./move-card.ts";

function makeCard(id: number, status: CardStatus, position: number): Card {
  return {
    id,
    boardId: 1,
    title: `Kart ${id}`,
    description: null,
    status,
    position,
    createdAt: "2026-10-09T00:00:00.000Z",
  };
}

function column(cards: readonly Card[], status: CardStatus): number[] {
  return cards
    .filter((card) => card.status === status)
    .toSorted((a, b) => a.position - b.position)
    .map((card) => card.id);
}

function positions(cards: readonly Card[], status: CardStatus): number[] {
  return cards
    .filter((card) => card.status === status)
    .map((card) => card.position)
    .toSorted((a, b) => a - b);
}

const board: Card[] = [
  makeCard(1, "todo", 0),
  makeCard(2, "todo", 1),
  makeCard(3, "todo", 2),
  makeCard(4, "doing", 0),
];

describe("moveCard", () => {
  it("aynı sütunda kartın yerini değiştirir", () => {
    const result = moveCard(board, 3, { status: "todo", position: 0 });

    assert.ok(result);
    assert.deepEqual(column(result, "todo"), [3, 1, 2]);
  });

  it("kartı başka sütuna taşır", () => {
    const result = moveCard(board, 2, { status: "doing", position: 1 });

    assert.ok(result);
    assert.deepEqual(column(result, "todo"), [1, 3]);
    assert.deepEqual(column(result, "doing"), [4, 2]);
  });

  it("iki sütunda da pozisyonları 0'dan boşluksuz numaralar", () => {
    const result = moveCard(board, 1, { status: "doing", position: 0 });

    assert.ok(result);
    assert.deepEqual(positions(result, "todo"), [0, 1]);
    assert.deepEqual(positions(result, "doing"), [0, 1]);
  });

  it("çok büyük pozisyonu sütunun sonuna, negatifi başına çeker", () => {
    const toEnd = moveCard(board, 1, { status: "doing", position: 99 });
    const toStart = moveCard(board, 4, { status: "todo", position: -1 });

    assert.ok(toEnd);
    assert.ok(toStart);
    assert.deepEqual(column(toEnd, "doing"), [4, 1]);
    assert.deepEqual(column(toStart, "todo"), [4, 1, 2, 3]);
  });

  it("verilen diziyi değiştirmez", () => {
    const before = structuredClone(board);

    moveCard(board, 1, { status: "done", position: 0 });

    assert.deepEqual(board, before);
  });

  it("olmayan kart için null döner", () => {
    assert.equal(moveCard(board, 99, { status: "done", position: 0 }), null);
  });
});
