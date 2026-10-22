import assert from "node:assert/strict";
import { test } from "node:test";
import { createRedisPresence, type PresenceRedis } from "./redis-presence.ts";

function fakeRedis(failWith?: Error) {
  const calls: unknown[][] = [];

  const redis: PresenceRedis = {
    async hSetEx(...args) {
      calls.push(["hSetEx", ...args]);

      if (failWith !== undefined) {
        throw failWith;
      }
    },
    async hDel(...args) {
      calls.push(["hDel", ...args]);

      if (failWith !== undefined) {
        throw failWith;
      }
    },
    async hGetAll(key) {
      calls.push(["hGetAll", key]);

      return { c2: "Zeynep", c1: "Ali" };
    },
  };

  return { redis, calls };
}

test("redis üyeler: upsert tek komutla, milisaniye süresiyle yazar", async () => {
  const { redis, calls } = fakeRedis();
  const presence = createRedisPresence(redis, 15_000);

  await presence.upsert(7, { connectionId: "c1", name: "Ali" });

  assert.deepEqual(calls, [
    ["hSetEx", "presence:board:7", { c1: "Ali" }, { expiration: { type: "PX", value: 15_000 } }],
  ]);
});

test("redis üyeler: list alanları üyeye çevirir ve sıralar", async () => {
  const { redis } = fakeRedis();
  const presence = createRedisPresence(redis, 15_000);

  assert.deepEqual(await presence.list(7), [
    { connectionId: "c1", name: "Ali" },
    { connectionId: "c2", name: "Zeynep" },
  ]);
});

test("redis üyeler: Redis hatası upsert ve remove'dan dışarı çıkar", async () => {
  const { redis } = fakeRedis(new Error("The client is offline"));
  const presence = createRedisPresence(redis, 15_000);

  await assert.rejects(presence.upsert(7, { connectionId: "c1", name: "Ali" }), /offline/);
  await assert.rejects(presence.remove(7, "c1"), /offline/);
});
