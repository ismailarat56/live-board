import type { Card, CardStatus, MoveCardInput } from "./card.ts";

function byPosition(a: Card, b: Card): number {
  return a.position - b.position;
}

function renumber(column: readonly Card[]): Card[] {
  return column.map((card, index) => ({ ...card, position: index }));
}

export function moveCard(
  cards: readonly Card[],
  cardId: number,
  target: MoveCardInput
): Card[] | null {
  const moving = cards.find((card) => card.id === cardId);

  if (moving === undefined) {
    return null;
  }

  const rest = cards.filter((card) => card.id !== cardId);

  const inColumn = (card: Card, status: CardStatus): boolean =>
    card.boardId === moving.boardId && card.status === status;

  const targetColumn = rest
    .filter((card) => inColumn(card, target.status))
    .toSorted(byPosition);

  const position = Math.min(
    Math.max(target.position, 0),
    targetColumn.length
  );

  const movedColumn = targetColumn.toSpliced(position, 0, {
    ...moving,
    status: target.status,
  });

  const sourceColumn =
    moving.status === target.status
      ? []
      : rest
          .filter((card) => inColumn(card, moving.status))
          .toSorted(byPosition);

  const untouched = rest.filter(
    (card) =>
      !inColumn(card, target.status) && !inColumn(card, moving.status)
  );

  return [...untouched, ...renumber(sourceColumn), ...renumber(movedColumn)];
}

export function removeCard(cards: readonly Card[], cardId: number): Card[] | null {
  const removed = cards.find((card) => card.id === cardId);

  if (removed === undefined) {
    return null;
  }

  const rest = cards.filter((card) => card.id !== cardId);

  const inColumn = (card: Card): boolean =>
    card.boardId === removed.boardId && card.status === removed.status;

  const column = rest.filter(inColumn).toSorted(byPosition);

  return [...rest.filter((card) => !inColumn(card)), ...renumber(column)];
}
