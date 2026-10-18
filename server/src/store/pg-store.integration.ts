import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readDatabaseUrl } from "../config.ts";
import { createPool } from "../db/pool.ts";
import { createPgStore } from "./pg-store.ts";

const pool = createPool(readDatabaseUrl());
const store = createPgStore(pool);
let boardId: number;

before(async () => {
  const result = await pool.query<{ id: number }>(
    "INSERT INTO boards (name) VALUES ('Test panosu') RETURNING id"
  );
  const id = result.rows[0]?.id;

  assert.ok(id !== undefined);
  boardId = id;
});

after(async () => {
  await pool.query("DELETE FROM boards WHERE id = $1", [boardId]);
  await pool.end();
});

async function countCards(): Promise<number | undefined> {
  const result = await pool.query<{ total: number }>(
    "SELECT count(*)::int AS total FROM cards WHERE board_id = $1",
    [boardId]
  );

  return result.rows[0]?.total;
}

test("panoyu okur; olmayan pano için null döner", async () => {
  assert.deepEqual(await store.findBoard(boardId), { id: boardId, name: "Test panosu" });
  assert.equal(await store.findBoard(999_999), null);
});

test("kartı veritabanına yazar ve sütunun sonuna koyar", async () => {
  const first = await store.createCard(boardId, {
    title: "Bir",
    description: null,
    status: "todo",
  });
  const second = await store.createCard(boardId, {
    title: "İki",
    description: "ikinci kart",
    status: "todo",
  });

  assert.equal(first.position, 0);
  assert.equal(second.position, 1);
  assert.equal(second.boardId, boardId);
  assert.equal(typeof second.createdAt, "string");
  assert.equal(await countCards(), 2);
});

test("taşıma kalıcıdır: yeni bir depo aynı sırayı okur", async () => {
  const [first] = await store.listCards(boardId);

  assert.ok(first !== undefined);
  await store.move(first.id, { status: "done", position: 0 });

  const fresh = createPgStore(pool);
  const cards = await fresh.listCards(boardId);

  assert.deepEqual(
    cards.map((card) => [card.title, card.status, card.position]),
    [
      ["İki", "todo", 0],
      ["Bir", "done", 0],
    ]
  );
});

test("olmayan kart için null döner ve hiçbir satırı değiştirmez", async () => {
  const result = await store.move(999_999, { status: "done", position: 0 });

  assert.equal(result, null);
  assert.equal(await countCards(), 2);
});

test("düzenleme gönderilmeyen alana dokunmaz, null açıklamayı temizler", async () => {
  const card = await store.createCard(boardId, {
    title: "Üç",
    description: "ilk not",
    status: "doing",
  });

  const renamed = await store.updateCard(card.id, { title: "Üç (yeni)" });
  const cleared = await store.updateCard(card.id, { description: null });

  assert.equal(renamed?.description, "ilk not");
  assert.equal(cleared?.title, "Üç (yeni)");
  assert.equal(cleared?.description, null);
  assert.equal(cleared?.status, "doing");
  assert.equal(await store.updateCard(999_999, { title: "Yok" }), null);
});

test("silme kartı kaldırır, arkasındakileri kaydırır; yeni kart sona gelir", async () => {
  const [first] = (await store.listCards(boardId)).filter((card) => card.status === "todo");
  assert.ok(first !== undefined);

  await store.createCard(boardId, { title: "Dört", description: null, status: "todo" });
  await store.createCard(boardId, { title: "Beş", description: null, status: "todo" });

  assert.deepEqual(await store.deleteCard(first.id), { boardId });
  assert.equal(await store.deleteCard(first.id), null);

  const added = await store.createCard(boardId, {
    title: "Altı",
    description: null,
    status: "todo",
  });
  const todo = (await createPgStore(pool).listCards(boardId)).filter(
    (card) => card.status === "todo"
  );

  assert.equal(added.position, 2);
  assert.deepEqual(
    todo.map((card) => [card.title, card.position]),
    [
      ["Dört", 0],
      ["Beş", 1],
      ["Altı", 2],
    ]
  );
});

test("veritabanındaki CHECK kuralı TypeScript'in geçirdiği değeri durdurur", async () => {
  const tooLong = "x".repeat(201);

  await assert.rejects(
    store.createCard(boardId, { title: tooLong, description: null, status: "todo" }),
    { code: "23514" }
  );
});
