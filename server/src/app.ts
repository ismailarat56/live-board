import express, { type ErrorRequestHandler } from "express";
import { fail, ok } from "./http/api-response.ts";
import { AppError } from "./http/app-error.ts";
import { parseId, parseMoveCard, parseNewCard } from "./http/validate.ts";
import { createMemoryStore } from "./store/memory-store.ts";

export const app = express();
const store = createMemoryStore();

app.use(express.json({ limit: "20kb" }));

app.get("/health", (_request, response) => {
  response.json(ok({ status: "up" }));
});

function requireBoard(boardId: number): void {
  if (store.findBoard(boardId) === null) {
    throw new AppError(404, "BOARD_NOT_FOUND", "Pano bulunamadı.");
  }
}

app.get("/api/boards/:boardId/cards", (request, response) => {
  const boardId = parseId(request.params.boardId, "boardId");
  requireBoard(boardId);

  response.json(ok(store.listCards(boardId)));
});

app.post("/api/boards/:boardId/cards", (request, response) => {
  const boardId = parseId(request.params.boardId, "boardId");
  requireBoard(boardId);

  const card = store.createCard(boardId, parseNewCard(request.body));

  response.status(201).json(ok(card));
});

app.patch("/api/cards/:cardId/move", (request, response) => {
  const cardId = parseId(request.params.cardId, "cardId");
  const cards = store.move(cardId, parseMoveCard(request.body));

  if (cards === null) {
    throw new AppError(404, "CARD_NOT_FOUND", "Kart bulunamadı.");
  }

  response.json(ok(cards));
});

app.use((_request, response) => {
  response.status(404).json(fail("NOT_FOUND", "Adres bulunamadı."));
});

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

app.use(handleError);
