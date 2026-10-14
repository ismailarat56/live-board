import { readDatabaseUrl } from "../src/config.ts";
import { createPool } from "../src/db/pool.ts";

const pool = createPool(readDatabaseUrl());

console.log(`Node sürecinin pid'i: ${process.pid}`);

const started = Date.now();

const pids = await Promise.all(
  Array.from({ length: 8 }, async (_, index) => {
    const result = await pool.query<{ pid: number }>(
      "SELECT pg_backend_pid() AS pid, pg_sleep(10)"
    );
    const seconds = Math.round((Date.now() - started) / 1000);

    console.log(`sorgu ${index + 1}: pid ${result.rows[0]?.pid}, ${seconds}. saniye`);

    return result.rows[0]?.pid;
  })
);

console.log(`farklı bağlantı sayısı: ${new Set(pids).size}`);

await pool.end();
