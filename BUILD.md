# Build

Static site. No backend. Phone first, because the bounty user is on a phone installing Zodl.

## Stack

Plain HTML, CSS, and one JS file. No React. No analytics script. No Google fonts. Host the six videos yourself, same origin, so a third party does not see the visitor.

Suggested host: any static host. A pages.dev or similar URL is enough for Sunday.

## Files

```
index.html          shell, chrome, video, next
steps.js            the six titles, sentences, video paths, external links
zip321.js           UTF-8 to base64url memo, URI builder
config.js           testnet unified receive address, amount 0.001
styles.css
videos/1.mp4 ... 6.mp4
```

config.js holds only a public testnet address. Never a seed, spending key, or viewing key.

## ZIP-321

Encode the note as UTF-8. Reject if the byte length is over 512. Base64url without padding. Build:

```
zcash: + address + ?amount=0.001&memo= + memo + &message=Zender
```

Render that string as a QR and as a copy button. If Zodl does not scan the QR, the copy link is the fallback. Test both before calling it done.

Amount is 0.001 so a 0.1 TAZ faucet drip can cover it and the fee. Do not set a fee field. Zodl applies ZIP 317.

## Videos

Six clips, one per step, recorded on testnet in Zodl. Mute by default. Controls visible. Each clip under about 40 seconds.

Until a clip exists, the player area stays, with the sentence as the instruction. Do not ship a fake play button that does nothing. Label it "Video coming" only if the file is missing, and replace it before the tweet.

## Privacy

- No analytics, pixels, or tag managers.
- No seed input.
- No viewing-key input.
- Note text stays in the browser and in the QR. Do not POST it.
- External links are only Zodl and the faucet, opened by the visitor.

## Test before tweet

1. Fresh Zodl testnet wallet.
2. Faucet drip arrives.
3. Shield works.
4. QR scan pays 0.001 and the memo matches the typed note.
5. Activity shows the note.
6. Unshield to the transparent address works.
7. Page has no third-party requests. Check the network panel.
