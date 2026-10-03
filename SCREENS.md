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

Title: Install Zodl

Sentence: Install it and tap Create New Wallet. About 10 minutes in all.

Button under the video: Get Zodl. Links to https://zodl.com/

Video: welcome screen, tap Create New Wallet, wallet ready. Creating a wallet shows no phrase; the phrase is exported later from Advanced Settings.

## 2. Get a little ZEC

Title: Get a little ZEC

Sentence: Buy a dollar or two and send it to your transparent address.

Buttons: Gemini, Coinbase, Kraken. Names only, no logos. Each opens that exchange's Zcash page:
- https://www.gemini.com/prices/zcash
- https://www.coinbase.com/price/zcash
- https://www.kraken.com/buy/zec

ZEC was about $1,368 on 3 Oct 2026. The send is 0.0001 ZEC (about $0.14) and comes back. Fees are about 0.0001 ZEC per transaction (ZIP 317 minimum), so shield, send and unshield cost about $0.40 in all.

Video: Receive, copy the transparent address, wait for the balance.

## 3. Shield

Title: Shield it

Sentence: Send it to your own shielded address.

No QR on this step. They do it inside Zodl.

Video: copy the shielded address, Send, shielded balance afterwards.

## 4. Send a shielded note

Title: Send a shielded note

Sentence: Type a note, scan the QR in Zodl, and confirm.

Controls:

- Address field: Your shielded address (u1…). Empty. The visitor pastes their own Zcash Shielded Address from Zodl Receive. Accept only a mainnet unified address with a valid Bech32m checksum. Reject testnet utest1, transparent t1 and anything else with one short line.
- Note field. Empty. Max 512 UTF-8 bytes. Show n / 512.
- Amount fixed at 0.0001 ZEC. It goes to their own address. Do not let them edit the fee.
- QR of the ZIP-321 URI to their own address: amount 0.0001, memo the note, message Zender.
- Copy link, same URI.
- Show link, same URI as text.
- No QR until both the address and the note are valid.

They send to themselves, then read the note in their own Activity on step 5. The site holds no receive address. RECEIVE_ADDRESS in config.js stays empty. Do not generate a wallet. Do not commit a seed.

Next goes to /5 only as a manual advance. The site cannot see their Zodl, so do not pretend to detect the send.

Video must show: scan QR, confirm send, memo visible on the confirmation screen.

## 5. Read it back

Title: Read it back

Sentence: Open Activity in Zodl and find the same note.

Next goes to /6.

Video must show: Activity row, memo text matching what was typed.

## 6. Unshield

Title: Unshield

Sentence: Send a little ZEC to your own transparent address.

Button: Done. Goes to /done.

Video must show: shielded balance, own transparent address, send, transparent balance afterwards.

## Finish (/done)

Title: Sealed.

Sentence: Your note went out and came back. Only you can read it.

Two panels: "You see" with the note (kept in memory only), and "Everyone else sees": sender hidden, amount hidden, note sealed.

Buttons: Post on X (yellow, opens an X post with the link, @zksnarks_ and #ZECATHON) and Share image (a card drawn on the phone, shared through the phone's share sheet or saved). The card never shows the note or an address. Start over returns to /1.

## Progress

The last step reached is saved on the phone (localStorage, step number only). Opening the site at / resumes there.

## Footer on every screen

Real ZEC · small amounts · ZECATHON
