import { z } from "zod";
import { BoardEventSchema } from "./board-events.ts";

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("welcome"),
    boardId: z.number().int().positive(),
    clients: z.number().int().positive(),
  }),
  z.object({ type: z.literal("event"), event: BoardEventSchema }),
  z.object({ type: z.literal("pong") }),
  z.object({
    type: z.literal("error"),
    code: z.string(),
    message: z.string(),
  }),
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
