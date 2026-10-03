// Free test ZEC from fauzec.com, the public Zcash testnet faucet, without leaving Zender.
// Testnet only. Holds no keys and stores nothing: it passes the visitor's shielded testnet
// address to fauzec, then reads back the claim's progress.

const guard = require("./_guard");

const BASE = "https://fauzec.com/api/v1";
const SHIELDED = /^(utest1[02-9ac-hj-np-z]{60,400}|ztestsapling1[02-9ac-hj-np-z]{60,120})$/;
const TXID = /^[0-9a-f]{64}$/;

// Bech32 / Bech32m checksum, so typos never reach the faucet.
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function checksumOk(addr) {
  const sep = addr.lastIndexOf("1");
  const hrp = addr.slice(0, sep);
  const data = [...addr.slice(sep + 1)].map((ch) => CHARSET.indexOf(ch));
  if (data.some((v) => v < 0)) return false;
  const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  const values = [...[...hrp].map((ch) => ch.charCodeAt(0) >> 5), 0, ...[...hrp].map((ch) => ch.charCodeAt(0) & 31), ...data];
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= G[i];
  }
  return hrp === "utest" ? chk === 0x2bc830a3 : chk === 1;
}
const ID = /^[0-9A-Za-z-]{8,64}$/;

// fauzec's error codes, in plain words.
const WORDS = {
  malformed_address: "That doesn't look like a testnet address. Copy the one that starts with utest1 from Zingo's Receive screen.",
  network_mismatch: "That's a mainnet address. Switch Zingo to testnet and use the utest1 address.",
  unsupported_address_kind: "The faucet only sends to shielded addresses. Use the one that starts with utest1.",
  address_on_cooldown: "This address already got test ZEC today. One drip per address every 24 hours.",
  ip_on_cooldown: "The faucet is busy with other people right now. Try again in a while, or use the faucet site.",
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
  return WORDS[data.error_code] || "The faucet couldn't send right now. Try again in a minute.";
}

function shape(d) {
  return {
    id: d.request_id,
    state: d.state,
    txid: typeof d.txid === "string" && TXID.test(d.txid) ? d.txid : null,
    height: Number.isInteger(d.confirmed_height) ? d.confirmed_height : null,
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
    if (!guard(req, res)) return;
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
    if (!SHIELDED.test(address) || !checksumOk(address)) return res.status(400).json({ error: WORDS.malformed_address });
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
    if (out.error) console.error("faucet refused:", data.error_code || "unknown");
    return res.status(out.error ? 400 : 200).json(out);
  } catch (e) {
    console.error("faucet error:", e && e.name, e && e.message);
    return res.status(502).json({ error: "Couldn't reach the faucet. Try again in a moment." });
  }
};
