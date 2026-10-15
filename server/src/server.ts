import { assertNever } from "@live-board/shared";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { createPool } from "./db/pool.ts";
import type { CardStore } from "./store/card-store.ts";
import { createMemoryStore } from "./store/memory-store.ts";
import { createPgStore } from "./store/pg-store.ts";

function createStore(): CardStore {
  switch (config.store.kind) {
    case "memory":
      return createMemoryStore();
    case "postgres":
      return createPgStore(createPool(config.store.databaseUrl));
    default:
      return assertNever(config.store);
  }
}

const app = createApp(createStore());

app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }

  console.log(
    `Live Board API http://localhost:${config.port} adresinde çalışıyor (depo: ${config.store.kind}).`
  );
});
