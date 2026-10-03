# Resources

Use these. If a link is dead on build day, record that in the README.

## Bounty

- Announcement: https://x.com/zksnarks_/status/2104718302606205130
- Wildcard poster post it quotes: https://x.com/zksnarks_/status/2104699888957297040
- Site: https://thezecathon.com
- Submit by tweet, tag @zksnarks_, deadline Sunday 4 Oct 2026
- Required topics: wallet setup, getting ZEC, shielding and unshielding, sending and receiving

## Wallet

- Zodl site: https://zodl.com/
- Zodl is the rebrand of Zashi. iOS rebrand post: https://zodl.com/zodl-is-live-on-app-store/
- Android rebrand post: https://zodl.com/zodl-is-live-on-android/
- Memo support in Zodl: https://support.zodl.com/article/41-using-the-zcash-memo-field
- Org repo named in the hack brief: https://github.com/zodl-inc
- Store buttons: take them from https://zodl.com/ on build day. Do not guess App Store or Play URLs.

Zodl memo facts from their support page, checked June 2026: memos ride on shielded sends, recipient can read them in Activity, max they document as 512 characters, no memo to a transparent address.

## Network

- Zodl store and F-Droid builds are mainnet only. Android releases attach only app-zcashmainnet APKs: https://github.com/zodl-inc/zodl-android/releases
- Zodl's F-Droid repo lists one app, mainnet: https://foss.zodl.com/
- Testnet faucet: https://fauzec.com/ (the one behind zechub.wiki's faucet tool). Checked 3 Oct 2026: it sends to Unified (utest1) and Sapling addresses only, transparent is on its roadmap, with a Turnstile check and per-address limits.

## Payment request

- ZIP 321: https://zips.z.cash/zip-0321
- Memo param is base64url, no = padding.
- Decoded memo must be 512 bytes or less. Shorter memos are padded with zeros to 512 by the protocol.
- A memo on a transparent address makes the URI invalid.
- Example shape: zcash:<own-u1-address>?amount=0.0001&memo=<base64url>&message=Zender

Message is display text for the wallet. Memo is the note. Do not put the note only in message.

## Protocol

- Zcash docs: https://zcash.readthedocs.io/en/latest/
- Memo RPC notes: https://zcash.readthedocs.io/en/latest/rtd_pages/memos.html
- ZIPs index: https://zips.z.cash/
- Fee policy, do not set a custom fee: https://zips.z.cash/zip-0317
- Lightwalletd: https://github.com/zcash/lightwalletd
- Public light servers: https://github.com/ZecHub/zechub/blob/main/site/Zcash_Tech/Lightwallet_Nodes.md

The site does not talk to lightwalletd. Zodl does.

## Do not copy

- First Shield, already submitted: https://www.firstshield.xyz/ and https://x.com/periagoge1/status/2105170267580645638
- create-zcash-app: https://create-zcash-app.pages.dev/
- ZCHAT site is zsend.xyz. Do not use that domain.
