import { assertNever } from "@live-board/shared";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { createHub, type BoardHub, type EventPublisher } from "./realtime/hub.ts";
import { createMemoryPresence } from "./realtime/memory-presence.ts";
import { PRESENCE_TTL_MS, type PresenceStore } from "./realtime/presence.ts";
import { connectRedis } from "./realtime/redis.ts";
import { createRedisPresence } from "./realtime/redis-presence.ts";
import { createRedisRelay } from "./realtime/redis-relay.ts";
import { attachWebSocket } from "./realtime/ws-server.ts";
import type { CardStore } from "./store/card-store.ts";
import { createMemoryStore } from "./store/memory-store.ts";
import { createPgStore } from "./store/pg-store.ts";

interface StoreHandle {
  store: CardStore;
  close(): Promise<void>;
}

function createStore(): StoreHandle {
  switch (config.store.kind) {
    case "memory":
      return { store: createMemoryStore(), close: async () => {} };
    case "postgres": {
      const pool = createPool(config.store.databaseUrl);

      return { store: createPgStore(pool), close: () => pool.end() };
    }
    default:
      return assertNever(config.store);
  }
}

interface PubSubHandle {
  events: EventPublisher;
  presence: PresenceStore;
  onReconnect(listener: () => void): void;
  close(): Promise<void>;
}

async function createPubSub(hub: BoardHub): Promise<PubSubHandle> {
  switch (config.pubsub.kind) {
    case "local":
      return {
        events: hub,
        presence: createMemoryPresence(PRESENCE_TTL_MS),
        onReconnect: () => {},
        close: async () => {},
      };
    case "redis": {
      const redis = await connectRedis(config.pubsub.redisUrl);
      const relay = createRedisRelay(redis.publisher, redis.subscriber, hub);

      await relay.start();

      return {
        events: relay,
        presence: createRedisPresence(redis.publisher, PRESENCE_TTL_MS),
        onReconnect: (listener) => {
          redis.subscriber.on("ready", listener);
        },
        close: redis.close,
      };
    }
    default:
      return assertNever(config.pubsub);
  }
}

const { store, close: closeStore } = createStore();
const hub = createHub();
const pubsub = await createPubSub(hub);
const app = createApp(store, pubsub.events, pubsub.presence);

const server = app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }

  console.log(
    `Live Board API http://localhost:${config.port} adresinde çalışıyor (depo: ${config.store.kind}, yayın: ${config.pubsub.kind}).`
  );
});

const sockets = attachWebSocket(server, hub, {
  boardExists: async (boardId) => (await store.findBoard(boardId)) !== null,
  presence: pubsub.presence,
  events: pubsub.events,
});

pubsub.onReconnect(() => {
  console.log("Redis aboneliği geri geldi; istemciler yeniden eşitleniyor.");
  sockets.resync();
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} alındı, sunucu kapanıyor...`);

  setTimeout(() => {
    console.error("Kapanış 5 saniyede bitmedi, zorla çıkılıyor.");
    process.exit(1);
  }, 5_000).unref();

  const leaving = sockets.close();
  server.close(() => {
    leaving
      .then(() => Promise.all([closeStore(), pubsub.close()]))
      .then(() => {
        console.log("Sunucu kapandı.");
        process.exit(0);
      })
      .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
      });
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
