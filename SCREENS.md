# Screens

One scrolling page per round. Steps hang on a vertical chain, one open at a time, each with a timer. Public steps are checked on chain, live.

## Look

- Art: our own 3D render (`art/main.jpg` gold, `art/test.jpg` ice blue). A public chain of obsidian blocks with readable data lines; one amber block carries a gold wax seal with a Z. Public chain, one sealed letter. Rendered with three.js, served as a 108 KB JPEG.
- Logo: a gold wax seal with a Z (`favicon.svg`, also inline in the header).
- Type: Inter for everything, Newsreader italic for the gold accent line and for letters. Self-hosted in `fonts/`.
- Black, gold for mainnet, ice blue for testnet.

## Pages

- `/` Home. The render, then "The blockchain is public. Your letter isn't." types out. Two buttons, two round cards (with progress if started), "Same transaction. Two views.", and Write · Seal · Open.
- `/testnet` Practice round. Zingo, free test ZEC, testnet.zec.rocks:443.
- `/mainnet` The real round. Zodl, a dollar or two of real ZEC.
- Old links (`/1`–`/6`, `/done`, `/t/…`) redirect to the matching round.

Header on every page: Zender (home), Testnet / Mainnet tabs, ? (Envelopes and postcards: plain words for u1, t1, Shield, Unshield, Letter, Testnet).

Footer: Built for ZECATHON · Not affiliated with any wallet, exchange or Zcash organisation · Open source.

## A round, top to bottom

1. Stage: the render on top, the copy rising out of its reflection. Live network pill ("Testnet live · block 4,446,087" from `/api/check`), two-line title (second line gold serif italic), one sentence.
2. The rail, sticky under the header: six linked blocks that turn gold as steps are sealed, n/6 and total time. Tap a block to jump to its step.
3. Six steps on a vertical chain. Card head: number (✓ when done), title, one-line subtitle, mm:ss timer. The timer starts when a card first opens and stops when it's done. Finishing a card opens the next one.
4. Step body: one lead sentence, a numbered how-to list, a small note for the usual snag, links, tip boxes, "Watch how" (mainnet clips), then the action.
5. The letter card: locked until all six are done, then the letter gets its wax seal, stamped with network, block and total time, next to what the whole world sees. Post on X, Share image, Remind me next year. On testnet: Now do it on mainnet.
6. Start this round over · progress saves in this browser.
7. Stuck? beside a card for the other round. Short answers: can't spend yet, exchange won't take my address, QR won't scan, still watching, is this safe, switching Zingo to testnet.

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

- The render drifts slowly. Home: the two lines type out.
- Cards rise in as they open. The watching dot pulses.
- QR materialises. Finish: "hidden" and "sealed" unscramble, then the wax seal stamps the letter.
- Reduce motion turns all of it off.
