import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import {
  assertNever,
  ClientMessageSchema,
  type ServerMessage,
} from "@live-board/shared";
import { WebSocket, WebSocketServer } from "ws";
import type { BoardHub } from "./hub.ts";

const DEFAULT_HEARTBEAT_MS = 30_000;

export interface WebSocketOptions {
  boardExists(boardId: number): Promise<boolean>;
  heartbeatMs?: number;
}

function reject(socket: Duplex, status: string): void {
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function readBoardId(request: IncomingMessage): number | "not-found" | "bad-request" {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname !== "/ws") {
    return "not-found";
  }

  const boardId = Number(url.searchParams.get("boardId"));

  if (!Number.isInteger(boardId) || boardId < 1) {
    return "bad-request";
  }

  return boardId;
}

function sendMessage(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export interface WebSocketHandle {
  resync(): void;
  close(): void;
}

export function attachWebSocket(
  server: Server,
  hub: BoardHub,
  options: WebSocketOptions
): WebSocketHandle {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const alive = new WeakSet<WebSocket>();

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!alive.has(client)) {
        client.terminate();
        continue;
      }

      alive.delete(client);
      client.ping();
    }
  }, options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS);

  heartbeat.unref();
  server.on("close", () => clearInterval(heartbeat));

  server.on("upgrade", (request, socket, head) => {
    const boardId = readBoardId(request);

    if (boardId === "not-found") {
      reject(socket, "404 Not Found");
      return;
    }

    if (boardId === "bad-request") {
      reject(socket, "400 Bad Request");
      return;
    }

    options
      .boardExists(boardId)
      .then((exists) => {
        if (!exists) {
          reject(socket, "404 Not Found");
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          handleConnection(ws, boardId);
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        reject(socket, "500 Internal Server Error");
      });
  });

  function handleConnection(ws: WebSocket, boardId: number): void {
    alive.add(ws);
    ws.on("pong", () => alive.add(ws));

    const unsubscribe = hub.subscribe(boardId, {
      send(data) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      },
    });

    sendMessage(ws, { type: "welcome", boardId, clients: hub.count(boardId) });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        sendMessage(ws, {
          type: "error",
          code: "BINARY_NOT_SUPPORTED",
          message: "Yalnız metin mesajı gönderilebilir.",
        });
        return;
      }

      let json: unknown;

      try {
        json = JSON.parse(data.toString());
      } catch {
        sendMessage(ws, {
          type: "error",
          code: "INVALID_JSON",
          message: "Mesaj geçerli bir JSON değil.",
        });
        return;
      }

      const parsed = ClientMessageSchema.safeParse(json);

      if (!parsed.success) {
        sendMessage(ws, {
          type: "error",
          code: "INVALID_MESSAGE",
          message: "Bilinmeyen mesaj.",
        });
        return;
      }

      switch (parsed.data.type) {
        case "ping":
          sendMessage(ws, { type: "pong" });
          break;
        default:
          assertNever(parsed.data.type);
      }
    });

    ws.on("close", unsubscribe);
    ws.on("error", (error) => {
      console.error("WebSocket hatası:", error.message);
    });
  }

  return {
    resync() {
      for (const client of wss.clients) {
        client.close(1012, "Yeniden eşitleme");
      }
    },

    close() {
      clearInterval(heartbeat);

      for (const client of wss.clients) {
        client.close(1001, "Sunucu kapanıyor");
      }
    },
  };
}
