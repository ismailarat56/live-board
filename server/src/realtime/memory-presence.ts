import { compareMembers, type Member } from "@live-board/shared";
import type { PresenceStore } from "./presence.ts";

export function createMemoryPresence(ttlMs: number): PresenceStore {
  const boards = new Map<number, Map<string, { name: string; expiresAt: number }>>();

  return {
    async upsert(boardId, member) {
      const members = boards.get(boardId) ?? new Map();

      members.set(member.connectionId, {
        name: member.name,
        expiresAt: Date.now() + ttlMs,
      });
      boards.set(boardId, members);
    },

    async remove(boardId, connectionId) {
      const members = boards.get(boardId);

      members?.delete(connectionId);

      if (members?.size === 0) {
        boards.delete(boardId);
      }
    },

    async list(boardId) {
      const members = boards.get(boardId);

      if (members === undefined) {
        return [];
      }

      const now = Date.now();
      const active: Member[] = [];

      for (const [connectionId, member] of members) {
        if (member.expiresAt <= now) {
          members.delete(connectionId);
        } else {
          active.push({ connectionId, name: member.name });
        }
      }

      if (members.size === 0) {
        boards.delete(boardId);
      }

      return active.toSorted(compareMembers);
    },
  };
}
