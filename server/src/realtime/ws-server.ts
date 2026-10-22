import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import {
  assertNever,
  ClientMessageSchema,
  MemberNameSchema,
  type Member,
  type ServerMessage,
} from "@live-board/shared";
import { WebSocket, WebSocketServer } from "ws";
import type { BoardHub, EventPublisher } from "./hub.ts";
import { PRESENCE_REFRESH_MS, type PresenceStore } from "./presence.ts";

const DEFAULT_HEARTBEAT_MS = 30_000;

export interface WebSocketOptions {
  boardExists(boardId: number): Promise<boolean>;
  presence: PresenceStore;
  events: EventPublisher;
  heartbeatMs?: number;
  presenceRefreshMs?: number;
}

interface ConnectionRequest {
  boardId: number;
  name: string;
}

function reject(socket: Duplex, status: string): void {
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function readConnection(
  request: IncomingMessage
): ConnectionRequest | "not-found" | "bad-request" {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname !== "/ws") {
    return "not-found";
  }

  const boardId = Number(url.searchParams.get("boardId"));

  if (!Number.isInteger(boardId) || boardId < 1) {
    return "bad-request";
  }

  const name = MemberNameSchema.safeParse(url.searchParams.get("name"));

  if (!name.success) {
    return "bad-request";
  }

  return { boardId, name: name.data };
}

function sendMessage(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export interface WebSocketHandle {
  resync(): void;
  close(): Promise<void>;
}

export function attachWebSocket(
  server: Server,
  hub: BoardHub,
  options: WebSocketOptions
): WebSocketHandle {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const alive = new WeakSet<WebSocket>();
  const members = new Map<WebSocket, { boardId: number; member: Member }>();

  function announce(boardId: number, change: Promise<void>): Promise<void> {
    return change
      .then(() => options.events.publish(boardId, { type: "members_changed" }))
      .catch((error: unknown) => {
        console.error("Üye listesi güncellenemedi:", String(error));
      });
  }

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

  const refresh = setInterval(() => {
    for (const { boardId, member } of members.values()) {
      options.presence.upsert(boardId, member).catch((error: unknown) => {
        console.error("Üye tazelenemedi:", String(error));
      });
    }
  }, options.presenceRefreshMs ?? PRESENCE_REFRESH_MS);

  refresh.unref();
  server.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(refresh);
  });

  server.on("upgrade", (request, socket, head) => {
    const connection = readConnection(request);

    if (connection === "not-found") {
      reject(socket, "404 Not Found");
      return;
    }

    if (connection === "bad-request") {
      reject(socket, "400 Bad Request");
      return;
    }

    options
      .boardExists(connection.boardId)
      .then((exists) => {
        if (!exists) {
          reject(socket, "404 Not Found");
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          handleConnection(ws, connection);
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        reject(socket, "500 Internal Server Error");
      });
  });

  function handleConnection(ws: WebSocket, { boardId, name }: ConnectionRequest): void {
    alive.add(ws);
    ws.on("pong", () => alive.add(ws));

    const unsubscribe = hub.subscribe(boardId, {
      send(data) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      },
    });

    const member: Member = { connectionId: randomUUID(), name };

    members.set(ws, { boardId, member });
    announce(boardId, options.presence.upsert(boardId, member));
    sendMessage(ws, { type: "welcome", boardId, connectionId: member.connectionId });

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

    ws.on("close", () => {
      unsubscribe();

      if (members.delete(ws)) {
        announce(boardId, options.presence.remove(boardId, member.connectionId));
      }
    });
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

    async close() {
      clearInterval(heartbeat);
      clearInterval(refresh);

      const leaving = [...members.values()].map(({ boardId, member }) =>
        announce(boardId, options.presence.remove(boardId, member.connectionId))
      );

      members.clear();

      for (const client of wss.clients) {
        client.close(1001, "Sunucu kapanıyor");
      }

      await Promise.all(leaving);
    },
  };
}
