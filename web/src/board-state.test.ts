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
    version: 1,
    createdAt: "2026-10-17T08:00:00.000Z",
  };
}

const cards = [makeCard(1, "todo", 0), makeCard(2, "todo", 1), makeCard(3, "doing", 0)];
const ready: BoardState = { status: "ready", cards };

describe("boardReducer", () => {
  it("yükleme bitince pano hazır olur", () => {
    assert.deepEqual(boardReducer(initialBoardState, { type: "loaded", cards }), ready);
  });

  it("ilk yükleme hatası yeniden denenebilir hata durumuna geçer", () => {
    assert.deepEqual(
      boardReducer(initialBoardState, { type: "failed", message: "Bağlantı yok" }),
      { status: "error", message: "Bağlantı yok" }
    );
  });

  it("yenileme hatası açık düzenleme formunun bağlı olduğu panoyu korur", () => {
    const failed = boardReducer(ready, { type: "failed", message: "Bağlantı yok" });

    assert.ok(failed.status === "ready");
    assert.equal(failed.cards, cards);
    assert.equal(failed.refreshError, "Bağlantı yok");
    assert.equal(boardReducer(failed, { type: "retried" }).status, "ready");
    assert.deepEqual(boardReducer(failed, { type: "loaded", cards }), ready);
  });

  it("canlı olay yenileme hatasını gizlemeden panoyu günceller", () => {
    const failed = boardReducer(ready, { type: "failed", message: "Bağlantı yok" });
    const updated = boardReducer(failed, {
      type: "eventReceived",
      event: { type: "card_updated", cardId: 2, title: "Yeni", description: null, version: 2 },
    });

    assert.ok(updated.status === "ready");
    assert.equal(updated.refreshError, "Bağlantı yok");
    assert.equal(updated.cards.find((card) => card.id === 2)?.title, "Yeni");
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

  it("cardUpdated yalnız başlığı, açıklamayı ve sürümü değiştirir", () => {
    const next = boardReducer(ready, {
      type: "cardUpdated",
      card: { ...makeCard(2, "done", 5), title: "Yeni", description: "not", version: 2 },
    });

    assert.ok(next.status === "ready");
    assert.deepEqual(
      next.cards.find((card) => card.id === 2),
      { ...makeCard(2, "todo", 1), title: "Yeni", description: "not", version: 2 }
    );
  });

  it("geç gelen eski HTTP yanıtı olayla gelen yeni sürümü ezmez", () => {
    const fromOther = boardReducer(ready, {
      type: "eventReceived",
      event: { type: "card_updated", cardId: 2, title: "B'nin", description: null, version: 3 },
    });
    const lateResponse = boardReducer(fromOther, {
      type: "cardUpdated",
      card: { ...makeCard(2, "todo", 1), title: "A'nın", version: 2 },
    });

    assert.ok(lateResponse.status === "ready");
    assert.equal(lateResponse.cards.find((card) => card.id === 2)?.title, "B'nin");
    assert.equal(lateResponse.cards.find((card) => card.id === 2)?.version, 3);
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
