# Brief

## One line

Take someone with no wallet to a first shielded transaction on Zcash testnet, one short step at a time.

## Who it is for

A person who has heard of Zcash but never used it. They are on a phone. They may have a laptop open beside it. They know nothing about pools, addresses, or memos.

## The path

| # | Step | Bounty item | What the visitor does in Zodl |
|---|------|-------------|-------------------------------|
| 1 | Set up | Wallet setup | Install Zodl, create a testnet wallet, back up the recovery phrase on paper. |
| 2 | Get ZEC | Getting ZEC, receiving | Copy their transparent receive address, request testnet ZEC from a faucet, wait for it to arrive. |
| 3 | Shield | Shielding | Shield the transparent balance into the shielded pool. |
| 4 | Send | Sending | Paste their own shielded address and a note into Zender, scan the ZIP-321 QR, send. |
| 5 | Read it back | Receiving | Open Activity, find the transaction, read the note. |
| 6 | Unshield | Unshielding | Send some ZEC from the shielded balance to a transparent address. |

Step 4 is the first shielded transaction. Step 5 proves it landed and the memo is private to them.

## Rules

- Testnet only. No mainnet toggle, no mainnet copy, no prices.
- Zender never holds funds, keys, or seeds. It never asks for a recovery phrase. The only thing a visitor types is an address and a note, and both stay in the browser.
- No login, no account, no portfolio, no admin, no analytics, no third-party scripts.
- One product. If an idea is not one of the six steps, it is out of scope.

## Tone

Short sentences. One action per instruction. Say what they will see on screen. No jargon without a one-line explanation the first time it appears (transparent, shielded, memo).

## Out of scope

- Mainnet anything.
- Exchanges, buying ZEC, price data.
- Wallets other than Zodl.
- Saving progress to a server. Progress can live in `localStorage`, and nothing else.
