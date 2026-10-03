# Zender

Onboarding web experience for the ZECATHON Wildcard onboarding bounty.

The agent builds this. Do not invent a second product. Do not add a portfolio, login, admin, or network toggle.

## What it is

A six-step site. Each step plays a short guide video, then the visitor does that step in Zodl on mainnet with a small amount of real ZEC. The send step turns their note into a ZIP-321 QR to their own address. They scan it, send, and read the note back in Zodl. The last step is unshield. A finish screen lets them post to X.

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
- Step 4 asks the visitor for their own Zodl shielded address (`u1…`) and builds the ZIP-321 link to it. They send 0.001 ZEC to themselves and read the note in Zodl. Zender holds no address.
- `videos/1.mp4` to `videos/6.mp4` are animated guide clips, not Zodl screen recordings. Swap in real recordings with the same names. A missing clip shows "Video coming" with the step sentence.

## Run locally

Any static server that rewrites `/1` to `/6` to `index.html`. Unit tests: `node --test tests/*.mjs`.

## Deploy

Static. `vercel.json` holds the rewrites, the redirect from `/` to `/1`, and the CSP header. `_redirects` and `_headers` do the same on Cloudflare Pages or Netlify.
