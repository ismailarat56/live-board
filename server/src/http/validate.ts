import {
  MoveCardSchema,
  NewCardSchema,
  type MoveCardInput,
  type NewCardInput,
} from "@live-board/shared";
import type { z } from "zod";
import { AppError } from "./app-error.ts";

interface FieldError {
  code: string;
  message: string;
}

const FIELD_ERRORS: Record<string, FieldError> = {
  title: { code: "INVALID_TITLE", message: "Başlık 1-200 karakter olmalı." },
  description: { code: "INVALID_DESCRIPTION", message: "Açıklama metin olmalı." },
  status: { code: "INVALID_STATUS", message: "Durum todo, doing veya done olmalı." },
  position: { code: "INVALID_POSITION", message: "Pozisyon bir tam sayı olmalı." },
};

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (result.success) {
    return result.data;
  }

  const field = result.error.issues[0]?.path[0];
  const fieldError = typeof field === "string" ? FIELD_ERRORS[field] : undefined;

  if (fieldError === undefined) {
    throw new AppError(400, "INVALID_BODY", "Gövde bir JSON nesnesi olmalı.");
  }

  throw new AppError(422, fieldError.code, fieldError.message);
}

export function parseId(raw: string, name: string): number {
  const id = Number(raw);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "INVALID_ID", `${name} pozitif bir tam sayı olmalı.`);
  }

  return id;
}

export function parseNewCard(body: unknown): NewCardInput {
  return parseBody(NewCardSchema, body);
}

export function parseMoveCard(body: unknown): MoveCardInput {
  return parseBody(MoveCardSchema, body);
}
