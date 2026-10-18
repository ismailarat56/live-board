import { CardStatusSchema, moveCard, removeCard, type Card } from "@live-board/shared";
import type { Pool } from "pg";
import { z } from "zod";
import type { Board } from "../domain/board.ts";
import { diffCards } from "./card-diff.ts";
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

const BoardRowSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const BoardIdRowSchema = z.object({
  board_id: z.number(),
});

function toCard(row: unknown): Card {
  return CardRowSchema.parse(row);
}

function toBoard(row: unknown): Board {
  return BoardRowSchema.parse(row);
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

  async function changeBoard(
    cardId: number,
    change: (cards: Card[]) => Card[] | null
  ): Promise<number | null> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const found = await client.query(
        "SELECT board_id FROM cards WHERE id = $1",
        [cardId]
      );
      const row = found.rows[0];

      if (row === undefined) {
        await client.query("ROLLBACK");
        return null;
      }

      const boardId = BoardIdRowSchema.parse(row).board_id;
      const current = await client.query(
        `SELECT ${CARD_COLUMNS} FROM cards WHERE board_id = $1 FOR UPDATE`,
        [boardId]
      );
      const before = current.rows.map(toCard);
      const after = change(before);

      if (after === null) {
        await client.query("ROLLBACK");
        return null;
      }

      const { removed, changed } = diffCards(before, after);

      for (const id of removed) {
        await client.query("DELETE FROM cards WHERE id = $1", [id]);
      }

      for (const card of changed) {
        await client.query(
          "UPDATE cards SET status = $1, position = $2 WHERE id = $3",
          [card.status, card.position, card.id]
        );
      }

      await client.query("COMMIT");

      return boardId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    async findBoard(boardId) {
      const result = await pool.query(
        "SELECT id, name FROM boards WHERE id = $1",
        [boardId]
      );

      const row = result.rows[0];

      return row === undefined ? null : toBoard(row);
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
      const boardId = await changeBoard(cardId, (cards) =>
        moveCard(cards, cardId, target)
      );

      return boardId === null ? null : listCards(boardId);
    },

    async updateCard(cardId, input) {
      const result = await pool.query(
        `UPDATE cards
            SET title = CASE WHEN $2 THEN $3 ELSE title END,
                description = CASE WHEN $4 THEN $5 ELSE description END
          WHERE id = $1
          RETURNING ${CARD_COLUMNS}`,
        [
          cardId,
          input.title !== undefined,
          input.title ?? null,
          input.description !== undefined,
          input.description ?? null,
        ]
      );
      const row = result.rows[0];

      return row === undefined ? null : toCard(row);
    },

    async deleteCard(cardId) {
      const boardId = await changeBoard(cardId, (cards) => removeCard(cards, cardId));

      return boardId === null ? null : { boardId };
    },
  };
}
