import { createMemoryStore } from "./memory-store.ts";
import { versionContract } from "./version-contract.ts";

versionContract(() => ({ store: createMemoryStore(), boardId: 1 }));
