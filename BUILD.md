# Build

## Stack

A static site. Plain HTML, CSS, and JavaScript, or Vite with no framework if a build step helps. No backend. No runtime dependency loaded from a CDN.

The QR encoder is the one dependency allowed. Vendor it into the repo or bundle it at build time, so the deployed site makes no requests to third-party hosts.

## Layout

```
index.html
src/
  main.js        routing (#/0 to #/6), step render, progress
  steps.js       step content: title, video, instructions, what you should see
  zip321.js      build and validate the payment URI
  qr.js          wrapper around the vendored QR encoder
  style.css
public/
  videos/        step-N.mp4 and step-N.jpg
tests/
  zip321.test.js
```

## zip321.js

Pure functions, no DOM.

- `isTestnetShielded(address)` returns true for `utest1…` and `ztestsapling1…`, false for everything else, mainnet included.
- `memoBytes(text)` returns the UTF-8 byte length.
- `encodeMemo(text)` returns base64url without padding. Throws if over 512 bytes.
- `formatAmount(value)` returns decimal ZEC with at most 8 places and no trailing zeros. Throws on zero, negative, or more than 8 places.
- `buildUri({ address, amount, memo })` returns `zcash:<address>?amount=<amount>&memo=<encoded>`. Omits `memo` when the note is empty.

## Tests

Cover at least:

- A known memo round-trips: `Hello from Zender` gives `SGVsbG8gZnJvbSBaZW5kZXI`.
- Multi-byte text (emoji, accented letters) counts bytes, not characters.
- 512 bytes passes, 513 fails.
- Mainnet addresses (`u1…`, `zs1…`, `t1…`) are rejected.
- Amounts: `0.001` stays `0.001`, `1.50000000` becomes `1.5`, `0.000000001` is rejected.

Then do the real check by hand: scan a generated QR in Zodl on testnet and confirm the address, amount, and memo show up correctly before sending.

## Privacy checklist

- [ ] No analytics, tracking pixels, or error reporting services.
- [ ] No fonts, scripts, or styles from third-party hosts. Check the network tab on a cold load.
- [ ] No form field for a seed or recovery phrase, anywhere.
- [ ] Address and note never leave the browser. No `fetch` or `XMLHttpRequest` with them.
- [ ] A strict `Content-Security-Policy`: `default-src 'self'; img-src 'self' data:; media-src 'self'`.

## Phone checklist

- [ ] All seven screens at 360px wide with no horizontal scroll.
- [ ] Video plays inline on iOS Safari (`playsinline`).
- [ ] A missing clip shows the poster and the step still reads correctly.
- [ ] Paste and Copy buttons work on iOS Safari and Android Chrome.
- [ ] "Open in wallet" opens Zodl when the page is on the same phone.
- [ ] QR scans from a laptop screen with Zodl.

## Deploy

Any static host. Vercel is the default here: connect the repo, framework preset "Other" (or Vite), output directory `.` (or `dist`). Set the CSP as a response header in the host config. Put the public URL at the top of SUBMISSION.md.
