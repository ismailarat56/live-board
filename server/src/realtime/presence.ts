import type { Member } from "@live-board/shared";

export const PRESENCE_TTL_MS = 15_000;
export const PRESENCE_REFRESH_MS = 5_000;

export interface PresenceStore {
  upsert(boardId: number, member: Member): Promise<void>;
  remove(boardId: number, connectionId: string): Promise<void>;
  list(boardId: number): Promise<Member[]>;
}
