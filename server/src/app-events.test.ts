import assert from "node:assert/strict";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import type { BoardEvent, Card } from "@live-board/shared";
import { createApp } from "./app.ts";
import { noopHub, type BoardHub } from "./realtime/hub.ts";
import { createMemoryStore } from "./store/memory-store.ts";

interface Published {
  boardId: number;
  event: BoardEvent;
}

async function startApi(t: TestContext) {
  const published: Published[] = [];
  const hub: BoardHub = {
    ...noopHub,
    publish(boardId, event) {
      published.push({ boardId, event });
    },
  };

  const server = createApp(createMemoryStore(), hub).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function send(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(baseUrl + path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? null : JSON.stringify(body),
    });
  }

  return { published, send };
}

test("kart eklenince card_created yayınlanır", async (t) => {
  const { published, send } = await startApi(t);

  const response = await send("POST", "/api/boards/1/cards", { title: "Tasarımı çiz" });
  const body = (await response.json()) as { data: Card };

  assert.equal(response.status, 201);
  assert.equal(published.length, 1);
  assert.deepEqual(published[0], {
    boardId: 1,
    event: { type: "card_created", card: body.data },
  });
});

test("kart taşınınca card_moved son konumla yayınlanır", async (t) => {
  const { published, send } = await startApi(t);
  await send("POST", "/api/boards/1/cards", { title: "Bir" });
  await send("POST", "/api/boards/1/cards", { title: "İki" });
  published.length = 0;

  const response = await send("PATCH", "/api/cards/1/move", { status: "doing", position: 0 });

  assert.equal(response.status, 200);
  assert.deepEqual(published, [
    {
      boardId: 1,
      event: { type: "card_moved", cardId: 1, toStatus: "doing", toPosition: 0 },
    },
  ]);
});

test("sütun sonundan büyük position kesilmiş değerle yayınlanır", async (t) => {
  const { published, send } = await startApi(t);
  await send("POST", "/api/boards/1/cards", { title: "Bir" });
  published.length = 0;

  await send("PATCH", "/api/cards/1/move", { status: "done", position: 99 });

  assert.deepEqual(published[0]?.event, {
    type: "card_moved",
    cardId: 1,
    toStatus: "done",
    toPosition: 0,
  });
});

test("kart düzenlenince card_updated son haliyle yayınlanır", async (t) => {
  const { published, send } = await startApi(t);
  await send("POST", "/api/boards/1/cards", { title: "Bir", description: "not" });
  published.length = 0;

  const response = await send("PATCH", "/api/cards/1", { title: "Renk paleti" });

  assert.equal(response.status, 200);
  assert.deepEqual(published, [
    {
      boardId: 1,
      event: { type: "card_updated", cardId: 1, title: "Renk paleti", description: "not" },
    },
  ]);
});

test("kart silinince card_deleted yayınlanır", async (t) => {
  const { published, send } = await startApi(t);
  await send("POST", "/api/boards/1/cards", { title: "Bir" });
  published.length = 0;

  const response = await send("DELETE", "/api/cards/1");

  assert.equal(response.status, 204);
  assert.deepEqual(published, [{ boardId: 1, event: { type: "card_deleted", cardId: 1 } }]);
});

test("reddedilen istekler olay yayınlamaz", async (t) => {
  const { published, send } = await startApi(t);

  await send("POST", "/api/boards/1/cards", { title: "   " });
  await send("POST", "/api/boards/9/cards", { title: "Var mı" });
  await send("PATCH", "/api/cards/99/move", { status: "done", position: 0 });
  await send("PATCH", "/api/cards/1/move", { status: "blocked", position: 0 });
  await send("PATCH", "/api/cards/99", { title: "Yok" });
  await send("PATCH", "/api/cards/1", {});
  await send("DELETE", "/api/cards/99");

  assert.deepEqual(published, []);
});
