const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32M_CONST = 0x2bc830a3;

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

// Unified address with a valid Bech32m checksum. hrp "u" is mainnet (u1…), "utest" is testnet (utest1…).
export function isUnifiedAddress(address, hrp = "u") {
  return typeof address === "string" && address.length > 60 && bech32mHrp(address) === hrp;
}

