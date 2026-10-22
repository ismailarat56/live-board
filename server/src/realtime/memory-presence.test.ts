import { createMemoryPresence } from "./memory-presence.ts";
import { CONTRACT_TTL_MS, presenceContract } from "./presence-contract.ts";

presenceContract(async () => createMemoryPresence(CONTRACT_TTL_MS));
