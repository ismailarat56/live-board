import { BoardEventSchema } from "@live-board/shared";
import type { BoardHub, EventPublisher } from "./hub.ts";

export const CHANNEL_PATTERN = "board:*";

export interface RedisPublisher {
  publish(channel: string, message: string): Promise<unknown>;
}

export interface RedisSubscriber {
  pSubscribe(
    pattern: string,
    listener: (message: string, channel: string) => void
  ): Promise<unknown>;
}

export interface RedisRelay extends EventPublisher {
  start(): Promise<void>;
}

export function channelFor(boardId: number): string {
  return `board:${boardId}`;
}

export function boardIdFrom(channel: string): number | null {
  if (!channel.startsWith("board:")) {
    return null;
  }

  const boardId = Number(channel.slice("board:".length));

  if (!Number.isSafeInteger(boardId) || boardId <= 0 || channelFor(boardId) !== channel) {
    return null;
  }

  return boardId;
}

export function createRedisRelay(
  publisher: RedisPublisher,
  subscriber: RedisSubscriber,
  hub: BoardHub
): RedisRelay {
  let subscription: Promise<void> | undefined;

  function receive(message: string, channel: string): void {
    try {
      const boardId = boardIdFrom(channel);

      if (boardId === null) {
        console.error("Tanınmayan Redis kanalı:", channel);
        return;
      }

      let json: unknown;

      try {
        json = JSON.parse(message);
      } catch {
        console.error("Redis mesajı JSON değil:", message);
        return;
      }

      const parsed = BoardEventSchema.safeParse(json);

      if (!parsed.success) {
        console.error("Redis mesajı bir pano olayı değil:", message);
        return;
      }

      hub.publish(boardId, parsed.data);
    } catch (error) {
      console.error("Redis mesajı işlenemedi:", String(error));
    }
  }

  function logPublishError(error: unknown): void {
    console.error("Redis'e yayınlanamadı:", String(error));
  }

  return {
    async start() {
      subscription ??= subscriber.pSubscribe(CHANNEL_PATTERN, receive).then(() => {});
      await subscription;
    },

    publish(boardId, event) {
      try {
        void publisher.publish(channelFor(boardId), JSON.stringify(event)).catch(logPublishError);
      } catch (error) {
        logPublishError(error);
      }
    },
  };
}
