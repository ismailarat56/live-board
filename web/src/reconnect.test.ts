import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconnectDelay } from "./reconnect.ts";

describe("reconnectDelay", () => {
  it("her başarısız denemede üst sınırı ikiye katlar", () => {
    const highest = () => 1;

    assert.deepEqual(
      [0, 1, 2, 3, 4].map((failures) => reconnectDelay(failures, highest)),
      [1_000, 2_000, 4_000, 8_000, 16_000]
    );
  });

  it("en kısa bekleme üst sınırın yarısıdır", () => {
    assert.equal(reconnectDelay(3, () => 0), 4_000);
  });

  it("30 saniyeyi hiç geçmez", () => {
    assert.equal(reconnectDelay(5, () => 1), 30_000);
    assert.equal(reconnectDelay(5_000, () => 1), 30_000);
  });

  it("aynı denemede farklı istemciler farklı süre bekler", () => {
    assert.notEqual(reconnectDelay(2, () => 0.1), reconnectDelay(2, () => 0.9));
  });
});
