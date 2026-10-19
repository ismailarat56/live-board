import type { BoardEvent, ServerMessage } from "@live-board/shared";

export interface Subscriber {
  send(data: string): void;
}

export interface EventPublisher {
  publish(boardId: number, event: BoardEvent): void;
}

export interface BoardHub extends EventPublisher {
  subscribe(boardId: number, subscriber: Subscriber): () => void;
  count(boardId: number): number;
}

export function createHub(): BoardHub {
  const boards = new Map<number, Set<Subscriber>>();

  return {
    subscribe(boardId, subscriber) {
      const subscribers = boards.get(boardId) ?? new Set<Subscriber>();

      subscribers.add(subscriber);
      boards.set(boardId, subscribers);

      return () => {
        subscribers.delete(subscriber);

        if (subscribers.size === 0) {
          boards.delete(boardId);
        }
      };
    },

    publish(boardId, event) {
      const subscribers = boards.get(boardId);

      if (subscribers === undefined) {
        return;
      }

      const message: ServerMessage = { type: "event", event };
      const data = JSON.stringify(message);

      for (const subscriber of subscribers) {
        try {
          subscriber.send(data);
        } catch (error) {
          console.error("Abonelere gönderilemedi:", error);
        }
      }
    },

    count(boardId) {
      return boards.get(boardId)?.size ?? 0;
    },
  };
}

export const noopHub: BoardHub = {
  subscribe: () => () => {},
  publish: () => {},
  count: () => 0,
};
