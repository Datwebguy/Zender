# Screens

One scrolling page per round. Each step is a card. One card is open at a time, with a timer. Public steps are checked on chain, live.

## Pages

- `/` Home. "The blockchain is public. Your letter isn't." types out, an envelope gets its wax seal. Two cards: Practice first (testnet) and Do it for real (mainnet), each with progress if started.
- `/testnet` Practice round. Zingo, free test ZEC, testnet.zec.rocks:443.
- `/mainnet` The real round. Zodl, a dollar or two of real ZEC.
- Old links (`/1`–`/6`, `/done`, `/t/…`) redirect to the matching round.

Header on every page: Zender (home), Testnet / Mainnet tabs, ? (Envelopes and postcards: plain words for u1, t1, Shield, Unshield, Letter, Testnet).

Footer: Built for ZECATHON · Not affiliated with any wallet, exchange or Zcash organisation · Open source.

## A round, top to bottom

1. Hero: small tag, two-line title (second line yellow), one sentence, a live network line ("Testnet online · block 4,446,087" from `/api/check`), the envelope.
2. Six step cards. Card head: number (✓ when done), title, one-line subtitle, mm:ss timer. The timer starts when a card first opens and stops when it's done. Finishing a card opens the next one.
3. Card body: one lead sentence, a numbered how-to list, a small note for the usual snag, links, tip boxes, "Watch how" (mainnet clips), then the action.
4. Bottom bar: "Finish all six steps to seal it" (turns into Seal it), Start over, "n/6 steps · progress saves in this browser".
5. Finish (after all six): "Sealed for a year." with total time, You see / Everyone else sees panels, Post on X, Share image, Remind me. On testnet: "Practice done" and Now do it for real.
6. The other round: "Then do it on mainnet" or "New to this?".
7. Stuck? Short answers: can't spend yet, exchange won't take my address, QR won't scan, still watching, is this safe, switching Zingo to testnet.

## The six steps

| # | Testnet (Zingo) | Mainnet (Zodl) | Action |
|---|---|---|---|
| 1 | Set up a testnet wallet: gear → Server → Network Testnet, Custom `https://testnet.zec.rocks:443`, Create New Wallet, sync. Tips: Am I on testnet? / Back to mainnet later | Set up Zodl: install, Create New Wallet, back up the phrase on paper, sync | I'm ready |
| 2 | Get test ZEC from the faucet to your tm address | Get a little ZEC: exchange withdrawal to your t1 (Gemini, Coinbase, Kraken links; OKX, Bybit, Binance, THORChain named) | Paste the address once; watched on chain. Mainnet also offers "I used Swap in Zodl instead" |
| 3 | Shield it | Shield it | Watched on chain |
| 4 | Seal a practice letter: Send → own utest1 → 0.0001 → Memo | Seal a letter: Send → own u1 → 0.0001 → Message | Letter box, Copy letter, optional Show QR, then I sent it |
| 5 | Read it back | Read it back. Tips: what everyone sees / what you see | I can read my letter |
| 6 | Unshield to your own tm | Unshield to your own t1 | Watched on chain |

## Watching the chain

Only the public transparent address (t1 or tm) is sent, to Zender's own `/api/check`, which asks a Zcash light server for balance and transaction count. While a watched card is open it checks every 20 seconds; the box reads "Watching your public address…", then "Not yet. 0 TAZ here, 1 transaction so far." and turns green on its own.

- Step 2 passes when anything has arrived.
- Step 3 passes when the address has emptied (or moved on).
- Step 6 passes on a new transaction after the shield, with a balance.

Steps 1, 4 and 5 are confirmed by the visitor: the letter is sealed, so only their wallet can prove it. Zender never claims to see the send.

## Motion

- Home: the two lines type out, the envelope floats and a wax seal stamps it.
- Cards rise in as they open. The watching dot pulses.
- QR materialises. Finish: "hidden, hidden, sealed" unscramble, then the seal stamps the letter.
- Reduce motion turns all of it off.
