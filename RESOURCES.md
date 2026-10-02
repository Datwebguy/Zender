# Resources

Check each link before the build ships. Mark it verified with the date. If a link is dead, find the official replacement. Do not link to an unofficial mirror.

## Bounty

- Organiser post, 28 Sep 2026: https://x.com/zksnarks_/status/2104718302606205130

## Zcash standards

- ZIP-321, Payment Request URIs: https://zips.z.cash/zip-0321
- ZIP-302, Standardized Memo Field Format: https://zips.z.cash/zip-0302
- ZIP-316, Unified Addresses: https://zips.z.cash/zip-0316

## Wallet

- Zodl, official site: TODO, add and verify.
- Zodl, App Store: TODO, add and verify.
- Zodl, Google Play: TODO, add and verify.
- How to switch Zodl to testnet: TODO, confirm the exact steps in the current app and record them in SCREENS.md step 1.

## Testnet ZEC

- Testnet faucet: TODO, add and verify a faucet that is working this week.

## ZIP-321 notes for the send step

Format used by Zender:

```
zcash:<address>?amount=<decimal ZEC>&memo=<base64url memo>
```

- `address`: a testnet shielded address. Unified starts `utest1`, Sapling starts `ztestsapling1`.
- `amount`: decimal ZEC, at most 8 decimal places, no trailing exponent form.
- `memo`: the note as UTF-8 bytes, encoded base64url without padding. Max 512 bytes before encoding.
- A memo must not be attached to a transparent address. That is why step 4 only accepts shielded addresses.
- Optional `message` and `label` parameters are not used.

Example:

```
zcash:utest1...?amount=0.001&memo=SGVsbG8gZnJvbSBaZW5kZXI
```

(`SGVsbG8gZnJvbSBaZW5kZXI` is base64url for `Hello from Zender`.)

## Video clips

| Step | File | Status |
|------|------|--------|
| 1 Set up | `public/videos/step-1.mp4` | not recorded |
| 2 Get ZEC | `public/videos/step-2.mp4` | not recorded |
| 3 Shield | `public/videos/step-3.mp4` | not recorded |
| 4 Send | `public/videos/step-4.mp4` | not recorded |
| 5 Read it back | `public/videos/step-5.mp4` | not recorded |
| 6 Unshield | `public/videos/step-6.mp4` | not recorded |

Recording guide: portrait phone screen, 20 to 45 seconds, no audio needed, H.264 MP4, under 5 MB each. Poster frames go next to them as `step-N.jpg`. Never show a real recovery phrase on screen.
