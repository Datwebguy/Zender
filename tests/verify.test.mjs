import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.fetch ??= () => {};
const { CHECKS, isPublicAddress, zec } = await import("../verify.js");

test("step 2 passes once coins land", () => {
  assert.equal(CHECKS[2].ok({ txCount: 0, balanceZat: 0 }), false);
  assert.equal(CHECKS[2].ok({ txCount: 1, balanceZat: 1000000 }), true);
});

test("step 3 passes once the public address empties", () => {
  assert.equal(CHECKS[3].ok({ txCount: 1, balanceZat: 1000000 }), false);
  assert.equal(CHECKS[3].ok({ txCount: 2, balanceZat: 0 }), true);
});

test("step 6 needs a new transaction after the shield", () => {
  assert.equal(CHECKS[6].ok({ txCount: 2, balanceZat: 0 }, 2), false);
  assert.equal(CHECKS[6].ok({ txCount: 3, balanceZat: 50000 }, 2), true);
  // Swap users skip 2 and 3, so their address starts empty.
  assert.equal(CHECKS[6].ok({ txCount: 1, balanceZat: 50000 }, 0), true);
});

test("addresses match their network", () => {
  assert.equal(isPublicAddress("tmXSUshm89ekQj4BVYgUX72zJRpj2Bmk43M", "test"), true);
  assert.equal(isPublicAddress("tmXSUshm89ekQj4BVYgUX72zJRpj2Bmk43M", "main"), false);
  assert.equal(zec(150000000), "1.5");
});
