// Live checks for the public steps. Only the visitor's transparent address is sent, and only to
// Zender's own /api/check, which asks a Zcash light server. The letter never leaves the page.

const PUBLIC = {
  main: /^t1[1-9A-HJ-NP-Za-km-z]{33}$/,
  test: /^tm[1-9A-HJ-NP-Za-km-z]{33}$/,
};

// What each checkable step needs to see on chain.
export const CHECKS = {
  2: { done: "ZEC arrived", ok: (s) => s.txCount >= 1 || s.balanceZat > 0 },
  3: { done: "Shielded", ok: (s) => s.txCount >= 2 && (s.balanceZat === 0 || s.txCount >= 3) },
  6: { done: "Back on postcard", ok: (s) => s.txCount >= 3 && s.balanceZat > 0 },
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
