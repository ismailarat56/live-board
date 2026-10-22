import { MemberNameSchema } from "@live-board/shared";

const STORAGE_KEY = "live-board:name";

function guestName(): string {
  return `Misafir ${Math.floor(100 + Math.random() * 900)}`;
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    console.warn("Ad tarayıcıya kaydedilemedi; bu sekmede geçerli.");
  }
}

export function loadName(): string {
  let saved: string | null = null;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }

  const parsed = MemberNameSchema.safeParse(saved);

  if (parsed.success) {
    return parsed.data;
  }

  const name = guestName();
  saveName(name);

  return name;
}
