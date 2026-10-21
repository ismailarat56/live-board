import type { Card, CardStatus } from "@live-board/shared";

const title: string = "Testleri yaz";
const position: number = 0;
const isArchived: boolean = false;

const tags: string[] = ["backend", "acil"];
const range: [number, number] = [0, 10];

let status: CardStatus = "todo";
status = "doing";

const card: Card = {
  id: 1,
  boardId: 1,
  title,
  description: null,
  status,
  position,
  version: 1,
  createdAt: new Date().toISOString(),
};

type Assignee = {
  name: string;
  email?: string;
};

const assignee: Assignee = { name: "Ayşe" };

function readEmail(person: Assignee): string {
  return person.email ?? "e-posta yok";
}

const fromServer: unknown = JSON.parse('{"title":"Sunucudan"}');

console.log(title, isArchived, tags, range, card);
console.log(readEmail(assignee), fromServer);
