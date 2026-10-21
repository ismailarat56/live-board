import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BoardEventSchema,
  ClientMessageSchema,
  describeEvent,
  ServerMessageSchema,
} from "@live-board/shared";

const card = {
  id: 7,
  boardId: 1,
  title: "README yaz",
  description: null,
  status: "todo",
  position: 0,
  version: 1,
  createdAt: "2026-10-16T08:00:00.000Z",
};

describe("BoardEventSchema", () => {
  it("dört olay türünü de kabul eder", () => {
    assert.ok(BoardEventSchema.safeParse({ type: "card_created", card }).success);
    assert.ok(
      BoardEventSchema.safeParse({
        type: "card_moved",
        cardId: 7,
        toStatus: "doing",
        toPosition: 2,
      }).success
    );
    assert.ok(BoardEventSchema.safeParse({ type: "card_deleted", cardId: 7 }).success);
    assert.ok(BoardEventSchema.safeParse({
      type: "card_updated", cardId: 7, title: "Yeni başlık", description: null, version: 2,
    }).success);
  });

  it("card_updated açıklamayı atlayamaz: null ya da metin olmalı", () => {
    assert.equal(
      BoardEventSchema.safeParse({ type: "card_updated", cardId: 7, title: "Yeni", version: 2 })
        .success,
      false
    );
  });

  it("card_updated sürümsüz olamaz", () => {
    assert.equal(
      BoardEventSchema.safeParse({
        type: "card_updated",
        cardId: 7,
        title: "Yeni",
        description: null,
      }).success,
      false
    );
  });

  it("bilinmeyen türü reddeder", () => {
    assert.equal(BoardEventSchema.safeParse({ type: "card_renamed", cardId: 7 }).success, false);
  });

  it("eksik ya da yanlış alanı reddeder", () => {
    const bad = [
      { type: "card_moved", cardId: 7, toStatus: "doing" },
      { type: "card_moved", cardId: 7, toStatus: "blocked", toPosition: 0 },
      { type: "card_moved", cardId: 7, toStatus: "doing", toPosition: -1 },
      { type: "card_moved", cardId: "7", toStatus: "doing", toPosition: 0 },
      { type: "card_created", card: { ...card, status: "waiting" } },
      { type: "card_updated", cardId: 7, title: 123, description: null, version: 2 },
    ];

    for (const value of bad) {
      assert.equal(BoardEventSchema.safeParse(value).success, false, JSON.stringify(value));
    }
  });

  it("describeEvent olayı Türkçe tarif eder", () => {
    assert.equal(
      describeEvent({ type: "card_moved", cardId: 7, toStatus: "done", toPosition: 0 }),
      "Kart 7 -> Bitti"
    );
    assert.equal(
      describeEvent({ type: "card_updated", cardId: 7, title: "Yeni başlık", description: null, version: 2 }),
      "Kart 7 düzenlendi: Yeni başlık"
    );
  });
});

describe("mesaj şemaları", () => {
  it("istemci yalnız ping gönderebilir", () => {
    assert.ok(ClientMessageSchema.safeParse({ type: "ping" }).success);
    assert.equal(ClientMessageSchema.safeParse({ type: "move", cardId: 7 }).success, false);
    assert.equal(ClientMessageSchema.safeParse({}).success, false);
  });

  it("sunucu mesajları olayı içinde taşır", () => {
    const message = {
      type: "event",
      event: { type: "card_deleted", cardId: 7 },
    };

    assert.ok(ServerMessageSchema.safeParse(message).success);
    assert.equal(
      ServerMessageSchema.safeParse({ type: "event", event: { type: "card_deleted" } }).success,
      false
    );
  });
});
