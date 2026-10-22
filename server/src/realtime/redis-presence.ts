import { compareMembers } from "@live-board/shared";
import type { PresenceStore } from "./presence.ts";

export interface PresenceRedis {
  hSetEx(
    key: string,
    fields: Record<string, string>,
    options: { expiration: { type: "EX" | "PX"; value: number } }
  ): Promise<unknown>;
  hDel(key: string, field: string): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
}

export function presenceKey(boardId: number): string {
  return `presence:board:${boardId}`;
}

export function createRedisPresence(redis: PresenceRedis, ttlMs: number): PresenceStore {
  return {
    async upsert(boardId, member) {
      await redis.hSetEx(
        presenceKey(boardId),
        { [member.connectionId]: member.name },
        { expiration: { type: "PX", value: ttlMs } }
      );
    },

    async remove(boardId, connectionId) {
      await redis.hDel(presenceKey(boardId), connectionId);
    },

    async list(boardId) {
      const members = await redis.hGetAll(presenceKey(boardId));

      return Object.entries(members)
        .map(([connectionId, name]) => ({ connectionId, name }))
        .toSorted(compareMembers);
    },
  };
}
