# Zender

A letter to your future self, sealed on Zcash. Built for the ZECATHON Wildcard onboarding track.

**Live:** https://tryzender.vercel.app · **Track:** Wildcard · **Deadline:** tweet tagging @zksnarks_ before Sunday 4 Oct 2026

> The blockchain is public. Your letter isn't.

## What it is

Two rounds of six steps that take someone with no wallet to their first private Zcash send:

- **Practice** (`/testnet`): Zingo on testnet with free coins from a one-tap faucet.
- **Real** (`/mainnet`): Zodl on mainnet with a dollar or two of ZEC.

Along the way they shield, unshield, and send a tiny amount to themselves with a letter inside. The letter sits on a public blockchain, and only their wallet can open it. The finish seals it in an envelope ("Opens 3 October 2027"), with a postcard to share on X and a one-year calendar reminder.

Bounty topics covered: wallet setup, getting ZEC, shielding and unshielding, sending and receiving.
Source: https://x.com/zksnarks_/status/2104718302606205130

## Read order

1. BRIEF.md: the product in one page
2. SCREENS.md: every page, step and state
3. BUILD.md: files, server functions, how to run and test
4. RESOURCES.md: links and facts checked on build day
5. SUBMISSION.md: the tweet

## For judges

**Why it's worth making.** People learn the whole private flow because they want to send something only their future self can read. Education and experience in one.

**What makes it work**
- A post office design: paper, stamps, postmarks, handwriting, in light and dark.
- Every step is timed, and the public steps are watched for you: they turn green by themselves.
- A built-in faucet: one tap sends free test ZEC.
- Real screenshots of Zingo and short guide clips for Zodl.
- A shareable postcard drawn on the phone.

**Privacy design**
- Zender never holds a key, seed or viewing key, and has no field for one. The wallet does every send.
- The letter never leaves the page: no network request, no storage, no share card, no reminder. Spellcheck is off on it.
- The page only talks to its own two functions (CSP `connect-src 'self'`). No analytics, no third-party scripts, fonts or media.
- `/api/check` gets only the public address the visitor pastes (t1 or tm) and returns its balance and transaction count from a Zcash light server. It stores and logs nothing.
- `/api/faucet` (testnet only) passes the visitor's utest1 address to fauzec.com to send test coins. The address is kept in page memory only.
- Saved in this browser only: which steps are done, their times, the public address, and the theme. Start over clears a round.
- The share postcard and post show the time and network, never a block number, address or letter, so a post can't be tied to an address.

**How the letter works.** Step "Seal a letter" is a letter box with Copy letter: paste it into the wallet's Message (Zodl) or Memo (Zingo) and send 0.0001 to your own private address. Optional Show QR builds a ZIP 321 URI to the visitor's own unified address: `zcash:<u1…>?amount=0.0001&memo=<base64url>&message=Zender` (max 512 UTF-8 bytes, Bech32m checked, no fee field). Zender can't see a private send, so the visitor confirms that step.

## Run locally

Any static server that serves the repo, rewrites `/testnet` and `/mainnet` to `index.html`, and runs `api/*.js` as Node functions (Vercel does all three). Tests: `npm test`.

## Deploy

Vercel. `vercel.json` holds the rewrites, redirects from old links, function limits, and the security headers. Deploy from branch `ccr-e772dae0-12fuwn`.

Built during the ZECATHON window, Oct 2026. MIT license.
