import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { PresenceStore } from "./presence.ts";

export const CONTRACT_TTL_MS = 300;

export function presenceContract(setup: () => Promise<PresenceStore>): void {
  test("üyeler: boş panoda kimse yok", async () => {
    const presence = await setup();

    assert.deepEqual(await presence.list(1), []);
  });

  test("üyeler: eklenen üye listede görünür", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });

    assert.deepEqual(await presence.list(1), [{ connectionId: "c1", name: "Ali" }]);
  });

  test("üyeler: aynı ad iki bağlantıda iki ayrı üyedir", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await presence.upsert(1, { connectionId: "c2", name: "Ali" });

    assert.equal((await presence.list(1)).length, 2);
  });

  test("üyeler: liste ada, aynı adda bağlantıya göre sıralıdır", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c2", name: "Ali" });
    await presence.upsert(1, { connectionId: "c3", name: "Zeynep" });
    await presence.upsert(1, { connectionId: "c1", name: "Ali" });

    assert.deepEqual(await presence.list(1), [
      { connectionId: "c1", name: "Ali" },
      { connectionId: "c2", name: "Ali" },
      { connectionId: "c3", name: "Zeynep" },
    ]);
  });

  test("üyeler: aynı bağlantı yeniden eklenince adı değişir, kopya oluşmaz", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await presence.upsert(1, { connectionId: "c1", name: "Ayşe" });

    assert.deepEqual(await presence.list(1), [{ connectionId: "c1", name: "Ayşe" }]);
  });

  test("üyeler: çıkarılan üye gider, diğerleri kalır", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await presence.upsert(1, { connectionId: "c2", name: "Ayşe" });
    await presence.remove(1, "c1");

    assert.deepEqual(await presence.list(1), [{ connectionId: "c2", name: "Ayşe" }]);
  });

  test("üyeler: olmayan üyeyi çıkarmak hata vermez", async () => {
    const presence = await setup();

    await presence.remove(1, "yok");
    await presence.remove(2, "yok");

    assert.deepEqual(await presence.list(1), []);
  });

  test("üyeler: panolar birbirinden ayrıdır", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await presence.upsert(2, { connectionId: "c2", name: "Ayşe" });
    await presence.remove(2, "c1");

    assert.deepEqual(await presence.list(1), [{ connectionId: "c1", name: "Ali" }]);
    assert.deepEqual(await presence.list(2), [{ connectionId: "c2", name: "Ayşe" }]);
  });

  test("üyeler: süresi dolan üye listeden düşer", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await sleep(CONTRACT_TTL_MS * 1.5);

    assert.deepEqual(await presence.list(1), []);
  });

  test("üyeler: yeniden eklemek süreyi baştan başlatır", async () => {
    const presence = await setup();

    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await sleep(CONTRACT_TTL_MS * 0.6);
    await presence.upsert(1, { connectionId: "c1", name: "Ali" });
    await sleep(CONTRACT_TTL_MS * 0.6);

    assert.equal((await presence.list(1)).length, 1, "tazelenen üye düşmemeli");

    await sleep(CONTRACT_TTL_MS);

    assert.deepEqual(await presence.list(1), [], "tazelenmeyen üye düşmeli");
  });
}
