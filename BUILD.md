# Build

Static site plus two small Node functions, deployed on Vercel. Phone first.

## Stack

- Plain HTML, CSS and small ES modules. No framework, no build step.
- No inline script or style: the CSP blocks them. `theme.js` is a tiny external script so the theme is set before the page draws.
- No analytics, no third-party scripts, fonts or media. Fonts, clips and screenshots are served from our own origin.

## Files

```
index.html        header (tabs, theme button, ?), footer, plain-words sheet, CSP
theme.js          light/dark before first paint
app.js            routes / /testnet /mainnet, step cards, timers, watching, faucet, letter, QR, finish, share
steps.js          both rounds' copy: six steps each, taps, tips, screenshots, FAQ
verify.js         the three checks (arrive, shield, back), address patterns, /api/check client
zip321.js         UTF-8 memo to base64url, unified address check, ZIP 321 URI
share.js          postcard drawing, post text, Post on X link, reminder file
motion.js         typing, scramble, timed effects (all off with reduce motion)
config.js         amount 0.0001, wallet, exchange and faucet links
styles.css        post office look, light and night palettes
api/check.js      balance and tx count for one public address, from lightwalletd over gRPC
api/faucet.js     testnet only: claims test ZEC from fauzec.com, reads the claim's progress
api/_guard.js     shared: same-origin and JSON-only checks
fonts/            Fraunces, Courier Prime, Caveat (OFL)
guide/            four Zingo screenshots (addresses blurred)
videos/1-6.mp4    Zodl guide clips (real screenshots, tap markers)
vendor/qrcode.js  QR encoder (MIT)
og.png            the link preview postcard
tests/            zip321 and check rules (node --test)
vercel.json       rewrites, redirects, function limits, security headers
```

Never a seed, spending key or viewing key anywhere. `config.js` holds no address.

## Server functions

**`api/check.js`**
- `POST {network, address}` returns `{balanceZat, txCount, height}`. `POST {network, tip: true}` returns `{height}`.
- Accepts only t1 (mainnet) or tm (testnet) addresses.
- Servers: zec.rocks (three mirrors) and testnet.zec.rocks.
- One 15-second budget across all servers. Counting stops at 50 transactions, so busy addresses stay cheap.
- Stores and logs nothing.

**`api/faucet.js`**
- `POST {address}` claims 1 TAZ for a utest1 or ztestsapling address. The length and the Bech32/Bech32m checksum are checked first.
- Zender picks the claim id itself, so a slow claim is never lost. It waits up to 22 seconds, then the page keeps watching.
- `GET ?id=` reads a claim's state; `GET` alone returns the faucet's status. The transaction id is validated before it's used in a link.
- Logs only fauzec's error code.

**Both**
- Refuse requests from other sites (Origin must match) and anything that isn't JSON. A cross-site page can't use them.
- Optional extra: a Vercel firewall rate limit per visitor on `/api/*`.

## ZIP 321 (Show QR)

- Trim the pasted address. Accept only the round's own unified address (hrp `u` or `utest`) with a valid Bech32m checksum.
- The letter: UTF-8, at most 512 bytes, base64url without padding. Build `zcash:<address>?amount=0.0001&memo=<memo>&message=Zender`. No fee field (ZIP 317).
- Copy letter is the main path. Scanning your own screen needs a second phone.

## Test

- `npm test`: ZIP 321 encoding and the check rules (reused addresses don't pass).
- Before the tweet, on a phone, in both themes:
  1. Testnet: switch Zingo, tap the faucet, move 0.002 to tm, shield it back, send the letter, read it.
  2. Mainnet: fresh Zodl, ZEC arrives on t1, shield, letter to your own u1 (the memo matches), read it, unshield.
  3. The network panel shows only our own origin.
