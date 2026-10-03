# Screens

## Look: the post office

Zender is a letter, so the site is stationery.

- **Paper:** warm cream with a faint grain, ink-black type, gold and ink airmail stripes on the header and footer.
- **Night post (dark mode):** the same desk with the lamp off. Dark paper, cream ink. Stamps, gold and handwriting stay readable.
  - It follows the phone's setting until the visitor taps the sun/moon button; then the choice is remembered.
  - `theme.js` sets it before the page draws, so there's no flash.
- **Type:**
  - Fraunces (editorial serif) for headings and text
  - Courier Prime (typewriter) for labels, buttons and tickets
  - Caveat (handwriting) for anything you write
  - All self-hosted in `fonts/`.
- **Logo:** a perforated postage stamp with a gold face and an ink Z (`favicon.svg`).
- **Stamps:** gold "0.0001 ZEC" for mainnet, blue "FREE TEST" for testnet.
- **Postmarks:** round blue rubber stamps with wavy cancellation lines. Every finished step gets one.
- **Buttons:** ink on paper with a hard offset shadow, like a pressed stamp.

## Every page

- **Header:**
  - Zender (home)
  - Testnet / Mainnet tabs
  - the sun/moon theme button
  - **?**, which opens "Envelopes and postcards": plain words for u1, t1, Shield, Unshield, Letter and Testnet.
- **Footer:** Testnet, Mainnet, Share on X, Source. "Built for ZECATHON. Not affiliated with any wallet, exchange or Zcash organisation."
- **Old links** (`/1`–`/6`, `/done`, `/t/…`) redirect to the matching round.

## Home `/`

1. An airmail envelope addressed in handwriting "To: me, one year from now", with a stamp and a postmark. Beside it, "The blockchain is public. **Your letter isn't.**" types out. Buttons: Practice free, Send it for real.
2. **Choose your post:** Practice post (testnet) and Real post (mainnet), each showing progress if started.
3. **Same letter. Two views:** the letter on lined paper ("You see") next to the sealed envelope back with From, To, Amount and Letter blacked out ("Everyone else sees").
4. **A post office receipt:** postage 0.0001 ZEC, returned to you, fees about 0.0003 ZEC, readable by only you.

## A round (`/testnet`, `/mainnet`), top to bottom

1. **Tracking slip:**
   - title, one line, and a live dot ("Testnet live").
   - a ticket with a tracking number (kept in this browser), service, network, wallet, postage, "n of 6 done", total time and a barcode.
2. **Stamp strip** (sticky): six stamps that get cancelled as steps are done. Tap one to jump to its step.
3. **The ledger:** six steps.
   - Each row has a number (a postmark once done), the title, a short subtitle and an mm:ss timer.
   - The timer starts when a step first opens and stops when it's done. Finishing a step opens the next.
4. **Open step:** an index card with a red margin and a strip of tape.
   - One lead line, then the taps to make, a short note for the usual snag, and links.
   - Then tips, real wallet screenshots (testnet step 1) or a "Watch how" clip (mainnet), and the action.
5. **The last stop:**
   - The letter on lined paper beside the back of its envelope. Locked until all six are done.
   - Then the wax seal presses down, a postmark lands, and "Opens 3 October 2027" appears. The date is a year from when it was sealed.
   - Testnet: **Now send it for real**. Mainnet: **Remind me next year** (a calendar file; the letter is never in it).
   - **Share it:**
     - a preview of the visitor's postcard (1200×630, drawn on the phone)
     - the post text
     - **Post on X**, **Share image** (the phone's share sheet; falls back to saving) and **Download card**
6. **Start over:** tap twice to clear the round. No browser pop-up.
7. **Stuck?**, beside a card for the other round.

## The six steps

| # | Testnet (Zingo) | Mainnet (Zodl) | How it's confirmed |
|---|---|---|---|
| 1 | Set up Zingo: ☰ → Options → ⚙ → Server → Network: Testnet, keep Automatic, Save → Create New Wallet. Four real Zingo screenshots | Set up Zodl: install, Create New Wallet, back up the phrase on paper | You tap the button |
| 2 | Get test ZEC: paste your utest1 address, tap **Send me test ZEC** | Get a little ZEC: withdraw from an exchange to your t1 (Gemini, Coinbase, Kraken; others named) | Testnet: Sending → On its way → Sent ✓, then you tap. Mainnet: watched |
| 3 | Move some to your public address: send 0.002 to your own tm | Shield it | Watched |
| 4 | Shield it back | Seal a letter: Send → own u1 → 0.0001 → paste in Message | Testnet watched. Mainnet: you tap "I sent it" |
| 5 | Seal a practice letter: Send → own utest1 → 0.0001 → paste in Memo | Read it back in Activity | You tap |
| 6 | Read it back | Unshield: send 0.0005 to your own t1 | Testnet: you tap. Mainnet: watched |

Mainnet step 2 also offers "I used Swap in Zodl instead". Swapped ZEC arrives private, so there's nothing public to watch.

## Watching a step

- The visitor pastes their public address once (t1 or tm).
- While the step is open, the page checks it every 20 seconds and on **Check now**. The box shows:
  - a pulsing "Waiting for your coins…"
  - one plain line about what it sees, e.g. "0.00364707 ZEC still public. Tap Shield in Zodl."
  - "checked 12s ago"
  - **Change address**
- It turns green by itself.

Each check compares against that address's own history, so an old address can't pass a step by itself:

- **arrive:** coins are sitting on the address.
- **shield:** the address emptied after the coins arrived.
- **back:** something new landed after the shield.

Typing is never wiped by a refresh. The private steps (the letter, reading it) are confirmed by the visitor, because only their wallet can see them.

## The faucet (testnet step 2)

- One tap sends 1 test ZEC to the visitor's private address through Zender's `/api/faucet` and fauzec.com. That's one claim per address a day.
- **Shows:**
  - Sending…, then On its way, then Sent ✓ with a "View transaction" link
  - the faucet's live supply
- **Refuses:** a tm address or a mainnet u1 address, with a plain reason.
- **Handles:** a double tap sends one claim; a claim stuck for 10 minutes ends with a message.
- **Fallback:** a link to the faucet site.

## Motion

- Home: the lines type out, the stamp drops, the postmark thumps down.
- Step cards slide in, postmarks thump on, the watching dot pulses.
- Finish: the wax seal presses, the postmark lands.
- Reduce motion turns all of it off.
