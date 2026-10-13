import { describeEvent, type BoardEvent } from '../src/domain/board-events.ts';
import { isCardStatus, statusLabel } from '../src/domain/card.ts';

function formatPosition(value: number | string): string {
	if (typeof value === 'number') {
		return `#${value + 1}`;
	}

	return value.trim();
}

function shortTitle(title: string, maxLength = 20): string {
	return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;
}

const fromForm: unknown = 'doing';

if (isCardStatus(fromForm)) {
	console.log(statusLabel(fromForm));
}

const events: BoardEvent[] = [
	{ type: 'card_moved', cardId: 7, toStatus: 'done', toPosition: 0 },
	{ type: 'card_deleted', cardId: 9 },
];

for (const event of events) {
	console.log(describeEvent(event));
}

console.log(formatPosition(0), formatPosition('  ilk  '));
console.log(shortTitle('Giriş sayfasının tasarımını bitir'));
