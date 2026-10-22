import { assertNever, fail, ok } from "@live-board/shared";
import express, { type ErrorRequestHandler, type Express } from "express";
import { AppError } from "./http/app-error.ts";
import {
  parseExpectedVersion,
  parseId,
  parseMoveCard,
  parseNewCard,
  parseUpdateCard,
} from "./http/validate.ts";
import { noopHub, type EventPublisher } from "./realtime/hub.ts";
import { createMemoryPresence } from "./realtime/memory-presence.ts";
import { PRESENCE_TTL_MS, type PresenceStore } from "./realtime/presence.ts";
import type { CardStore } from "./store/card-store.ts";

const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json(fail(error.code, error.message));
    return;
  }

  if (error instanceof SyntaxError) {
    response.status(400).json(fail("INVALID_JSON", "Gövde geçerli bir JSON değil."));
    return;
  }

  console.error(error);
  response.status(500).json(fail("INTERNAL_ERROR", "Beklenmeyen bir hata oluştu."));
};

function cardNotFound(): AppError {
  return new AppError(404, "CARD_NOT_FOUND", "Kart bulunamadı.");
}

function versionConflict(currentVersion: number): AppError {
  return new AppError(
    409,
    "VERSION_CONFLICT",
    `Kart bu arada değişti; güncel sürüm ${currentVersion}.`
  );
}

export function createApp(
  store: CardStore,
  events: EventPublisher = noopHub,
  presence: PresenceStore = createMemoryPresence(PRESENCE_TTL_MS)
): Express {
  const app = express();

  app.use(express.json({ limit: "20kb" }));

  app.get("/health", (_request, response) => {
    response.json(ok({ status: "up" }));
  });

  async function requireBoard(boardId: number): Promise<void> {
    const board = await store.findBoard(boardId);

    if (board === null) {
      throw new AppError(404, "BOARD_NOT_FOUND", "Pano bulunamadı.");
    }
  }

  app.get("/api/boards/:boardId/cards", async (request, response) => {
    const boardId = parseId(request.params.boardId, "boardId");
    await requireBoard(boardId);

    const cards = await store.listCards(boardId);

    response.json(ok(cards));
  });

  app.get("/api/boards/:boardId/members", async (request, response) => {
    const boardId = parseId(request.params.boardId, "boardId");
    await requireBoard(boardId);

    response.json(ok(await presence.list(boardId)));
  });

  app.post("/api/boards/:boardId/cards", async (request, response) => {
    const boardId = parseId(request.params.boardId, "boardId");
    await requireBoard(boardId);

    const card = await store.createCard(boardId, parseNewCard(request.body));

    events.publish(boardId, { type: "card_created", card });

    response.status(201).json(ok(card));
  });

  app.patch("/api/cards/:cardId/move", async (request, response) => {
    const cardId = parseId(request.params.cardId, "cardId");
    const cards = await store.move(cardId, parseMoveCard(request.body));

    if (cards === null) {
      throw cardNotFound();
    }

    const moved = cards.find((card) => card.id === cardId);

    if (moved !== undefined) {
      events.publish(moved.boardId, {
        type: "card_moved",
        cardId,
        toStatus: moved.status,
        toPosition: moved.position,
      });
    }

    response.json(ok(cards));
  });

  app.patch("/api/cards/:cardId", async (request, response) => {
    const cardId = parseId(request.params.cardId, "cardId");
    const { expectedVersion, ...input } = parseUpdateCard(request.body);
    const result = await store.updateCard(cardId, input, expectedVersion);

    switch (result.kind) {
      case "not_found":
        throw cardNotFound();
      case "conflict":
        throw versionConflict(result.currentVersion);
      case "updated": {
        const { card } = result;

        events.publish(card.boardId, {
          type: "card_updated",
          cardId,
          title: card.title,
          description: card.description,
          version: card.version,
        });

        response.json(ok(card));
        return;
      }
      default:
        assertNever(result);
    }
  });

  app.delete("/api/cards/:cardId", async (request, response) => {
    const cardId = parseId(request.params.cardId, "cardId");
    const expectedVersion = parseExpectedVersion(request.query.expectedVersion);
    const result = await store.deleteCard(cardId, expectedVersion);

    switch (result.kind) {
      case "not_found":
        throw cardNotFound();
      case "conflict":
        throw versionConflict(result.currentVersion);
      case "deleted":
        events.publish(result.boardId, { type: "card_deleted", cardId });
        response.status(204).end();
        return;
      default:
        assertNever(result);
    }
  });

  app.use((_request, response) => {
    response.status(404).json(fail("NOT_FOUND", "Adres bulunamadı."));
  });

  app.use(handleError);

  return app;
}
