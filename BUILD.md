# Build

## Stack

A static site. Plain HTML, CSS, and JavaScript, or Vite with no framework if a build step helps. No backend. No runtime request to any third-party host.

The QR encoder is the one dependency allowed. Vendor it into the repo or bundle it at build time.

## Layout

```
index.html
config.js        RECEIVE_ADDRESS (testnet unified), AMOUNT = "0.001", MESSAGE = "Zender", faucet URLs
src/
  main.js        routing /1 to /6, / redirects to /1, render, progress ticks
  steps.js       per step: title, sentence, video, button
  zip321.js      build and validate the payment URI
  qr.js          wrapper around the vendored QR encoder
  style.css
public/
  videos/        step-N.mp4 and step-N.jpg poster
tests/
  zip321.test.js
vercel.json      rewrite /:step to index.html, CSP header
```

`config.js` holds only a public testnet address. Never a seed, never a viewing key, never a mainnet address.

## zip321.js

Pure functions, no DOM.

- `isTestnetUnified(address)`: true for `utest1…`, false for everything else, mainnet `u1…` included. The site refuses to render the QR if config fails this check.
- `memoBytes(text)`: UTF-8 byte length. The counter shows `n / 512`.
- `encodeMemo(text)`: base64url, no `=` padding. Throws if over 512 bytes.
- `buildUri({ address, amount, memo, message })`: `zcash:<address>?amount=0.001&memo=<encoded>&message=Zender`. If the note is empty, show no QR and ask for a note. The note always goes in `memo`, never only in `message`.

No fee parameter. Zodl applies ZIP-317.

## Tests

- `Hello from Zender` encodes to `SGVsbG8gZnJvbSBaZW5kZXI`.
- Multi-byte text (emoji, accented letters) counts bytes, not characters.
- 512 bytes passes, 513 fails.
- Mainnet (`u1…`, `zs1…`, `t1…`) and transparent testnet (`tm…`) addresses are rejected.
- The built URI parses back to the same address, amount, memo, and message.

Then the real check by hand: scan a generated QR in Zodl on testnet, confirm the memo shows on the confirmation screen, send, and find it in Activity on the receiving wallet.

## Privacy checklist

- [ ] No analytics, tracking pixels, or error reporting.
- [ ] No fonts, scripts, or styles from third-party hosts. Check the network tab on a cold load.
- [ ] No field for a seed, viewing key, or email.
- [ ] The note never leaves the browser. No `fetch` or `XMLHttpRequest` with it.
- [ ] CSP header: `default-src 'self'; img-src 'self' data:; media-src 'self'`.

## Phone checklist

- [ ] All six steps at 360px wide, no horizontal scroll.
- [ ] Videos autoplay muted and inline on iOS Safari (`autoplay muted playsinline`), replay on tap.
- [ ] A missing clip keeps the player frame and the step still reads correctly.
- [ ] Refreshing /4 stays on /4. Close goes to /1. Done on /6 goes to /1.
- [ ] Copy link works on iOS Safari and Android Chrome.
- [ ] The QR scans from a second screen with Zodl.

## Deploy

Vercel. Framework preset "Other" (or Vite), output `.` (or `dist`). Add the rewrite and CSP in `vercel.json`. Do not use the zsend.xyz domain. Put the public URL at the top of SUBMISSION.md.
