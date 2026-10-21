import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveCard, removeCard, type Card, type CardStatus } from "@live-board/shared";
import { diffCards } from "./card-diff.ts";

function makeCard(id: number, status: CardStatus, position: number): Card {
  return {
    id,
    boardId: 1,
    title: `Kart ${id}`,
    description: null,
    status,
    position,
    version: 1,
    createdAt: "2026-10-17T08:00:00.000Z",
  };
}

const board: Card[] = [
  makeCard(1, "todo", 0),
  makeCard(2, "todo", 1),
  makeCard(3, "todo", 2),
  makeCard(4, "todo", 3),
  makeCard(5, "todo", 4),
  makeCard(6, "doing", 0),
];

function ids(cards: readonly Card[]): number[] {
  return cards.map((card) => card.id).toSorted((a, b) => a - b);
}

describe("diffCards", () => {
  it("komşu iki kartın yer değiştirmesinde yalnız o ikisi değişir", () => {
    const after = moveCard(board, 4, { status: "todo", position: 4 });
    assert.ok(after);

    const changes = diffCards(board, after);

    assert.deepEqual(ids(changes.changed), [4, 5]);
    assert.deepEqual(changes.removed, []);
  });

  it("başka sütuna taşımada yalnız kayan kartlar değişir", () => {
    const after = moveCard(board, 2, { status: "doing", position: 1 });
    assert.ok(after);

    assert.deepEqual(ids(diffCards(board, after).changed), [2, 3, 4, 5]);
  });

  it("silmede silinen kart removed'a, arkasındakiler changed'a girer", () => {
    const after = removeCard(board, 3);
    assert.ok(after);

    const changes = diffCards(board, after);

    assert.deepEqual(changes.removed, [3]);
    assert.deepEqual(ids(changes.changed), [4, 5]);
  });

  it("sütunun son kartını silmek başka hiçbir kartı değiştirmez", () => {
    const after = removeCard(board, 5);
    assert.ok(after);

    assert.deepEqual(diffCards(board, after), { removed: [5], changed: [] });
  });
});
