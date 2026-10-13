type Card = {
	title: string;
	points: number;
};

const cards: Card[] = [
	{ title: 'Tasarımı çiz', points: 3 },
	{ title: "API'yi yaz", points: 5 },
];

function totalPoints(items: Card[]): number {
	let total = 0;

	for (const card of items) {
		total += card.points;
	}

	return total;
}

console.log(totalPoints(cards));
