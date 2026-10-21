import { z } from "zod";
import { assertNever } from "./assert-never.ts";
import { CardSchema, CardStatusSchema, statusLabel, VersionSchema } from "./card.ts";

export const BoardEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("card_created"),
    card: CardSchema,
  }),
  z.object({
    type: z.literal("card_moved"),
    cardId: z.number().int().positive(),
    toStatus: CardStatusSchema,
    toPosition: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("card_updated"),
    cardId: z.number().int().positive(),
    title: z.string(),
    description: z.string().nullable(),
    version: VersionSchema,
  }),
  z.object({
    type: z.literal("card_deleted"),
    cardId: z.number().int().positive(),
  }),
]);

export type BoardEvent = z.infer<typeof BoardEventSchema>;

export function describeEvent(event: BoardEvent): string {
  switch (event.type) {
    case "card_created":
      return `Yeni kart: ${event.card.title}`;
    case "card_moved":
      return `Kart ${event.cardId} -> ${statusLabel(event.toStatus)}`;
    case "card_updated":
      return `Kart ${event.cardId} düzenlendi: ${event.title}`;
    case "card_deleted":
      return `Kart ${event.cardId} silindi`;
    default:
      return assertNever(event);
  }
}
