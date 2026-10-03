import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.fetch ??= () => {};
const { CHECKS, isPublicAddress, zec } = await import("../verify.js");

test("arrive needs coins sitting on the address", () => {
  assert.equal(CHECKS.arrive.ok({ txCount: 0, balanceZat: 0 }), false);
  assert.equal(CHECKS.arrive.ok({ txCount: 4, balanceZat: 0 }), false); // old history alone isn't enough
  assert.equal(CHECKS.arrive.ok({ txCount: 1, balanceZat: 1000000 }), true);
});

test("shield needs the address to empty after the coins arrived", () => {
  assert.equal(CHECKS.shield.ok({ txCount: 1, balanceZat: 1000000 }, 1), false);
  assert.equal(CHECKS.shield.ok({ txCount: 2, balanceZat: 0 }, 2), false); // reused address, nothing new
  assert.equal(CHECKS.shield.ok({ txCount: 3, balanceZat: 0 }, 2), true);
});

test("back needs a new arrival after the shield", () => {
  assert.equal(CHECKS.back.ok({ txCount: 2, balanceZat: 0 }, 2), false);
  assert.equal(CHECKS.back.ok({ txCount: 3, balanceZat: 50000 }, 2), true);
  // Swap users or a fresh address: no shield record, any arrival counts.
  assert.equal(CHECKS.back.ok({ txCount: 1, balanceZat: 50000 }), true);
});

test("addresses match their network", () => {
  assert.equal(isPublicAddress("tmXSUshm89ekQj4BVYgUX72zJRpj2Bmk43M", "test"), true);
  assert.equal(isPublicAddress("tmXSUshm89ekQj4BVYgUX72zJRpj2Bmk43M", "main"), false);
  assert.equal(zec(150000000), "1.5");
});
