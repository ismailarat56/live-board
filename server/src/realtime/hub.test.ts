import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BoardEvent } from "@live-board/shared";
import { createHub, type Subscriber } from "./hub.ts";

function recorder(): Subscriber & { received: unknown[] } {
  const received: unknown[] = [];

  return {
    received,
    send(data) {
      received.push(JSON.parse(data));
    },
  };
}

const event: BoardEvent = { type: "card_deleted", cardId: 7 };

describe("createHub", () => {
  it("olayı aynı panonun bütün abonelerine yollar", () => {
    const hub = createHub();
    const first = recorder();
    const second = recorder();

    hub.subscribe(1, first);
    hub.subscribe(1, second);
    hub.publish(1, event);

    assert.deepEqual(first.received, [{ type: "event", event }]);
    assert.deepEqual(second.received, [{ type: "event", event }]);
  });

  it("başka panonun abonesine yollamaz", () => {
    const hub = createHub();
    const other = recorder();

    hub.subscribe(2, other);
    hub.publish(1, event);

    assert.deepEqual(other.received, []);
  });

  it("abonelikten çıkan artık almaz ve sayı düşer", () => {
    const hub = createHub();
    const leaving = recorder();
    const staying = recorder();

    const unsubscribe = hub.subscribe(1, leaving);
    hub.subscribe(1, staying);
    assert.equal(hub.count(1), 2);

    unsubscribe();
    hub.publish(1, event);

    assert.equal(hub.count(1), 1);
    assert.deepEqual(leaving.received, []);
    assert.equal(staying.received.length, 1);
  });

  it("aboneye gönderme hata verirse diğerleri yine alır", () => {
    const hub = createHub();
    const broken: Subscriber = {
      send() {
        throw new Error("soket kapalı");
      },
    };
    const healthy = recorder();

    hub.subscribe(1, broken);
    hub.subscribe(1, healthy);

    const originalError = console.error;
    console.error = () => {};

    try {
      hub.publish(1, event);
    } finally {
      console.error = originalError;
    }

    assert.equal(healthy.received.length, 1);
  });

  it("abonesi olmayan panoya yayın sessizce geçer", () => {
    const hub = createHub();

    assert.doesNotThrow(() => hub.publish(5, event));
    assert.equal(hub.count(5), 0);
  });
});
