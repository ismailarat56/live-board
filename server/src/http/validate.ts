import {
  isCardStatus,
  type MoveCardInput,
  type NewCardInput,
} from "../domain/card.ts";
import { AppError } from "./app-error.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw new AppError(400, "INVALID_BODY", "Gövde bir JSON nesnesi olmalı.");
  }

  return body;
}

export function parseId(raw: string, name: string): number {
  const id = Number(raw);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "INVALID_ID", `${name} pozitif bir tam sayı olmalı.`);
  }

  return id;
}

export function parseNewCard(body: unknown): NewCardInput {
  const { title, description, status } = requireRecord(body);

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.length > 200
  ) {
    throw new AppError(422, "INVALID_TITLE", "Başlık 1-200 karakter olmalı.");
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new AppError(422, "INVALID_DESCRIPTION", "Açıklama metin olmalı.");
  }

  if (status !== undefined && !isCardStatus(status)) {
    throw new AppError(422, "INVALID_STATUS", "Durum todo, doing veya done olmalı.");
  }

  return {
    title: title.trim(),
    description: description ?? null,
    status: status ?? "todo",
  };
}

export function parseMoveCard(body: unknown): MoveCardInput {
  const { status, position } = requireRecord(body);

  if (!isCardStatus(status)) {
    throw new AppError(422, "INVALID_STATUS", "Durum todo, doing veya done olmalı.");
  }

  if (typeof position !== "number" || !Number.isInteger(position)) {
    throw new AppError(422, "INVALID_POSITION", "Pozisyon bir tam sayı olmalı.");
  }

  return { status, position };
}
