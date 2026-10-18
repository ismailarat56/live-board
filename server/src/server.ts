import { assertNever } from "@live-board/shared";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { createHub } from "./realtime/hub.ts";
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

const { store, close: closeStore } = createStore();
const hub = createHub();
const app = createApp(store, hub);

const server = app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }

  console.log(
    `Live Board API http://localhost:${config.port} adresinde çalışıyor (depo: ${config.store.kind}).`
  );
});

const sockets = attachWebSocket(server, hub, {
  boardExists: async (boardId) => (await store.findBoard(boardId)) !== null,
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

  sockets.close();
  server.close(() => {
    closeStore()
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
