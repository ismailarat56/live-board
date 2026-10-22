import {
  assertNever,
  ServerMessageSchema,
  type BoardEvent,
} from "@live-board/shared";
import { useEffect, useEffectEvent, useState } from "react";
import { reconnectDelay } from "./reconnect.ts";

export type SocketState =
  | { status: "connecting" }
  | { status: "open" }
  | { status: "waiting"; attempt: number; delayMs: number };

interface UseBoardSocketOptions {
  boardId: number;
  name: string;
  onWelcome: (connectionId: string) => void;
  onEvent: (event: BoardEvent) => void;
}

interface BoardSocket {
  state: SocketState;
  reconnectNow: () => void;
}

export function useBoardSocket({
  boardId,
  name,
  onWelcome,
  onEvent,
}: UseBoardSocketOptions): BoardSocket {
  const [state, setState] = useState<SocketState>({ status: "connecting" });
  const [connection, setConnection] = useState(0);
  const handleWelcome = useEffectEvent(onWelcome);
  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    let stopped = false;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    function connect() {
      timer = undefined;
      setState({ status: "connecting" });

      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const query = new URLSearchParams({ boardId: String(boardId), name });
      const current = new WebSocket(`${protocol}//${location.host}/ws?${query}`);
      socket = current;

      current.addEventListener("open", () => {
        if (!stopped) {
          setState({ status: "open" });
        }
      });

      current.addEventListener("message", (event) => {
        if (stopped) {
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
            failures = 0;
            handleWelcome(message.connectionId);
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

      current.addEventListener("close", () => {
        if (stopped) {
          return;
        }

        const delayMs = reconnectDelay(failures);
        failures += 1;
        setState({ status: "waiting", attempt: failures, delayMs });
        timer = setTimeout(connect, delayMs);
      });
    }

    function handleOnline() {
      if (timer !== undefined) {
        clearTimeout(timer);
        connect();
      }
    }

    connect();
    window.addEventListener("online", handleOnline);

    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
      window.removeEventListener("online", handleOnline);
    };
  }, [boardId, name, connection]);

  return { state, reconnectNow: () => setConnection((value) => value + 1) };
}
