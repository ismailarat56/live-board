const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export function reconnectDelay(failures: number, random: () => number = Math.random): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** failures);

  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}
