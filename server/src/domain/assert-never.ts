export function assertNever(value: never): never {
  throw new Error(`Beklenmeyen değer: ${JSON.stringify(value)}`);
}
