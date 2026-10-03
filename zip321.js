// ZIP 321 payment request for step 4. Pure functions, no DOM.
// https://zips.z.cash/zip-0321

export const MAX_MEMO_BYTES = 512;

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32M_CONST = 0x2bc830a3;

export function utf8Bytes(text) {
  return new TextEncoder().encode(text);
}

export function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeMemo(text) {
  const bytes = utf8Bytes(text);
  if (bytes.length > MAX_MEMO_BYTES) {
    throw new RangeError(`Memo is ${bytes.length} bytes, max is ${MAX_MEMO_BYTES}.`);
  }
  return base64url(bytes);
}

export function bech32Polymod(values) {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk ^= GENERATORS[i];
    }
  }
  return chk >>> 0;
}

function hrpExpand(hrp) {
  const out = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

// Returns the human-readable part if the string is valid Bech32m, else null.
// Unified addresses use Bech32m without the 90 character limit (ZIP 316).
export function bech32mHrp(str) {
  if (typeof str !== "string" || str !== str.toLowerCase()) return null;
  const pos = str.lastIndexOf("1");
  if (pos < 1 || str.length - pos - 1 < 6) return null;
  const hrp = str.slice(0, pos);
  const data = [];
  for (const c of str.slice(pos + 1)) {
    const v = CHARSET.indexOf(c);
    if (v === -1) return null;
    data.push(v);
  }
  return bech32Polymod([...hrpExpand(hrp), ...data]) === BECH32M_CONST ? hrp : null;
}

// Mainnet unified address (Zodl's "Zcash Shielded Address", starts u1): hrp "u", valid Bech32m checksum.
export function isUnifiedAddress(address) {
  return typeof address === "string" && address.length > 60 && bech32mHrp(address) === "u";
}

export function buildUri({ address, amount, memo, message }) {
  if (!isUnifiedAddress(address)) throw new Error("Address is not a unified address.");
  let uri = `zcash:${address}?amount=${amount}&memo=${encodeMemo(memo)}`;
  if (message) uri += `&message=${encodeURIComponent(message)}`;
  return uri;
}
