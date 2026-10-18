import { CARD_STATUSES, moveCard, removeCard, type Card } from "@live-board/shared";
import type { Board } from '../domain/board.ts';
import type { CardStore } from './card-store.ts';

export function createMemoryStore(): CardStore {
	const boards: Board[] = [{ id: 1, name: 'Live Board' }];
	let cards: Card[] = [];
	let nextCardId = 1;

	function columnIndex(card: Card): number {
		return CARD_STATUSES.indexOf(card.status);
	}

	function sortedCards(boardId: number): Card[] {
		return cards
			.filter((card) => card.boardId === boardId)
			.toSorted((a, b) => columnIndex(a) - columnIndex(b) || a.position - b.position);
	}

	return {
		async findBoard(boardId) {
			return boards.find((board) => board.id === boardId) ?? null;
		},

		async listCards(boardId) {
			return sortedCards(boardId);
		},

		async createCard(boardId, input) {
			const position = cards.filter(
				(card) => card.boardId === boardId && card.status === input.status
			).length;

			const card: Card = {
				...input,
				id: nextCardId,
				boardId,
				position,
				createdAt: new Date().toISOString(),
			};

			nextCardId += 1;
			cards = [...cards, card];

			return card;
		},

		async move(cardId, target) {
			const boardId = cards.find((card) => card.id === cardId)?.boardId;
			const next = moveCard(cards, cardId, target);

			if (next === null || boardId === undefined) {
				return null;
			}

			cards = next;

			return sortedCards(boardId);
		},

		async updateCard(cardId, input) {
			const current = cards.find((card) => card.id === cardId);

			if (current === undefined) {
				return null;
			}

			const updated: Card = {
				...current,
				title: input.title ?? current.title,
				description:
					input.description === undefined ? current.description : input.description,
			};

			cards = cards.map((card) => (card.id === cardId ? updated : card));

			return updated;
		},

		async deleteCard(cardId) {
			const boardId = cards.find((card) => card.id === cardId)?.boardId;
			const next = removeCard(cards, cardId);

			if (next === null || boardId === undefined) {
				return null;
			}

			cards = next;

			return { boardId };
		},
	};
}
