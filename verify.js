// Live checks for the public steps. Only the visitor's transparent address is sent, and only to
// Zender's own /api/check, which asks a Zcash light server. The letter never leaves the page.

const PUBLIC = {
  main: /^t1[1-9A-HJ-NP-Za-km-z]{33}$/,
  test: /^tm[1-9A-HJ-NP-Za-km-z]{33}$/,
};

// What each watched step needs to see on the public address.
// arrive: anything has landed. shield: it has all left again. back: something new landed after the shield.
export const CHECKS = {
  // arrive: coins are sitting on the address.
  arrive: { done: "Coins arrived", ok: (s) => s.balanceZat > 0 },
  // shield: the address emptied after the coins arrived (`after` = its tx count when they arrived).
  shield: { done: "Shielded", ok: (s, after = 1) => s.balanceZat === 0 && s.txCount > after },
  // back: something new landed after the shield (`after` = tx count at shield; unknown means any arrival counts).
  back: { done: "Back to public", ok: (s, after) => s.balanceZat > 0 && (after === undefined || s.txCount > after) },
};

export function isPublicAddress(value, net) {
  return PUBLIC[net].test(value);
}

export async function check(address, net) {
  const r = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, network: net }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Could not check right now.");
  return data;
}

export function zec(zat) {
  return (zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

// The latest block, for the "network online" line.
export async function tip(net) {
  const r = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ network: net, tip: true }),
  });
  if (!r.ok) throw new Error("offline");
  return (await r.json()).height;
}
