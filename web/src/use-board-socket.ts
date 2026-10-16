import {
  assertNever,
  ServerMessageSchema,
  type BoardEvent,
} from "@live-board/shared";
import { useEffect, useEffectEvent, useState } from "react";

export type SocketStatus = "connecting" | "open" | "closed";

interface UseBoardSocketOptions {
  boardId: number;
  connection: number;
  onWelcome: () => void;
  onEvent: (event: BoardEvent) => void;
}

export function useBoardSocket({
  boardId,
  connection,
  onWelcome,
  onEvent,
}: UseBoardSocketOptions): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const handleWelcome = useEffectEvent(onWelcome);
  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    let ignore = false;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/ws?boardId=${boardId}`);

    setStatus("connecting");

    socket.addEventListener("open", () => {
      if (!ignore) {
        setStatus("open");
      }
    });

    socket.addEventListener("message", (event) => {
      if (ignore) {
        return;
      }

      let json: unknown;

      try {
        json = JSON.parse(String(event.data));
      } catch {
        return;
      }

      const parsed = ServerMessageSchema.safeParse(json);

      if (!parsed.success) {
        console.error("Beklenmeyen WebSocket mesajı:", json);
        return;
      }

      const message = parsed.data;

      switch (message.type) {
        case "welcome":
          handleWelcome();
          break;
        case "event":
          handleEvent(message.event);
          break;
        case "pong":
          break;
        case "error":
          console.warn(`Sunucu hatası (${message.code}): ${message.message}`);
          break;
        default:
          assertNever(message);
      }
    });

    socket.addEventListener("close", () => {
      if (!ignore) {
        setStatus("closed");
      }
    });

    return () => {
      ignore = true;
      socket.close();
    };
  }, [boardId, connection]);

  return status;
}
