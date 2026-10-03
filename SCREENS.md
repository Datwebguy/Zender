# Screens

One route per step: /1 through /6. / redirects to /1. State is the step index in the URL. No account.

Shared chrome:

- Wordmark: Zender
- Progress: 6 ticks, current tick filled
- Close returns to /1
- Title
- One sentence
- Video player for that step
- Yellow Next
- Back from step 2
- One screen per step. No page scroll. The video takes the height that is left.
- Tap the right side of the screen for next, the left side for back. Buttons, links and fields keep their own tap.
- Keep it neat: title, one sentence, video, at most one button, Next. Everything centred.

## 1. Install Zodl

Under the button, one line, no links: "Other Zcash wallets: Vizor, Zafu."

Title: Install Zodl

Sentence: Install it and tap Create New Wallet. About 10 minutes in all.

Button under the video: Get Zodl. Links to https://zodl.com/

Video: welcome screen, tap Create New Wallet, wallet ready. Creating a wallet shows no phrase; the phrase is exported later from Advanced Settings.

## 2. Get a little ZEC

Title: Get a little ZEC

Sentence: Tap Swap in Zodl, or buy a dollar or two on an exchange.

Buttons: Gemini, Coinbase, Kraken. Names only, no logos. Each opens that exchange's Zcash page:
- https://www.gemini.com/prices/zcash
- https://www.coinbase.com/price/zcash
- https://www.kraken.com/buy/zec

Sentence: "Tap Swap in Zodl, or buy a dollar or two on an exchange." Under the buttons, one line, no links: "Withdraw to your t1. Also OKX, Bybit, Binance, or swap on THORChain."

Plain words (the ? in the header), "Envelopes and postcards": u1 is your envelope address (sealed), t1 your postcard address (readable by anyone), Shield moves ZEC into the envelope, Unshield back to postcard, the letter is the note inside, and how to get ZEC. One line each, in our own words.

ZEC was about $1,368 on 3 Oct 2026. The send is 0.0001 ZEC (about $0.14) and comes back. Fees are about 0.0001 ZEC per transaction (ZIP 317 minimum), so shield, send and unshield cost about $0.40 in all.

Video: Receive, copy the transparent address, wait for the balance.

## 3. Shield

Title: Shield it

Sentence: In Zodl, tap Shield on your transparent balance.

No QR on this step. Zodl has a Shield button for transparent funds: a small fee, one block.

Video: ZEC lands transparent, tap Shield, shielded.

## 4. Seal a letter

Title: Seal a letter

Sentence: Write to yourself, one year from now. Then send it to yourself in Zodl.

Note field placeholder: "Dear me, one year from now…"

Controls:

- Letter box first. "Dear me, one year from now…", max 512 UTF-8 bytes, n / 512.
- One line: "In Zodl: Send → your own u1 address → 0.0001 → paste in Message."
- Copy letter (yellow). Copies the letter for Zodl's Message box. Works on one phone.
- Show QR (optional, second screen). Reveals "Your shielded address (u1…)"; with a valid u1 address and a letter, the QR of the ZIP-321 URI replaces the video for Zodl's camera to scan. Reject utest1, t1 and anything else.
- Amount 0.0001 ZEC, to their own address. No fee field.

Zodl's Send to box takes a plain address, not a payment link, and its gallery import did not read the QR from a screenshot on build day. One phone cannot scan itself, so Copy letter is the main path.

They send to themselves, then read the letter in their own Zodl on step 5. The site holds no receive address. Do not generate a wallet. Do not commit a seed.

Next goes to /5 only as a manual advance. The site cannot see their Zodl, so do not pretend to detect the send.

Video must show: scan QR, confirm send, memo visible on the confirmation screen.

## 5. Read it back

Title: Read it back

Sentence: Tap the new transaction in Zodl. Your letter is there.

Next goes to /6.

Video must show: Activity row, memo text matching what was typed.

## 6. Unshield

Title: Unshield

Sentence: Send a little ZEC to your own transparent address.

Button: Done. Goes to /done.

Video must show: shielded balance, own transparent address, send, transparent balance afterwards.

## Finish (/done)

Title: Sealed for a year.

Sentence: Only you can open it. Keep your recovery phrase and it stays yours.

Two panels: "You see" with the letter (kept in memory only), and "Everyone else sees": sender hidden, amount hidden, letter sealed.

Buttons: Post on X (yellow, full width), then Share image (a card drawn on the phone) and Remind me (a calendar file for one year from today, titled "Open your Zcash letter"). The card and the reminder never contain the letter or an address. Start over returns to /1.

## Motion

- Opening scene, every time the site opens (tap Zender to replay): "Zender", then "The blockchain is public." types out, then "Your letter isn't." in yellow, an envelope drops and a wax seal stamps it. Tap to begin.
- Each step: the title rises, the sentence types itself, the video pops in, buttons rise. Forward slides from the right, back from the left.
- Step 4: the QR materialises. When a clip ends, Next nudges.
- Finish: "hidden, hidden, sealed" unscramble from random characters, then a wax seal stamps the letter.
- Clip captions type out.
- Reduce motion turns all of it off.

## Footer on every screen

Real ZEC · small amounts · ZECATHON
