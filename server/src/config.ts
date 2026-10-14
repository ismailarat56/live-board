const DEFAULT_PORT = 4000;

export type StoreConfig =
  | { kind: "memory" }
  | { kind: "postgres"; databaseUrl: string };

function readPort(): number {
  const raw = process.env.PORT;

  if (raw === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT 1 ile 65535 arasında bir tam sayı olmalıdır.");
  }

  return port;
}

export function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL tanımlı değil; server/.env dosyasına bak.");
  }

  return url;
}

function readStore(): StoreConfig {
  const kind = process.env.STORE ?? "memory";

  if (kind === "memory") {
    return { kind };
  }

  if (kind === "postgres") {
    return { kind, databaseUrl: readDatabaseUrl() };
  }

  throw new Error("STORE memory veya postgres olmalıdır.");
}

export const config = {
  port: readPort(),
  store: readStore(),
} as const;
