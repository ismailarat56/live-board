import { z } from "zod";
import { assertNever } from "./assert-never.ts";

export const CardStatusSchema = z.enum(["todo", "doing", "done"]);

export type CardStatus = z.infer<typeof CardStatusSchema>;

export const CARD_STATUSES: readonly CardStatus[] = CardStatusSchema.options;

export const CardSchema = z.object({
  id: z.number().int().positive(),
  boardId: z.number().int().positive(),
  title: z.string(),
  description: z.string().nullable(),
  status: CardStatusSchema,
  position: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

export type Card = z.infer<typeof CardSchema>;

const TitleSchema = z
  .string()
  .trim()
  .min(1, { error: "Başlık boş olamaz." })
  .max(200, { error: "Başlık en fazla 200 karakter olabilir." });

export const NewCardSchema = z.object({
  title: TitleSchema,
  description: z.string().nullable().default(null),
  status: CardStatusSchema.default("todo"),
});

export type NewCardInput = z.output<typeof NewCardSchema>;

export const UpdateCardSchema = z.strictObject({
  title: TitleSchema.optional(),
  description: z.string().nullable().optional(),
});

export type UpdateCardInput = z.output<typeof UpdateCardSchema>;

export const MoveCardSchema = z.object({
  status: CardStatusSchema,
  position: z.number().int(),
});

export type MoveCardInput = z.infer<typeof MoveCardSchema>;

export function isCardStatus(value: unknown): value is CardStatus {
  return CardStatusSchema.safeParse(value).success;
}

export function statusLabel(status: CardStatus): string {
  switch (status) {
    case "todo":
      return "Yapılacak";
    case "doing":
      return "Yapılıyor";
    case "done":
      return "Bitti";
    default:
      return assertNever(status);
  }
}
