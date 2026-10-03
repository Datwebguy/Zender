# Screens

One scrolling page per round. Steps hang on a vertical chain, one open at a time, each with a timer. Public steps are checked on chain, live.

## Look: the post office

Zender is a letter, so the whole site is stationery. Nothing dark, nothing 3D.

- Paper: warm cream with a faint grain, ink-black type, airmail stripes (gold and ink) on the header and footer.
- Type: Fraunces (editorial serif) for headings and text, Courier Prime (typewriter) for labels, buttons, tickets and receipts, Caveat (handwriting) for anything you write. Self-hosted in `fonts/`.
- Logo: a perforated postage stamp with a gold face and an ink Z (`favicon.svg`).
- Stamps: gold "0.0001 ZEC" for mainnet, blue "FREE TEST" for testnet, perforated edges.
- Postmarks: round blue rubber stamps with wavy cancellation lines. Every finished step gets one.
- Buttons: ink on paper with a hard offset shadow, like a pressed rubber stamp.

## Pages

- `/` Home. An airmail envelope addressed "To: me, one year from now", stamped and postmarked, beside "The blockchain is public. Your letter isn't." (typed, the second line under a gold highlighter). Choose your post (Practice post / Real post), "Same letter. Two views." (your letter on lined paper vs the sealed envelope back with redacted From, To, Amount, Letter), and a post office receipt: postage 0.0001 ZEC, comes back to you, fees, readable by only you, what this site sees.
- `/testnet` Practice round. Zingo, free test ZEC, testnet.zec.rocks:443.
- `/mainnet` The real round. Zodl, a dollar or two of real ZEC.
- Old links (`/1`–`/6`, `/done`, `/t/…`) redirect to the matching round.

Header on every page: Zender (home), Testnet / Mainnet tabs, ? (Envelopes and postcards: plain words for u1, t1, Shield, Unshield, Letter, Testnet).

Footer: Testnet, Mainnet, Share on X, Source. Built for ZECATHON · Not affiliated with any wallet, exchange or Zcash organisation · Open source.

## A round, top to bottom

1. The tracking slip: title, one sentence, "Post office open · testnet block 4,446,274" (live from `/api/check`), and a ticket with a tracking number (ZND-XXXX-XX, kept in this browser), service, network, wallet, postage, n of 6 postmarked, total time and a barcode.
2. A sticky strip of six stamps. Each one is cancelled with postmark lines when its step is done. Tap one to jump to its step.
3. Six steps on a ledger. A finished step's number becomes a round postmark. Card head: number (✓ when done), title, one-line subtitle, mm:ss timer. The timer starts when a card first opens and stops when it's done. Finishing a card opens the next one.
4. Open step: an index card with a red margin and a strip of tape: one lead sentence, a numbered how-to list, a small note for the usual snag, links, tip boxes, "Watch how" (mainnet clips), then the action.
5. The last stop: your letter on lined paper next to the back of its envelope. Locked until all six are done; then the wax seal presses down and a postmark lands with the network, block and total time. "Opens 3 October 2027." On testnet: Now send it for real. On mainnet: Remind me next year.
   - Send a postcard to the timeline (both rounds): a preview of your postcard, the post text, Post on X, Share image, Download card.
   - The postcard (1200×630, drawn on the phone): "I sealed a letter to future me.", stamp, postmark with network and time, block, steps and time, "To: me, one year from now". Never the letter, never an address.
   - Post text, mainnet: "I sealed a letter to my future self on Zcash. It sits on a public blockchain, and only I can open it. Opens 3 October 2027. Write yours: tryzender.vercel.app @zksnarks_ #ZECATHON"
   - Post text, testnet: "I just sent my first shielded Zcash transaction: a letter to my future self, sealed on testnet in 14:52. The real one is next. Try it free: …"
   - X links can't attach images, so Share image opens the phone's share sheet (pick X) and Download card saves it for a computer.
   - `og.png` is the same postcard without a block or time, so any post with the link shows it.
6. Start this round over · progress saves in this browser.
7. Stuck at the counter? beside a card for the other round. Short answers: can't spend yet, exchange won't take my address, QR won't scan, still watching, is this safe, switching Zingo to testnet.

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

- Home: the two lines type out, the stamp drops onto the envelope and the postmark thumps down.
- Step cards slide in. Each finished step's postmark thumps on. The watching dot pulses.
- The letter is written in handwriting on lined paper. Finish: the wax seal presses on and the postmark lands.
- Reduce motion turns all of it off.
