import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyBoardEvent,
  moveCard,
  removeCard,
  type BoardEvent,
  type Card,
  type CardStatus,
} from "@live-board/shared";

function makeCard(id: number, status: CardStatus, position: number): Card {
  return {
    id,
    boardId: 1,
    title: `Kart ${id}`,
    description: null,
    status,
    position,
    createdAt: "2026-10-16T08:00:00.000Z",
  };
}

const start: Card[] = [
  makeCard(1, "todo", 0),
  makeCard(2, "todo", 1),
  makeCard(3, "doing", 0),
];

describe("applyBoardEvent", () => {
  it("card_created kartı listeye ekler", () => {
    const created = makeCard(4, "todo", 2);
    const next = applyBoardEvent(start, { type: "card_created", card: created });

    assert.equal(next.length, 4);
    assert.deepEqual(next.at(-1), created);
  });

  it("aynı card_created ikinci kez gelirse kart çoğalmaz", () => {
    const event: BoardEvent = { type: "card_created", card: makeCard(4, "todo", 2) };
    const once = applyBoardEvent(start, event);
    const twice = applyBoardEvent(once, event);

    assert.deepEqual(twice, once);
  });

  it("card_moved sunucudaki moveCard ile aynı sonucu verir", () => {
    const serverResult = moveCard(start, 1, { status: "doing", position: 1 });
    assert.ok(serverResult !== null);

    const event: BoardEvent = {
      type: "card_moved",
      cardId: 1,
      toStatus: "doing",
      toPosition: 1,
    };

    assert.deepEqual(applyBoardEvent(start, event), serverResult);
  });

  it("aynı card_moved ikinci kez gelirse durum değişmez", () => {
    const event: BoardEvent = {
      type: "card_moved",
      cardId: 1,
      toStatus: "doing",
      toPosition: 1,
    };
    const once = applyBoardEvent(start, event);
    const twice = applyBoardEvent(once, event);

    assert.deepEqual(twice, once);
  });

  it("olmayan karta ait card_moved listeyi değiştirmez", () => {
    const event: BoardEvent = {
      type: "card_moved",
      cardId: 99,
      toStatus: "done",
      toPosition: 0,
    };

    assert.deepEqual(applyBoardEvent(start, event), start);
  });

  it("card_deleted kartı çıkarır, olmayan kart için hata vermez", () => {
    const removed = applyBoardEvent(start, { type: "card_deleted", cardId: 2 });

    assert.deepEqual(
      removed.map((card) => card.id).toSorted((a, b) => a - b),
      [1, 3]
    );
    assert.deepEqual(applyBoardEvent(start, { type: "card_deleted", cardId: 99 }), start);
  });

  it("card_deleted sunucudaki removeCard ile aynı sonucu verir", () => {
    const serverResult = removeCard(start, 1);
    assert.ok(serverResult !== null);

    const event: BoardEvent = { type: "card_deleted", cardId: 1 };

    assert.deepEqual(applyBoardEvent(start, event), serverResult);
    assert.deepEqual(applyBoardEvent(serverResult, event), serverResult);
    assert.deepEqual(serverResult.find((card) => card.id === 2), { ...start[1], position: 0 });
  });

  it("card_updated yalnız başlığı ve açıklamayı değiştirir", () => {
    const before = structuredClone(start);
    const event: BoardEvent = {
      type: "card_updated", cardId: 2, title: "Yeni başlık", description: "Açıklama",
    };
    const once = applyBoardEvent(start, event);

    assert.deepEqual(once, [start[0], { ...start[1], title: "Yeni başlık", description: "Açıklama" }, start[2]]);
    assert.deepEqual(applyBoardEvent(once, event), once);
    assert.deepEqual(applyBoardEvent(once, { ...event, description: null }).find((card) => card.id === 2)?.description, null);
    assert.deepEqual(applyBoardEvent(start, { ...event, cardId: 99 }), start);
    assert.deepEqual(start, before);
  });

  it("geç gelen card_updated kartı eski sütununa geri götürmez", () => {
    const moved = applyBoardEvent(start, {
      type: "card_moved",
      cardId: 2,
      toStatus: "done",
      toPosition: 0,
    });
    const next = applyBoardEvent(moved, {
      type: "card_updated",
      cardId: 2,
      title: "Yeni başlık",
      description: null,
    });
    const card = next.find((item) => item.id === 2);

    assert.equal(card?.status, "done");
    assert.equal(card?.position, 0);
    assert.equal(card?.title, "Yeni başlık");
  });

  it("girdi diziyi değiştirmez", () => {
    const before = JSON.stringify(start);

    applyBoardEvent(start, { type: "card_deleted", cardId: 1 });
    applyBoardEvent(start, {
      type: "card_moved",
      cardId: 1,
      toStatus: "done",
      toPosition: 0,
    });

    assert.equal(JSON.stringify(start), before);
  });
});
