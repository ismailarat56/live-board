import { Pool } from "pg";

export function createPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString, max: 5 });

  pool.on("error", (error) => {
    console.error("Boştaki bir veritabanı bağlantısı koptu:", error.message);
  });

  return pool;
}
