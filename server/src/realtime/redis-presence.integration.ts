import { after } from "node:test";
import { createClient } from "redis";
import { readRedisUrl } from "../config.ts";
import { CONTRACT_TTL_MS, presenceContract } from "./presence-contract.ts";
import { createRedisPresence, presenceKey } from "./redis-presence.ts";

const redis = createClient({ url: readRedisUrl(), database: 1 });

redis.on("error", (error: Error) => {
  console.error("Redis:", error.message);
});

await redis.connect();

after(() => redis.close());

presenceContract(async () => {
  await redis.del([presenceKey(1), presenceKey(2)]);

  return createRedisPresence(redis, CONTRACT_TTL_MS);
});
