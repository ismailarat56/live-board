import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Card, CardStatus } from "@live-board/shared";
import { boardReducer, cardsInColumn, initialBoardState, type BoardState } from "./board-state.ts";

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

const cards = [makeCard(1, "todo", 0), makeCard(2, "todo", 1), makeCard(3, "doing", 0)];
const ready: BoardState = { status: "ready", cards };

describe("boardReducer", () => {
  it("yükleme bitince pano hazır olur", () => {
    assert.deepEqual(boardReducer(initialBoardState, { type: "loaded", cards }), ready);
  });

  it("pano yüklenmeden gelen olayı yok sayar", () => {
    const next = boardReducer(initialBoardState, {
      type: "eventReceived",
      event: { type: "card_deleted", cardId: 1 },
    });

    assert.equal(next, initialBoardState);
  });

  it("aynı kart iki kez eklenirse çoğalmaz", () => {
    const added = makeCard(4, "todo", 2);
    const once = boardReducer(ready, { type: "cardCreated", card: added });
    const twice = boardReducer(once, { type: "cardCreated", card: added });

    assert.ok(twice.status === "ready");
    assert.equal(twice.cards.length, 4);
  });

  it("cardUpdated yalnız başlığı ve açıklamayı değiştirir", () => {
    const next = boardReducer(ready, {
      type: "cardUpdated",
      card: { ...makeCard(2, "done", 5), title: "Yeni", description: "not" },
    });

    assert.ok(next.status === "ready");
    assert.deepEqual(
      next.cards.find((card) => card.id === 2),
      { ...makeCard(2, "todo", 1), title: "Yeni", description: "not" }
    );
  });

  it("cardDeleted kartı çıkarır ve sütunu yeniden numaralar", () => {
    const next = boardReducer(ready, { type: "cardDeleted", cardId: 1 });

    assert.ok(next.status === "ready");
    assert.deepEqual(
      cardsInColumn(next.cards, "todo").map((card) => [card.id, card.position]),
      [[2, 0]]
    );
  });
});
