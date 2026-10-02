# Screens

Mobile first. Design at 360px wide, then check it scales up. One column. No horizontal scroll.

## Layout shared by every step

```
[ Zender ]                      [ 3 / 6 ]
-----------------------------------------
Step title
[        video player 16:9          ]
What to do
  1. ...
  2. ...
  3. ...
What you should see
  ...
[ Back ]                       [ Next ]
```

- Progress shows `n / 6` and a row of six dots. Tapping a dot jumps to that step.
- The video is a `<video controls playsinline preload="metadata">` with a poster. If the clip file is missing, show the poster with "Video coming soon" and keep the instructions. The step must work without the video.
- Instructions are a numbered list. Each item is one action.
- "What you should see" describes the Zodl screen after the action, so the visitor can tell it worked.
- Next is always enabled. Do not gate progress on anything we cannot verify.
- Each step has its own URL: `/#/1` to `/#/6`. Back button and refresh keep the step.

## 0. Welcome

- Title: "Your first private Zcash transaction"
- One paragraph: six steps, about 15 minutes, testnet, no real money.
- What you need: a phone with Zodl, and this page.
- Button: "Start".

## 1. Set up

- Install Zodl from the official store link (see RESOURCES.md).
- Create a new wallet on testnet.
- Write the recovery phrase on paper. Do not screenshot it. Zender will never ask for it.

## 2. Get ZEC

- In Zodl, open Receive and copy the transparent address.
- Open the testnet faucet (link in RESOURCES.md), paste the address, request coins.
- Explain in one line: transparent is public, like Bitcoin. We fix that next.
- What you should see: a transparent balance after the transaction confirms. Say it can take a few minutes.

## 3. Shield

- In Zodl, use Shield on the transparent balance.
- One line: shielded means amount, sender, and receiver are encrypted.
- What you should see: the balance moves to shielded.

## 4. Send

The only interactive screen.

Form:
- **Your shielded address** (text, paste button). Accepts a testnet unified (`utest1…`) or Sapling (`ztestsapling1…`) address. Reject anything else, including mainnet, with a plain message.
- **Amount** (number, default `0.001`, min `0.00000001`, max 8 decimals).
- **Your note** (textarea). Live byte counter, max 512 bytes UTF-8.

Output, updated as they type:
- QR of the ZIP-321 URI, large enough to scan from a laptop screen.
- The URI as text with a Copy button and an "Open in wallet" link (`href` is the URI, for when the page is open on the phone itself).

Instructions:
- On the phone: tap "Open in wallet". On a laptop: scan the QR from Zodl's scanner.
- Check the address, amount, and note in Zodl, then send.

## 5. Read it back

- In Zodl, open Activity and tap the new transaction.
- What you should see: the note they wrote. Only they can read it.
- Show their note on this page (from the step 4 form, kept in memory or `localStorage`) so they can compare.

## 6. Unshield

- In Zodl, send some ZEC to a transparent address. Their own transparent address from step 2 works.
- One line: unshielding moves funds back to the public pool. Use it only when you have to, for example when a service only accepts transparent addresses.
- What you should see: the transparent balance goes up.

## Done

- "You went from zero to a shielded transaction."
- Recap list of the six steps with ticks.
- Link to start over.

## Visual

- System font stack. No web fonts loaded from a CDN.
- Light and dark from `prefers-color-scheme`.
- Tap targets at least 44px.
- Text contrast meets WCAG AA.
