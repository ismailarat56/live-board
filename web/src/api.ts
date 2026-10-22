import {
  apiResponseSchema,
  CardSchema,
  MembersSchema,
  type Card,
  type Member,
  type MoveCardInput,
  type NewCardInput,
  type UpdateCardInput,
} from "@live-board/shared";
import { z } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json" },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Sunucuya ulaşılamadı.");
  }

  if (response.status === 204) {
    const empty = dataSchema.safeParse(undefined);

    if (empty.success) {
      return empty.data;
    }

    throw new ApiError(204, "UNEXPECTED_RESPONSE", "Sunucu boş bir yanıt döndü.");
  }

  const json: unknown = await response.json().catch(() => null);
  const parsed = apiResponseSchema(dataSchema).safeParse(json);

  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    throw new ApiError(
      response.status,
      "UNEXPECTED_RESPONSE",
      `Sunucudan beklenmeyen bir yanıt geldi (HTTP ${response.status}).`
    );
  }

  const body = parsed.data;

  if (!body.success) {
    throw new ApiError(response.status, body.error.code, body.error.message);
  }

  return body.data;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Beklenmeyen bir hata oluştu.";
}

export function isVersionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === "VERSION_CONFLICT";
}

const HealthSchema = z.object({ status: z.string() });

export function getHealth(): Promise<{ status: string }> {
  return request("/health", HealthSchema);
}

export function listCards(boardId: number): Promise<Card[]> {
  return request(`/api/boards/${boardId}/cards`, CardSchema.array());
}

export function createCard(boardId: number, input: NewCardInput): Promise<Card> {
  return request(`/api/boards/${boardId}/cards`, CardSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function moveCard(cardId: number, input: MoveCardInput): Promise<Card[]> {
  return request(`/api/cards/${cardId}/move`, CardSchema.array(), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateCard(
  cardId: number,
  input: UpdateCardInput,
  expectedVersion: number
): Promise<Card> {
  return request(`/api/cards/${cardId}`, CardSchema, {
    method: "PATCH",
    body: JSON.stringify({ ...input, expectedVersion }),
  });
}

export function deleteCard(cardId: number, expectedVersion: number): Promise<void> {
  return request(`/api/cards/${cardId}?expectedVersion=${expectedVersion}`, z.void(), {
    method: "DELETE",
  });
}

export function listMembers(boardId: number): Promise<Member[]> {
  return request(`/api/boards/${boardId}/members`, MembersSchema);
}
