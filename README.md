# Zender

A letter to your future self, sealed on Zcash.

**Live:** https://tryzender.vercel.app

> The blockchain is public. Your letter isn't.

## What it is

Zender takes someone with no wallet to their first private Zcash send, in two rounds of six steps:

- **Practice** (`/testnet`): Zingo on testnet, with free coins from a one-tap faucet.
- **Real** (`/mainnet`): Zodl on mainnet, with a dollar or two of ZEC.

Along the way you set up a wallet, get ZEC, shield and unshield, and send a tiny amount to yourself with a letter inside. The letter sits on a public blockchain, and only your wallet can open it. At the end it's sealed in an envelope ("Opens 3 October 2027"), with a postcard to share and a one-year calendar reminder.

## Features

- A post office design (paper, stamps, postmarks, handwriting) in light and dark mode.
- Each step is timed, and the public steps are watched for you and turn green by themselves.
- A built-in testnet faucet: one tap sends free test ZEC.
- Real wallet screenshots and short guide clips.
- A shareable postcard, drawn on the device.

## Privacy

- Zender never holds a key, seed or viewing key, and has no field for one. The wallet does every send.
- The letter never leaves the page: no network request, no storage, no share card, no reminder.
- The page only talks to its own two functions. No analytics, no third-party scripts, fonts or media.
- `/api/check` receives only the public address you paste (t1 or tm) and returns its balance and transaction count from a Zcash light server. It stores and logs nothing.
- `/api/faucet` (testnet only) passes your utest1 address to fauzec.com to send test coins. The address stays in page memory only.
- Saved in your browser only: which steps are done, their times, your public address, and your theme. Start over clears a round.
- The share postcard shows the time and network, never a block number, address or letter.

## How the letter works

Write it, tap Copy letter, and paste it into your wallet's Message (Zodl) or Memo (Zingo) when you send 0.0001 to your own private address. Optional Show QR builds a ZIP 321 request to your own unified address: `zcash:<u1…>?amount=0.0001&memo=<base64url>&message=Zender` (512 bytes max, checksum verified, no fee field). Zender can't see a private send, so you confirm those steps yourself.

## Project layout

```
index.html        page shell, header, footer, plain-words sheet, CSP
theme.js          light/dark before first paint
app.js            routes, step cards, timers, watching, faucet, letter, finish, share
steps.js          both rounds' copy
verify.js         step checks and the /api/check client
zip321.js         memo encoding, unified address check, ZIP 321 URI
share.js          postcard, post text, reminder file
motion.js         small animations (off with reduced motion)
config.js         amounts and links
styles.css        light and dark palettes
api/check.js      balance and tx count for one public address (lightwalletd, gRPC)
api/faucet.js     testnet faucet claims via fauzec.com
api/_guard.js     same-origin and JSON-only request checks
fonts/ guide/ videos/ vendor/   self-hosted assets
tests/            unit tests
```

## Run and test

Deploys on Vercel: `vercel.json` holds the rewrites, redirects, function limits and security headers. Any host that serves the repo, rewrites `/testnet` and `/mainnet` to `index.html`, and runs `api/*.js` as Node functions will work.

```
npm install
npm test
```

## License

MIT. See LICENSE.
