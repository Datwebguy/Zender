// Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MEMO_BYTES,
  utf8Bytes,
  encodeMemo,
  bech32Polymod,
  bech32mHrp,
  isUnifiedAddress,
  buildUri,
} from "../zip321.js";

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function hrpExpand(hrp) {
  return [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)];
}

// Builds a string with a valid Bech32m checksum. Not a real address: tests only.
function fakeBech32m(hrp, length) {
  const data = Array.from({ length }, (_, i) => (i * 7 + 3) % 32);
  const mod = bech32Polymod([...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ 0x2bc830a3;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return `${hrp}1${[...data, ...checksum].map((v) => CHARSET[v]).join("")}`;
}

const TEST_UA = fakeBech32m("u", 180);

test("memo encodes as base64url without padding", () => {
  assert.equal(encodeMemo("Hello from Zender"), "SGVsbG8gZnJvbSBaZW5kZXI");
  assert.equal(encodeMemo("a"), "YQ");
  assert.equal(encodeMemo("ÿþ"), "w7_Dvg");
  assert.doesNotMatch(encodeMemo("any length?"), /[=+/]/);
});

test("byte count is UTF-8 bytes, not characters", () => {
  assert.equal(utf8Bytes("abc").length, 3);
  assert.equal(utf8Bytes("é").length, 2);
  assert.equal(utf8Bytes("🛡️").length, 7);
});

test("512 bytes passes, 513 fails", () => {
  assert.ok(encodeMemo("x".repeat(MAX_MEMO_BYTES)));
  assert.throws(() => encodeMemo("x".repeat(MAX_MEMO_BYTES + 1)), RangeError);
  assert.throws(() => encodeMemo("é".repeat(257)), RangeError);
});

test("Bech32m checksum matches BIP 350 vectors", () => {
  assert.equal(bech32mHrp("a1lqfn3a"), "a");
  assert.equal(bech32mHrp("abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx"), "abcdef");
  // Valid Bech32 (not m) must fail.
  assert.equal(bech32mHrp("a12uel5l"), null);
});

test("only mainnet unified addresses pass", () => {
  assert.ok(isUnifiedAddress(TEST_UA));
  assert.equal(isUnifiedAddress(fakeBech32m("utest", 180)), false, "testnet utest1");
  assert.equal(isUnifiedAddress(fakeBech32m("zs", 70)), false, "Sapling");
  assert.equal(isUnifiedAddress("t1bsR1XZCkAbcdefghijkLXZqx9e4PW"), false, "transparent");
  assert.equal(isUnifiedAddress(TEST_UA.slice(0, -1) + (TEST_UA.endsWith("q") ? "p" : "q")), false, "bad checksum");
  assert.equal(isUnifiedAddress(TEST_UA.toUpperCase()), false, "uppercase");
  assert.equal(isUnifiedAddress(""), false);
});

test("URI has address, fixed amount, memo, message", () => {
  const uri = buildUri({ address: TEST_UA, amount: "0.001", memo: "Hello from Zender", message: "Zender" });
  assert.equal(uri, `zcash:${TEST_UA}?amount=0.001&memo=SGVsbG8gZnJvbSBaZW5kZXI&message=Zender`);

  const parsed = new URL(uri);
  assert.equal(parsed.protocol, "zcash:");
  assert.equal(parsed.pathname, TEST_UA);
  assert.equal(parsed.searchParams.get("amount"), "0.001");
  const memo = parsed.searchParams.get("memo").replace(/-/g, "+").replace(/_/g, "/");
  assert.equal(Buffer.from(memo, "base64").toString("utf8"), "Hello from Zender");
  assert.equal(parsed.searchParams.get("message"), "Zender");
  assert.equal(parsed.searchParams.has("fee"), false);
});

test("URI refuses a non-unified address", () => {
  assert.throws(() => buildUri({ address: fakeBech32m("utest", 180), amount: "0.001", memo: "x" }));
  assert.throws(() => buildUri({ address: "", amount: "0.001", memo: "x" }));
});
