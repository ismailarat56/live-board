import type { Member } from "@live-board/shared";
import { useEffect, useState } from "react";
import { errorMessage, listMembers } from "./api.ts";

const MEMBERS_POLL_MS = 5_000;

export function useMembers(boardId: number) {
  const [members, setMembers] = useState<Member[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    listMembers(boardId)
      .then((list) => {
        if (!ignore) {
          setMembers(list);
        }
      })
      .catch((error: unknown) => {
        console.warn("Üye listesi alınamadı:", errorMessage(error));
      });

    const timer = setTimeout(() => setAttempt((value) => value + 1), MEMBERS_POLL_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [boardId, attempt]);

  return { members, refresh: () => setAttempt((value) => value + 1) };
}
