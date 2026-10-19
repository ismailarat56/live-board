import assert from "node:assert/strict";
import { test } from "node:test";
import type { BoardEvent } from "@live-board/shared";
import { createHub, type Subscriber } from "./hub.ts";
import {
  boardIdFrom,
  channelFor,
  createRedisRelay,
  type RedisPublisher,
  type RedisSubscriber,
} from "./redis-relay.ts";

const deleted: BoardEvent = { type: "card_deleted", cardId: 3 };

function fakeRedis() {
  const published: Array<{ channel: string; message: string }> = [];
  const patterns: string[] = [];
  let listener: ((message: string, channel: string) => void) | undefined;

  const publisher: RedisPublisher = {
    async publish(channel, message) {
      published.push({ channel, message });
      return 1;
    },
  };

  const subscriber: RedisSubscriber = {
    async pSubscribe(pattern, onMessage) {
      await new Promise((resolve) => setImmediate(resolve));
      patterns.push(pattern);
      listener = onMessage;
    },
  };

  function deliver(channel: string, message: string): void {
    if (listener === undefined) {
      throw new Error("Redis'e henüz abone olunmadı.");
    }

    listener(message, channel);
  }

  return { published, patterns, publisher, subscriber, deliver };
}

function inbox(): Subscriber & { received: unknown[] } {
  const received: unknown[] = [];

  return {
    received,
    send(data) {
      received.push(JSON.parse(data));
    },
  };
}

test("kanal adı pano numarasından üretilir ve geri okunur", () => {
  assert.equal(channelFor(1), "board:1");
  assert.equal(channelFor(42), "board:42");
  assert.equal(boardIdFrom("board:1"), 1);
  assert.equal(boardIdFrom("board:42"), 42);
});

test("tanınmayan kanal adı için null döner", () => {
  for (const channel of [
    "board:",
    "board:abc",
    "board:0",
    "board:-1",
    "board:1.5",
    "board:01",
    "board:1:x",
    "cards:1",
  ]) {
    assert.equal(boardIdFrom(channel), null, channel);
  }
});

test("start board:* desenine bir kez abone olur", async () => {
  const redis = fakeRedis();
  const relay = createRedisRelay(redis.publisher, redis.subscriber, createHub());

  await relay.start();

  assert.deepEqual(redis.patterns, ["board:*"]);
});

test("publish olayı JSON olarak board:<id> kanalına yollar, yerel abonelere kendisi dağıtmaz", async () => {
  const redis = fakeRedis();
  const hub = createHub();
  const local = inbox();
  hub.subscribe(7, local);
  const relay = createRedisRelay(redis.publisher, redis.subscriber, hub);
  await relay.start();

  const result = relay.publish(7, deleted);

  assert.equal(result, undefined);
  assert.equal(redis.published.length, 1);
  assert.equal(redis.published[0]?.channel, "board:7");
  assert.deepEqual(JSON.parse(redis.published[0]?.message ?? ""), deleted);
  assert.deepEqual(local.received, []);
});

test("Redis'ten gelen olay yalnız o panonun abonelerine, şemadan geçmiş haliyle gider", async () => {
  const redis = fakeRedis();
  const hub = createHub();
  const seven = inbox();
  const eight = inbox();
  hub.subscribe(7, seven);
  hub.subscribe(8, eight);
  const relay = createRedisRelay(redis.publisher, redis.subscriber, hub);
  await relay.start();

  redis.deliver("board:7", JSON.stringify({ ...deleted, extra: "atılmalı" }));

  assert.deepEqual(seven.received, [{ type: "event", event: deleted }]);
  assert.deepEqual(eight.received, []);
});

test("JSON olmayan mesaj atılır ve kaydedilir", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const redis = fakeRedis();
  const hub = createHub();
  const local = inbox();
  hub.subscribe(7, local);
  const relay = createRedisRelay(redis.publisher, redis.subscriber, hub);
  await relay.start();

  redis.deliver("board:7", "merhaba");

  assert.deepEqual(local.received, []);
  assert.equal(errors.mock.callCount(), 1);
  assert.equal(errors.mock.calls[0]?.arguments[0], "Redis mesajı JSON değil:");
});

test("pano olayı olmayan JSON atılır ve kaydedilir", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const redis = fakeRedis();
  const hub = createHub();
  const local = inbox();
  hub.subscribe(7, local);
  const relay = createRedisRelay(redis.publisher, redis.subscriber, hub);
  await relay.start();

  redis.deliver("board:7", JSON.stringify({ type: "card_exploded", cardId: 3 }));

  assert.deepEqual(local.received, []);
  assert.equal(errors.mock.callCount(), 1);
  assert.equal(errors.mock.calls[0]?.arguments[0], "Redis mesajı bir pano olayı değil:");
});

test("tanınmayan kanaldan gelen mesaj atılır ve kaydedilir", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const redis = fakeRedis();
  const relay = createRedisRelay(redis.publisher, redis.subscriber, createHub());
  await relay.start();

  redis.deliver("board:abc", JSON.stringify(deleted));

  assert.equal(errors.mock.callCount(), 1);
  assert.equal(errors.mock.calls[0]?.arguments[0], "Tanınmayan Redis kanalı:");
});

test("Redis'e yayın başarısız olursa publish hata fırlatmaz, hata kaydedilir", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  const redis = fakeRedis();
  const failing: RedisPublisher = {
    publish: () => Promise.reject(new Error("The client is offline")),
  };
  const relay = createRedisRelay(failing, redis.subscriber, createHub());

  assert.doesNotThrow(() => relay.publish(7, deleted));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(errors.mock.callCount(), 1);
  assert.equal(errors.mock.calls[0]?.arguments[0], "Redis'e yayınlanamadı:");
});

test("yayınlanan olay Redis'ten dönünce yerel aboneye bir kez ulaşır", async () => {
  const redis = fakeRedis();
  const loopback: RedisPublisher = {
    async publish(channel, message) {
      redis.deliver(channel, message);
      return 1;
    },
  };
  const hub = createHub();
  const local = inbox();
  hub.subscribe(7, local);
  const relay = createRedisRelay(loopback, redis.subscriber, hub);
  await relay.start();

  relay.publish(7, deleted);

  assert.deepEqual(local.received, [{ type: "event", event: deleted }]);
});
