import { readdir, readFile } from "node:fs/promises";
import { readDatabaseUrl } from "../config.ts";
import { createPool } from "./pool.ts";

const MIGRATIONS_DIR = new URL("../../migrations/", import.meta.url);

const pool = createPool(readDatabaseUrl());
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = await client.query<{ name: string }>(
    "SELECT name FROM schema_migrations"
  );
  const done = new Set(applied.rows.map((row) => row.name));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .toSorted();

  for (const file of files) {
    if (done.has(file)) {
      console.log(`atlandı    ${file}`);
      continue;
    }

    const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8");

    await client.query("BEGIN");

    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log(`uygulandı  ${file}`);
  }
} finally {
  client.release();
  await pool.end();
}
