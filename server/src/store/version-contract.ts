import assert from "node:assert/strict";
import { test } from "node:test";
import type { Card } from "@live-board/shared";
import type { CardStore } from "./card-store.ts";

export interface ContractContext {
  store: CardStore;
  boardId: number;
}

export function versionContract(setup: () => ContractContext): void {
  function newCard(store: CardStore, boardId: number, title: string): Promise<Card> {
    return store.createCard(boardId, { title, description: null, status: "todo" });
  }

  async function read(store: CardStore, card: Card): Promise<Card | undefined> {
    const cards = await store.listCards(card.boardId);

    return cards.find((item) => item.id === card.id);
  }

  test("sürüm: yeni kart 1. sürümle başlar", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Sürüm bir");

    assert.equal(card.version, 1);
  });

  test("sürüm: doğru sürümle düzenleme kartı günceller ve sürümü bir artırır", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Eski başlık");

    const result = await store.updateCard(card.id, { title: "Yeni başlık" }, 1);

    assert.ok(result.kind === "updated");
    assert.equal(result.card.title, "Yeni başlık");
    assert.equal(result.card.version, 2);
    assert.equal((await read(store, card))?.version, 2);
  });

  test("sürüm: eski sürümle düzenleme conflict döner ve kartı değiştirmez", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Ortak kart");
    await store.updateCard(card.id, { title: "A'nın başlığı" }, 1);

    const result = await store.updateCard(card.id, { title: "B'nin başlığı" }, 1);

    assert.deepEqual(result, { kind: "conflict", currentVersion: 2 });

    const saved = await read(store, card);

    assert.equal(saved?.title, "A'nın başlığı");
    assert.equal(saved?.version, 2);
  });

  test("sürüm: art arda düzenlemeler sürümü her seferinde bir artırır", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Taslak");

    const second = await store.updateCard(card.id, { title: "Taslak 2" }, 1);
    const third = await store.updateCard(card.id, { title: "Taslak 3" }, 2);
    const ahead = await store.updateCard(card.id, { title: "Taslak 5" }, 5);

    assert.ok(second.kind === "updated" && third.kind === "updated");
    assert.deepEqual([second.card.version, third.card.version], [2, 3]);
    assert.deepEqual(ahead, { kind: "conflict", currentVersion: 3 });
  });

  test("sürüm: farklı alan güncel sürümle gönderilirse iki değişiklik de kalır", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Başlık");
    await store.updateCard(card.id, { title: "A'nın başlığı" }, 1);

    const result = await store.updateCard(card.id, { description: "B'nin notu" }, 2);

    assert.ok(result.kind === "updated");
    assert.equal(result.card.title, "A'nın başlığı");
    assert.equal(result.card.description, "B'nin notu");
    assert.equal(result.card.version, 3);
  });

  test("sürüm: olmayan kart için düzenleme not_found döner", async () => {
    const { store } = setup();

    assert.deepEqual(await store.updateCard(999_999, { title: "Yok" }, 1), { kind: "not_found" });
    assert.deepEqual(await store.updateCard(999_999, { title: "Yok" }, 7), { kind: "not_found" });
  });

  test("sürüm: taşıma sürümü değiştirmez", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Taşınan");
    const neighbour = await newCard(store, boardId, "Komşu");

    await store.move(card.id, { status: "doing", position: 0 });

    assert.equal((await read(store, card))?.version, 1);
    assert.equal((await read(store, neighbour))?.version, 1);
  });

  test("sürüm: doğru sürümle silme kartı kaldırır", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Silinecek");

    const result = await store.deleteCard(card.id, 1);

    assert.deepEqual(result, { kind: "deleted", boardId: card.boardId });
    assert.equal(await read(store, card), undefined);
  });

  test("sürüm: eski sürümle silme conflict döner ve kart yerinde kalır", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Kalacak");
    await store.updateCard(card.id, { title: "Kalacak (yeni)" }, 1);

    const result = await store.deleteCard(card.id, 1);

    assert.deepEqual(result, { kind: "conflict", currentVersion: 2 });
    assert.equal((await read(store, card))?.title, "Kalacak (yeni)");
  });

  test("sürüm: olmayan ya da silinmiş kart için silme not_found döner", async () => {
    const { store, boardId } = setup();
    const card = await newCard(store, boardId, "Bir kez silinir");
    await store.deleteCard(card.id, 1);

    assert.deepEqual(await store.deleteCard(card.id, 1), { kind: "not_found" });
    assert.deepEqual(await store.deleteCard(999_999, 3), { kind: "not_found" });
  });
}
