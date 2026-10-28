# Current build: Zender agent expense wallet

Reconstructed from repository source at `79f01d48c7c29adfe765678e982a37114a12def6` (28 October 2026), with the password layer removed in this working change. This file records verified implementation, not a recovered transcript.

## Product

Private Zcash expense accounts for AI agent tasks. An owner funds a spending wallet, creates a task with a brief, budget, expiry and permitted services, and gives an agent a task-scoped credential. Requests obey the budget, recipient list and approval limit. The owner can approve exceptions, inspect payments and export an expense record.

The current backend is a single-owner workspace. Connecting the owner wallet authenticates that owner; it does not move the backend signing keys into the browser or create a separate wallet for every visitor.

## Components

- Plain HTML, CSS and JavaScript; no frontend compilation step. The root page introduces the product and `/tasks` opens the expense workspace.
- `expense/server.mjs`: Node 24 HTTP API, wallet message authentication and remote MCP. `expense/lib/engine.mjs`: task permissions, budget reservations, approvals and recovery. `expense/lib/store.mjs`: SQLite persistence.
- `expense/lib/pczt-provider.mjs`: separate testnet/mainnet wallets, inspected transaction proposals, signing, proving, broadcasting and receiving confirmation.
- `expense/bin/`: CLI and MCP clients. Paid-service tools support ZEC x402 v2 challenges and collection after confirmed payment.
- `vercel.json` and `api/expenses.js`: site routing and the expense backend proxy. `expense/Dockerfile`: Rust wallet build and Node runtime with persistent state supplied at deployment. The wallet source is a required build argument; its revision is pinned.

## Last saved work

1. `d2d7788`: approved recipients and automatic payments bounded by the task approval limit, including fees.
2. `31c3b60`: remote MCP and paid-service request/collection tools, with task isolation and retry coverage.
3. `79f01d4`: a 15-second overall paid-service request deadline.

Wallet sign-in replaces the password layer. First pairing requires the owner setup key; later access requires a signed challenge from the bound wallet. Agent permissions do not change.

## Verification

Run `npm test` and `npm run test:expenses`. Browser verification is `expense/tests/browser.mjs` and needs Playwright plus a fresh workspace and its owner setup key. Testnet transaction evidence in `expense/docs/testnet-payment.json` belongs to the earlier recorded run, not to this change. A container rebuild and live wallet/paid-service journey must be checked before claiming a new production release.

## Recovered planning material

The October 3 [brief](docs/archive/2026-10-03/BRIEF.md), [build](docs/archive/2026-10-03/BUILD.md), [research links](docs/archive/2026-10-03/RESOURCES.md), [screens](docs/archive/2026-10-03/SCREENS.md) and [submission](docs/archive/2026-10-03/SUBMISSION.md) are preserved as historical documents. They were removed by `34d66af` and describe the older onboarding product.

Those documents mention a Wildcard submission. The owner supplied the current multi-track announcement in this session; it is recorded in [the hackathon brief](docs/HACKATHON.md). Newer product research was not found in the reachable Git history, branch files or PR discussions. Do not use the archived submission as the complete scope of the current wallet build.
