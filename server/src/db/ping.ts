import { readDatabaseUrl } from "../config.ts";
import { createPool } from "./pool.ts";

interface PingRow {
  version: string;
  user: string;
  pid: number;
}

const pool = createPool(readDatabaseUrl());

try {
  const result = await pool.query<PingRow>(
    "SELECT version(), current_user AS user, pg_backend_pid() AS pid"
  );

  console.log(result.rows[0]);
} finally {
  await pool.end();
}
