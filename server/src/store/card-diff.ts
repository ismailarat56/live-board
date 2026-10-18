import type { Card } from "@live-board/shared";

export interface CardChanges {
  removed: number[];
  changed: Card[];
}

export function diffCards(before: readonly Card[], after: readonly Card[]): CardChanges {
  const previous = new Map(before.map((card) => [card.id, card]));
  const kept = new Set(after.map((card) => card.id));

  return {
    removed: before.filter((card) => !kept.has(card.id)).map((card) => card.id),
    changed: after.filter((card) => {
      const old = previous.get(card.id);

      return (
        old !== undefined &&
        (old.status !== card.status || old.position !== card.position)
      );
    }),
  };
}
