import express, { type ErrorRequestHandler, type Express } from "express";
import { fail, ok } from "./http/api-response.ts";
import { AppError } from "./http/app-error.ts";
import { parseId, parseMoveCard, parseNewCard } from "./http/validate.ts";
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

export function createApp(store: CardStore): Express {
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

  app.post("/api/boards/:boardId/cards", async (request, response) => {
    const boardId = parseId(request.params.boardId, "boardId");
    await requireBoard(boardId);

    const card = await store.createCard(boardId, parseNewCard(request.body));

    response.status(201).json(ok(card));
  });

  app.patch("/api/cards/:cardId/move", async (request, response) => {
    const cardId = parseId(request.params.cardId, "cardId");
    const cards = await store.move(cardId, parseMoveCard(request.body));

    if (cards === null) {
      throw new AppError(404, "CARD_NOT_FOUND", "Kart bulunamadı.");
    }

    response.json(ok(cards));
  });

  app.use((_request, response) => {
    response.status(404).json(fail("NOT_FOUND", "Adres bulunamadı."));
  });

  app.use(handleError);

  return app;
}
