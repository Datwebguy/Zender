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
- Tap the right side of the screen for next, the left side for back. Buttons, links and fields keep their own tap. Step 1 says so in one line.

## 1. Install Zodl

Title: Install Zodl

Sentence: Install the wallet, then switch it to testnet.

Button under the video: Open Zodl. Links to https://zodl.com/

Next goes to /2.

Video must show: store install, open app, settings, testnet on.

## 2. Get testnet ZEC

Title: Get testnet ZEC

Sentence: Request testnet ZEC, then wait until Zodl shows a balance.

Use "Request 0.1 TAZ" only while the primary faucet is the one the button opens.

Button: Open faucet. Primary faucet: https://zcashfaucet.jinolabs.xyz

Fallback faucet page: https://zechub.wiki/tools?tool=faucet which requests from fauzec.com. Use this only if the primary faucet is down. Say which one the button opens.

Build day, 2 Oct 2026: the primary faucet reset every connection, so the button opens the fallback and the hint under it says so. config.js ACTIVE_FAUCET switches between them.

Next goes to /3.

Video must show: copy a testnet unified address from Zodl, paste it into the faucet, wait for a balance.

## 3. Shield

Title: Shield it

Sentence: Send the faucet ZEC to your own unified address.

No QR on this step. They do it inside Zodl.

Next goes to /4.

Video must show: transparent balance, own unified address, send, shielded balance afterwards.

## 4. Send a shielded note

Title: Send a shielded note

Sentence: Type a note, scan the QR in Zodl, and confirm.

Controls:

- Address field: Your testnet unified address. Empty. The visitor pastes their own utest1 address from Zodl Receive. Accept only a testnet unified address with a valid Bech32m checksum. Reject mainnet u1 with a message telling them to switch Zodl to testnet. Reject anything else, including Sapling and transparent addresses.
- Note field. Empty. Max 512 UTF-8 bytes. Show n / 512.
- Amount fixed at 0.001 testnet ZEC. Do not let them edit the fee.
- QR of the ZIP-321 URI to their own address: amount 0.001, memo the note, message Zender.
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

Sentence: Send the testnet ZEC to your own transparent address.

Button: Done. Returns to /1.

Video must show: shielded balance, own transparent address, send, transparent balance afterwards.

## Footer on every screen

Testnet only. No account. Notes stay in Zodl.
