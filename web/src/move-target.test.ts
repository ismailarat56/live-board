import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Card, CardStatus } from "@live-board/shared";
import { moveTarget } from "./move-target.ts";

function makeCard(id: number, status: CardStatus, position: number): Card {
  return {
    id,
    boardId: 1,
    title: `Kart ${id}`,
    description: null,
    status,
    position,
    createdAt: "2026-10-17T08:00:00.000Z",
  };
}

const cards = [makeCard(1, "todo", 0), makeCard(2, "todo", 1), makeCard(3, "done", 0)];
const [first, second, last] = cards as [Card, Card, Card];

describe("moveTarget", () => {
  it("ilk sütunda sola, son sütunda sağa gidilemez", () => {
    assert.equal(moveTarget(cards, first, "left"), null);
    assert.equal(moveTarget(cards, last, "right"), null);
  });

  it("sağa taşıma kartı sonraki sütunun sonuna koyar", () => {
    assert.deepEqual(moveTarget(cards, second, "right"), { status: "doing", position: 0 });
  });

  it("sütunun başında yukarı, sonunda aşağı gidilemez", () => {
    assert.equal(moveTarget(cards, first, "up"), null);
    assert.equal(moveTarget(cards, second, "down"), null);
    assert.deepEqual(moveTarget(cards, first, "down"), { status: "todo", position: 1 });
  });
});
