import { CardStatusSchema, type Card } from "@live-board/shared";
import type { Pool } from "pg";
import { z } from "zod";
import type { Board } from "../domain/board.ts";
import { moveCard } from "../domain/move-card.ts";
import type { CardStore } from "./card-store.ts";

const CARD_COLUMNS =
  "id, board_id, title, description, status, position, created_at";

const CardRowSchema = z
  .object({
    id: z.number(),
    board_id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    status: CardStatusSchema,
    position: z.number(),
    created_at: z.date(),
  })
  .transform(
    (row): Card => ({
      id: row.id,
      boardId: row.board_id,
      title: row.title,
      description: row.description,
      status: row.status,
      position: row.position,
      createdAt: row.created_at.toISOString(),
    })
  );

function toCard(row: unknown): Card {
  return CardRowSchema.parse(row);
}

export function createPgStore(pool: Pool): CardStore {
  async function listCards(boardId: number): Promise<Card[]> {
    const result = await pool.query(
      `SELECT ${CARD_COLUMNS}
         FROM cards
        WHERE board_id = $1
        ORDER BY array_position(ARRAY['todo', 'doing', 'done'], status), position`,
      [boardId]
    );

    return result.rows.map(toCard);
  }

  return {
    async findBoard(boardId) {
      const result = await pool.query<Board>(
        "SELECT id, name FROM boards WHERE id = $1",
        [boardId]
      );

      return result.rows[0] ?? null;
    },

    listCards,

    async createCard(boardId, input) {
      const result = await pool.query(
        `INSERT INTO cards (board_id, title, description, status, position)
         VALUES ($1, $2, $3, $4,
           (SELECT count(*) FROM cards WHERE board_id = $1 AND status = $4))
         RETURNING ${CARD_COLUMNS}`,
        [boardId, input.title, input.description, input.status]
      );

      const row = result.rows[0];

      if (row === undefined) {
        throw new Error("INSERT satır döndürmedi.");
      }

      return toCard(row);
    },

    async move(cardId, target) {
      const client = await pool.connect();
      let boardId: number;

      try {
        await client.query("BEGIN");

        const found = await client.query<{ board_id: number }>(
          "SELECT board_id FROM cards WHERE id = $1",
          [cardId]
        );
        const foundBoardId = found.rows[0]?.board_id;

        if (foundBoardId === undefined) {
          await client.query("ROLLBACK");
          return null;
        }

        boardId = foundBoardId;

        const current = await client.query(
          `SELECT ${CARD_COLUMNS} FROM cards WHERE board_id = $1 FOR UPDATE`,
          [boardId]
        );
        const next = moveCard(current.rows.map(toCard), cardId, target);

        if (next === null) {
          await client.query("ROLLBACK");
          return null;
        }

        for (const card of next) {
          await client.query(
            "UPDATE cards SET status = $1, position = $2 WHERE id = $3",
            [card.status, card.position, card.id]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return listCards(boardId);
    },
  };
}
