// Free test ZEC from fauzec.com, the public Zcash testnet faucet, without leaving Zender.
// Testnet only. Holds no keys and stores nothing: it passes the visitor's shielded testnet
// address to fauzec, then reads back the claim's progress.

const BASE = "https://fauzec.com/api/v1";
const SHIELDED = /^(utest1[02-9ac-hj-np-z]{60,}|ztestsapling1[02-9ac-hj-np-z]{60,})$/;
const ID = /^[0-9A-Za-z-]{8,64}$/;

// fauzec's error codes, in plain words.
const WORDS = {
  malformed_address: "That doesn't look like a testnet address. Copy the one that starts with utest1 from Zingo's Receive screen.",
  network_mismatch: "That's a mainnet address. Switch Zingo to testnet and use the utest1 address.",
  unsupported_address_kind: "The faucet only sends to shielded addresses. Use the one that starts with utest1.",
  address_on_cooldown: "This address already got test ZEC today. One drip per address every 24 hours.",
  ip_on_cooldown: "This network already claimed today. Try again later, or use a different connection.",
  faucet_dry: "The faucet is out of test ZEC right now. Try again in a while.",
  captcha_required: "The faucet wants a human check right now. Use the Open faucet link instead.",
  on_abuse_list: "The faucet refused this request. Use the Open faucet link instead.",
};

// A ULID-style request id (Crockford base32), chosen here so a slow claim is never lost.
function newId() {
  const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let t = Date.now(), head = "";
  for (let i = 0; i < 10; i++) {
    head = A[t % 32] + head;
    t = Math.floor(t / 32);
  }
  const bytes = require("crypto").randomBytes(16);
  let tail = "";
  for (let i = 0; i < 16; i++) tail += A[bytes[i] % 32];
  return head + tail;
}

async function call(path, init, ms = 12000) {
  const r = await fetch(BASE + path, { ...init, signal: AbortSignal.timeout(ms) });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

function friendly(data) {
  return WORDS[data.error_code] || data.failure_reason || "The faucet couldn't send right now. Try again in a minute.";
}

function shape(d) {
  return {
    id: d.request_id,
    state: d.state,
    txid: d.txid || null,
    height: d.confirmed_height || null,
    amountZat: d.amount_zat || d.claim_amount_zat || null,
    error: d.state === "failed" || d.error_code ? friendly(d) : null,
  };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const id = String((req.query && req.query.id) || "");
      if (id) {
        if (!ID.test(id)) return res.status(400).json({ error: "Unknown request." });
        const { status, data } = await call(`/status/testnet/${encodeURIComponent(id)}`);
        if (status === 404) return res.status(404).json({ error: "The faucet has no record of that request." });
        return res.status(200).json(shape(data));
      }
      const { data } = await call("/faucet-status?network=testnet");
      return res.status(200).json({ ready: data.cause === "ready", dripZat: data.drip_zat || null, availableZat: (data.balance && data.balance.spendable_zat) || null });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "POST or GET only." });
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const address = String((body && body.address) || "").trim();
    if (/^tm/i.test(address)) return res.status(400).json({ error: WORDS.unsupported_address_kind });
    if (/^u1/i.test(address)) return res.status(400).json({ error: WORDS.network_mismatch });
    if (!SHIELDED.test(address)) return res.status(400).json({ error: WORDS.malformed_address });
    const id = newId();
    let data;
    try {
      ({ data } = await call("/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ network: "testnet", address, request_id: id }),
      }, 22000));
    } catch (e) {
      // Still working at the faucet: hand back our id and let the page keep watching it.
      console.error("faucet claim slow or failed:", e && e.name, e && e.message);
      return res.status(200).json({ id, state: "pending", txid: null, height: null, amountZat: null, error: null });
    }
    if (!data.request_id) data.request_id = id;
    const out = shape(data);
    if (out.error) console.error("faucet refused:", data.error_code, data.failure_reason || "");
    return res.status(out.error ? 400 : 200).json(out);
  } catch (e) {
    console.error("faucet error:", e && e.name, e && e.message);
    return res.status(502).json({ error: "Couldn't reach the faucet. Try again in a moment." });
  }
};
