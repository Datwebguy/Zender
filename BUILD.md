# Build

Static site plus one small serverless function (`api/check.js`) for the chain checks. Phone first, because the bounty user is on a phone installing Zodl.

## Stack

Plain HTML, CSS, and small JS modules. No inline script, because the CSP blocks it. No React. No analytics script. No Google fonts. Host the six videos yourself, same origin, so a third party does not see the visitor.

Suggested host: any static host. A pages.dev or similar URL is enough for Sunday.

## Files

```
index.html          header, tabs, footer, cheat sheet, CSP
app.js              routes / /testnet /mainnet, step cards, timers, chain watching, letter form, QR, finish
steps.js            both rounds: six step cards each, how-to lists, tips, links, FAQ
zip321.js           UTF-8 to base64url memo, u1 check, URI builder
config.js           amount 0.0001, message, Zodl link
share.js            share card, Post on X link, reminder file
motion.js           typing text, step entrances, scramble-to-sealed, opening scene
verify.js           chain checks: address check, rules for steps 2, 3, 6, live block height
api/check.js        the only server code: t1/tm balance and tx count from lightwalletd over gRPC
package.json        @grpc/grpc-js, @grpc/proto-loader for api/check.js
styles.css
fonts/              Fraunces, Courier Prime, Caveat, self-hosted (OFL)
vendor/qrcode.js    QR encoder, MIT, served from our origin
videos/1.mp4 ... 6.mp4
tests/zip321.test.mjs tests/verify.test.mjs
vercel.json         rewrites, redirects from old links, CSP header
_redirects _headers same for Cloudflare Pages or Netlify
```

config.js holds no address. RECEIVE_ADDRESS stays empty. Never a seed, spending key, or viewing key.

## ZIP-321

The visitor pastes their own shielded address. Trim it. Accept only hrp u (mainnet unified) with a valid Bech32m checksum. Reject utest1, t1 and everything else.

Encode the note as UTF-8. Reject if the byte length is over 512. Base64url without padding. Build:

```
zcash: + address + ?amount=0.0001&memo= + memo + &message=Zender
```

Render that string as a QR and as a copy button. If Zodl does not scan the QR, the copy link is the fallback. Test both before calling it done.

Amount is 0.0001 ZEC to the visitor's own address, so it comes back; only the fee is spent. Do not set a fee field. Zodl applies ZIP 317.

Tests: node --test tests/*.mjs

## Videos

Six clips, one per step. Muted, autoplay, no native controls, because a tap on the screen moves between steps. A Replay button shows when a clip ends. Each clip under about 40 seconds.

The current clips are animated guides (720x1280, H.264), not screen recordings. The clips use real Zodl screenshots with tap markers. Replace them with screen recordings when you have them, same file names.

Until a clip exists, the player area stays, with the sentence as the instruction. Do not ship a fake play button that does nothing. Label it "Video coming" only if the file is missing, and replace it before the tweet.

## Privacy

- No analytics, pixels, or tag managers.
- No seed input.
- No viewing-key input.
- Note text stays in the browser and in the QR. Do not POST it.
- External links are only Zodl, three exchanges on step 2 (Gemini, Coinbase, Kraken, names only, no logos), and the Post on X link, all opened by the visitor. Vizor, Zafu, OKX, Bybit, Binance and THORChain are named without links.
- Nothing is stored on the phone. The letter and the address live only in page memory.
- Motion is decoration. With reduce motion on, everything shows at once.

## Test before tweet

1. Fresh Zodl wallet.
2. A little ZEC arrives on the transparent address.
3. Shield works.
4. Paste your own u1 address. QR scan or Copy link pays 0.0001 to yourself and the memo matches the typed note.
5. Activity shows the note on the self-send.
6. Unshield to the transparent address works.
7. Page has no third-party requests. Check the network panel.
