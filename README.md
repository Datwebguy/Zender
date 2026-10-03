# Zender

Onboarding web experience for the ZECATHON Wildcard onboarding bounty.

The agent builds this. Do not invent a second product. Do not add a portfolio, login, admin, or network toggle.

## What it is

A six-step site, one scrolling page per round: a free practice round on testnet in Zingo (`/testnet`), then the real round in Zodl on mainnet (`/mainnet`). Each step is a card with a timer, and the public steps are checked on chain, live. Step 4 is the twist: they write a letter to themselves one year from now, and it becomes a ZIP-321 QR to their own address. The letter sits on the public chain, encrypted, and only their wallet can open it. They read it back in Zodl, unshield, and finish with "Sealed for a year": post to X, share a card, or save a calendar reminder for next year.

## Bounty this must cover

From the organiser post, 28 Sep 2026: wallet setup, getting ZEC, shielding and unshielding, sending and receiving. Goal is zero to a first shielded transaction. Submit by tweeting the link and tagging @zksnarks_. Deadline Sunday 4 Oct 2026.

Source: https://x.com/zksnarks_/status/2104718302606205130

## Read order

1. BRIEF.md
2. SCREENS.md
3. RESOURCES.md
4. BUILD.md
5. SUBMISSION.md

## Done means

- Site is live on a public URL.
- Six steps work on a phone.
- Each step has a video element. If a clip is not recorded yet, the player is there and the step still tells them what to do.
- Send step produces a real ZIP-321 URI with a memo, as a QR and a copyable link.
- No analytics, no third-party scripts, no account, no seed field.
- A screen recording of the full path exists for the tweet.

## Build day status, 2 Oct 2026

- Mainnet, 3 Oct 2026. Zodl ships only mainnet builds (its testnet app is a source-only build target), so the store app cannot do a testnet run. Zender moved to mainnet with small amounts. The faucet step became "Get a little ZEC".
- Store links taken from https://zodl.com/ on build day. The App Store listing URL still carries the old Zashi slug.
- Step 4 asks the visitor for their own Zodl shielded address (`u1…`) and builds the ZIP-321 link to it. They send 0.0001 ZEC to themselves and read the note in Zodl. Zender holds no address.
- `videos/1.mp4` to `videos/6.mp4` are animated guide clips, not Zodl screen recordings. Swap in real recordings with the same names. A missing clip shows "Video coming" with the step sentence.

## Run locally

Any static server that rewrites `/testnet` and `/mainnet` to `index.html`, plus `api/check.js` for the chain checks. Unit tests: `npm test`.

## Deploy

Static. `vercel.json` holds the rewrites, redirects from the old `/1`–`/6` and `/t/…` links, and the CSP header. `_redirects` and `_headers` do the same on Cloudflare Pages or Netlify.

## For judges

Live: https://tryzender.vercel.app · Track: Wildcard

**What it is.** A letter to your future self, sealed on Zcash. Practise free on testnet with Zingo (`/testnet`), then do it for real on mainnet with Zodl (`/mainnet`). Each round is one page of six step cards, each timed, and the public steps are checked live on chain. They take someone with no wallet to their first shielded send, with a short guide clip on each mainnet step: install, get a little ZEC, shield, seal a letter, read it back, unshield. The letter is a shielded memo sent to their own address: it lives on a public blockchain, and only their wallet can open it. The finish screen shows what they see next to what everyone else sees, and offers Post on X, a share card and a one-year calendar reminder.

**Why it is worth making.** Education and experience in one: people learn the whole shielded flow because they want to send something only their future self can read. "The blockchain is public. Your letter isn't."

**Privacy design.**
- Zender never holds a key, seed or viewing key, and has no field for one. Zodl does every send.
- The address and note stay in the page's memory. They go into the QR and the copy link, nowhere else.
- The page talks to one place only, its own `/api/check` (CSP `connect-src 'self'`). No analytics, no third-party scripts, fonts or media. Clips are served from the same origin.
- The chain checks (steps 2, 3, 6) send only the visitor's public transparent address (t1 or tm), once the visitor pastes it. `/api/check` asks a Zcash light server (zec.rocks, the kind of server wallets use) for that address's balance and transaction count and returns just those numbers. It holds no keys, never sees the letter, stores and logs nothing.
- Progress (which steps are done, their times) and the public t1/tm address are saved in this browser only, so a reload or a trip to the wallet app doesn't lose your place. Start over clears them. The letter is never saved.
- Testnet only: Send me test ZEC passes the visitor's utest1 address to fauzec.com (the public testnet faucet) through `/api/faucet`, and reads back the claim's progress. No keys, nothing stored.
- The share card is drawn on the phone and never includes the letter or an address.
- The reminder is a calendar file made on the phone. It has the date and "Open your Zcash letter", never the letter.

**How it works.** Step 4 is a letter box with Copy letter: the visitor pastes it into Zodl's Message field and sends 0.0001 ZEC to their own address. For a second screen, Show QR checks the pasted address is a mainnet unified address (Bech32m, hrp `u`), encodes the note as a base64url memo (max 512 UTF-8 bytes), and builds a ZIP 321 URI: `zcash:<u1…>?amount=0.0001&memo=<memo>&message=Zender`. No fee field; Zodl applies ZIP 317. The site cannot see the wallet, so it never claims to detect the send.

**Run it.** Any static server that rewrites `/testnet` and `/mainnet` to `index.html` (see `vercel.json`), plus `api/check.js`. Tests: `npm test`.

**Built** during the ZECATHON window, Oct 2026. MIT license.
