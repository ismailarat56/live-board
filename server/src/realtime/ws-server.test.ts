import assert from "node:assert/strict";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import { ServerMessageSchema, type ServerMessage } from "@live-board/shared";
import { WebSocket as NodeWebSocket } from "ws";
import { createApp } from "../app.ts";
import { createMemoryStore } from "../store/memory-store.ts";
import { createHub, type BoardHub } from "./hub.ts";
import { attachWebSocket } from "./ws-server.ts";

interface Client {
  socket: WebSocket;
  messages: ServerMessage[];
  next(): Promise<ServerMessage>;
}

async function startServer(t: TestContext, heartbeatMs?: number) {
  const store = createMemoryStore();
  const hub = createHub();
  const server = createApp(store, hub).listen(0, "127.0.0.1");
  await once(server, "listening");
  attachWebSocket(server, hub, {
    boardExists: async (boardId) => (await store.findBoard(boardId)) !== null,
    ...(heartbeatMs === undefined ? {} : { heartbeatMs }),
  });
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  const host = `127.0.0.1:${address.port}`;

  async function connect(query = "boardId=1", path = "/ws"): Promise<Client> {
    const socket = new WebSocket(`ws://${host}${path}?${query}`);
    const messages: ServerMessage[] = [];
    const waiting: Array<(message: ServerMessage) => void> = [];

    socket.addEventListener("message", (event) => {
      const message = ServerMessageSchema.parse(JSON.parse(String(event.data)));
      const waiter = waiting.shift();

      if (waiter === undefined) {
        messages.push(message);
      } else {
        waiter(message);
      }
    });

    await once(socket, "open");
    t.after(() => socket.close());

    return {
      socket,
      messages,
      next() {
        const queued = messages.shift();

        if (queued !== undefined) {
          return Promise.resolve(queued);
        }

        return new Promise((resolve) => waiting.push(resolve));
      },
    };
  }

  function post(path: string, method: string, body: unknown): Promise<Response> {
    return fetch(`http://${host}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return { connect, post, hub: hub satisfies BoardHub, host };
}

async function waitForCount(hub: BoardHub, expected: number): Promise<void> {
  for (let i = 0; i < 50 && hub.count(1) !== expected; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function failsToOpen(url: string): Promise<boolean> {
  const socket = new WebSocket(url);

  const result = await Promise.race([
    once(socket, "open").then(() => "open"),
    once(socket, "error").then(() => "error"),
  ]);

  socket.close();

  return result === "error";
}

test("bağlanan istemci welcome alır ve sayaç artar", async (t) => {
  const { connect } = await startServer(t);

  const first = await connect();
  assert.deepEqual(await first.next(), { type: "welcome", boardId: 1, clients: 1 });

  const second = await connect();
  assert.deepEqual(await second.next(), { type: "welcome", boardId: 1, clients: 2 });
});

test("bir istemcinin eklediği kartı iki istemci de alır", async (t) => {
  const { connect, post } = await startServer(t);
  const first = await connect();
  const second = await connect();
  await first.next();
  await second.next();

  const response = await post("/api/boards/1/cards", "POST", { title: "Canlı kart" });
  assert.equal(response.status, 201);

  for (const client of [first, second]) {
    const message = await client.next();

    assert.equal(message.type, "event");
    assert.ok(message.type === "event" && message.event.type === "card_created");
    assert.equal(message.event.card.title, "Canlı kart");
  }
});

test("taşıma olayı yalnız son konumu taşır", async (t) => {
  const { connect, post } = await startServer(t);
  await post("/api/boards/1/cards", "POST", { title: "Bir" });

  const client = await connect();
  await client.next();

  await post("/api/cards/1/move", "PATCH", { status: "done", position: 50 });

  assert.deepEqual(await client.next(), {
    type: "event",
    event: { type: "card_moved", cardId: 1, toStatus: "done", toPosition: 0 },
  });
});

test("reddedilen istek istemciye hiçbir şey göndermez", async (t) => {
  const { connect, post } = await startServer(t);
  const client = await connect();
  await client.next();

  await post("/api/boards/1/cards", "POST", { title: "" });
  const ok = await post("/api/boards/1/cards", "POST", { title: "Geçerli" });
  assert.equal(ok.status, 201);

  const message = await client.next();

  assert.ok(message.type === "event" && message.event.type === "card_created");
  assert.equal(message.event.card.title, "Geçerli");
});

test("ping pong ile yanıtlanır, bozuk mesaj hata döner ama bağlantı açık kalır", async (t) => {
  const { connect } = await startServer(t);
  const client = await connect();
  await client.next();

  client.socket.send(JSON.stringify({ type: "ping" }));
  assert.deepEqual(await client.next(), { type: "pong" });

  client.socket.send("merhaba");
  const invalidJson = await client.next();
  assert.ok(invalidJson.type === "error");
  assert.equal(invalidJson.code, "INVALID_JSON");

  client.socket.send(JSON.stringify({ type: "move", cardId: 1 }));
  const invalidMessage = await client.next();
  assert.ok(invalidMessage.type === "error");
  assert.equal(invalidMessage.code, "INVALID_MESSAGE");

  client.socket.send(JSON.stringify({ type: "ping" }));
  assert.deepEqual(await client.next(), { type: "pong" });
});

test("el sıkışma yanlış adres, olmayan pano ve eksik boardId'de başarısız olur", async (t) => {
  const { host } = await startServer(t);

  assert.equal(await failsToOpen(`ws://${host}/ws?boardId=9`), true);
  assert.equal(await failsToOpen(`ws://${host}/ws`), true);
  assert.equal(await failsToOpen(`ws://${host}/ws?boardId=abc`), true);
  assert.equal(await failsToOpen(`ws://${host}/baska?boardId=1`), true);
});

test("bağlantı kapanınca hub aboneyi bırakır", async (t) => {
  const { connect, hub } = await startServer(t);
  const client = await connect();
  await client.next();
  assert.equal(hub.count(1), 1);

  client.socket.close();
  await once(client.socket, "close");

  await waitForCount(hub, 0);

  assert.equal(hub.count(1), 0);
});

test("pong döndürmeyen bağlantı iki turda kapatılır, yanıt veren açık kalır", async (t) => {
  const { connect, hub, host } = await startServer(t, 60);

  const healthy = await connect();
  await healthy.next();

  const silent = new NodeWebSocket(`ws://${host}/ws?boardId=1`, { autoPong: false });
  await once(silent, "open");
  t.after(() => silent.terminate());
  assert.equal(hub.count(1), 2);

  const [code] = await once(silent, "close");

  assert.equal(code, 1006);
  await waitForCount(hub, 1);
  assert.equal(hub.count(1), 1);
  assert.equal(healthy.socket.readyState, WebSocket.OPEN);
});
