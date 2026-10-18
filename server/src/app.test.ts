import assert from "node:assert/strict";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import type { ApiResponse, Card } from "@live-board/shared";
import { createApp } from "./app.ts";
import { createMemoryStore } from "./store/memory-store.ts";

interface TestResponse<T> {
  status: number;
  body: ApiResponse<T>;
}

interface TestApi {
  send(method: string, path: string, body?: unknown): Promise<Response>;
  request<T>(method: string, path: string, body?: unknown): Promise<TestResponse<T>>;
}

async function startApi(t: TestContext): Promise<TestApi> {
  const server = createApp(createMemoryStore()).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  function send(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(baseUrl + path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? null : JSON.stringify(body),
    });
  }

  return {
    send,
    async request<T>(method: string, path: string, body?: unknown) {
      const response = await send(method, path, body);

      return {
        status: response.status,
        body: (await response.json()) as ApiResponse<T>,
      };
    },
  };
}

test("GET /health sunucunun ayakta olduğunu söyler", async (t) => {
  const api = await startApi(t);

  const response = await api.request<{ status: string }>("GET", "/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: { status: "up" } });
});

test("POST yeni kartı 201 ile döndürür", async (t) => {
  const api = await startApi(t);

  const response = await api.request<Card>("POST", "/api/boards/1/cards", {
    title: "  Tasarımı çiz  ",
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.success);

  const { createdAt, ...card } = response.body.data;

  assert.deepEqual(card, {
    id: 1,
    boardId: 1,
    title: "Tasarımı çiz",
    description: null,
    status: "todo",
    position: 0,
  });
  assert.ok(!Number.isNaN(Date.parse(createdAt)));
});

test("GET kartları sütun ve sıra düzeniyle listeler", async (t) => {
  const api = await startApi(t);
  await api.request("POST", "/api/boards/1/cards", { title: "Bitti", status: "done" });
  await api.request("POST", "/api/boards/1/cards", { title: "Bir" });
  await api.request("POST", "/api/boards/1/cards", { title: "İki" });

  const response = await api.request<Card[]>("GET", "/api/boards/1/cards");

  assert.equal(response.status, 200);
  assert.ok(response.body.success);
  assert.deepEqual(
    response.body.data.map((card) => card.title),
    ["Bir", "İki", "Bitti"]
  );
});

test("PATCH kartı başka sütuna taşır ve sıraları yeniden numaralar", async (t) => {
  const api = await startApi(t);
  await api.request("POST", "/api/boards/1/cards", { title: "Bir" });
  await api.request("POST", "/api/boards/1/cards", { title: "İki" });
  await api.request("POST", "/api/boards/1/cards", { title: "Üç", status: "doing" });

  const response = await api.request<Card[]>("PATCH", "/api/cards/1/move", {
    status: "doing",
    position: 0,
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.success);
  assert.deepEqual(
    response.body.data.map((card) => [card.title, card.status, card.position]),
    [
      ["İki", "todo", 0],
      ["Bir", "doing", 0],
      ["Üç", "doing", 1],
    ]
  );
});

test("PATCH /api/cards/:cardId başlığı düzenler, açıklamayı null ile temizler", async (t) => {
  const api = await startApi(t);
  await api.request("POST", "/api/boards/1/cards", { title: "Bir", description: "eski not" });

  const renamed = await api.request<Card>("PATCH", "/api/cards/1", { title: "  Renk paleti  " });

  assert.equal(renamed.status, 200);
  assert.ok(renamed.body.success);
  assert.equal(renamed.body.data.title, "Renk paleti");
  assert.equal(renamed.body.data.description, "eski not");

  const cleared = await api.request<Card>("PATCH", "/api/cards/1", { description: null });

  assert.ok(cleared.body.success);
  assert.equal(cleared.body.data.title, "Renk paleti");
  assert.equal(cleared.body.data.description, null);
  assert.equal(cleared.body.data.status, "todo");
});

test("DELETE kartı siler, 204 döner ve sütunu yeniden numaralar", async (t) => {
  const api = await startApi(t);
  await api.request("POST", "/api/boards/1/cards", { title: "Bir" });
  await api.request("POST", "/api/boards/1/cards", { title: "İki" });
  await api.request("POST", "/api/boards/1/cards", { title: "Üç" });

  const response = await api.send("DELETE", "/api/cards/1");

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");

  const list = await api.request<Card[]>("GET", "/api/boards/1/cards");

  assert.ok(list.body.success);
  assert.deepEqual(
    list.body.data.map((card) => [card.title, card.position]),
    [
      ["İki", 0],
      ["Üç", 1],
    ]
  );

  const again = await api.request("DELETE", "/api/cards/1");

  assert.equal(again.status, 404);
});

test("hatalı istekler doğru durum ve hata koduyla döner", async (t) => {
  const api = await startApi(t);

  const cases = [
    { method: "GET", path: "/api/boards/99/cards", status: 404, code: "BOARD_NOT_FOUND" },
    { method: "GET", path: "/api/boards/abc/cards", status: 400, code: "INVALID_ID" },
    { method: "POST", path: "/api/boards/1/cards", body: { title: "" }, status: 422, code: "INVALID_TITLE" },
    { method: "POST", path: "/api/boards/1/cards", body: { title: "   " }, status: 422, code: "INVALID_TITLE" },
    { method: "POST", path: "/api/boards/1/cards", body: { title: "x".repeat(201) }, status: 422, code: "INVALID_TITLE" },
    { method: "POST", path: "/api/boards/1/cards", body: { title: "Logo", description: 5 }, status: 422, code: "INVALID_DESCRIPTION" },
    { method: "POST", path: "/api/boards/1/cards", body: { title: "Logo", status: "blocked" }, status: 422, code: "INVALID_STATUS" },
    { method: "POST", path: "/api/boards/1/cards", body: [], status: 400, code: "INVALID_BODY" },
    { method: "PATCH", path: "/api/cards/1/move", body: { status: "done", position: 1.5 }, status: 422, code: "INVALID_POSITION" },
    { method: "PATCH", path: "/api/cards/1/move", body: { status: "later", position: 0 }, status: 422, code: "INVALID_STATUS" },
    { method: "PATCH", path: "/api/cards/42/move", body: { status: "done", position: 0 }, status: 404, code: "CARD_NOT_FOUND" },
    { method: "PATCH", path: "/api/cards/1", body: {}, status: 422, code: "EMPTY_UPDATE" },
    { method: "PATCH", path: "/api/cards/1", body: { status: "done" }, status: 422, code: "UNKNOWN_FIELD" },
    { method: "PATCH", path: "/api/cards/1", body: { title: "   " }, status: 422, code: "INVALID_TITLE" },
    { method: "PATCH", path: "/api/cards/42", body: { title: "Yok" }, status: 404, code: "CARD_NOT_FOUND" },
    { method: "PATCH", path: "/api/cards/abc", body: { title: "Yok" }, status: 400, code: "INVALID_ID" },
    { method: "DELETE", path: "/api/cards/42", status: 404, code: "CARD_NOT_FOUND" },
    { method: "DELETE", path: "/api/cards/0", status: 400, code: "INVALID_ID" },
    { method: "GET", path: "/api/nowhere", status: 404, code: "NOT_FOUND" },
  ];

  for (const item of cases) {
    await t.test(`${item.method} ${item.path} --> ${item.status}`, async () => {
      const response = await api.request(item.method, item.path, item.body);

      assert.equal(response.status, item.status);
      assert.ok(!response.body.success);
      assert.equal(response.body.error.code, item.code);
    });
  }
});
