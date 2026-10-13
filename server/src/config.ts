const DEFAULT_PORT = 4000;

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

export const config = {
  port: readPort(),
} as const;
