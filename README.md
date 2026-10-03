# Zender

Onboarding web experience for the ZECATHON Wildcard onboarding bounty.

The agent builds this. Do not invent a second product. Do not add a portfolio, login, admin, or mainnet toggle.

## What it is

A six-step site. Each step plays a short guide video, then the visitor does that step in Zodl on testnet. The send step turns their note into a ZIP-321 QR. They scan it, send, and read the note back in Activity. The last step is unshield.

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

- Primary faucet https://zcashfaucet.jinolabs.xyz reset every connection from the build machine. Step 2 uses the fallback, https://zechub.wiki/tools?tool=faucet (fauzec.com), and drops the "0.1 TAZ" wording. To switch back, set `ACTIVE_FAUCET = "primary"` in config.js once the Jino faucet is confirmed to drip.
- Store links taken from https://zodl.com/ on build day. The App Store listing URL still carries the old Zashi slug.
- Step 4 asks the visitor for their own testnet unified address (`utest1…`) and builds the ZIP-321 link to it. They send to themselves and read the note in their own Activity. `RECEIVE_ADDRESS` in config.js stays empty.
- Videos go in `videos/1.mp4` to `videos/6.mp4`. A missing clip shows "Video coming" with the step sentence.

## Run locally

Any static server that rewrites `/1` to `/6` to `index.html`. Unit tests: `node --test tests/*.mjs`.

## Deploy

Static. `vercel.json` holds the rewrites, the redirect from `/` to `/1`, and the CSP header. `_redirects` and `_headers` do the same on Cloudflare Pages or Netlify.
