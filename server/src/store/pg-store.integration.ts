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

test("veritabanındaki CHECK kuralı TypeScript'in geçirdiği değeri durdurur", async () => {
  const tooLong = "x".repeat(201);

  await assert.rejects(
    store.createCard(boardId, { title: tooLong, description: null, status: "todo" }),
    { code: "23514" }
  );
});
