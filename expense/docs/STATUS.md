# Release status

## Working and verified

- Hosted single-owner HTTPS workspace with persistent SQLite data.
- Budgets, fee reservations, exact approvals, task credentials, revocation and idempotent recovery.
- CLI, MCP tools and bundled agent skill use the same policy engine.
- Original repository tests and five expense test files pass.
- Hosted sandbox browser journey passed: sign-in, task creation, approval, execution, response-loss recovery, expense download and mobile layout.
- Pinned Rust wallet and transaction inspector compile successfully, including in the production Docker build. Separate testnet wallets initialize and synchronize.

## Implemented, awaiting funded verification

Fixed PCZT construction, authorization inspection, pre-signing transaction persistence, signing, proving, broadcast and separate receiving-wallet confirmation are implemented. Runner-fixture tests cover sequence enforcement, final transaction drift and uncertain submission. These tests are not a real on-chain payment.

The public-testnet faucet rejected full Unified, Orchard-only and transparent funding addresses with `the wallet cannot pay this address`. No funded transaction, transaction ID or receiving confirmation has been verified. Funding requests report their actual status; a queued request is not proof of funding.

## Remaining limits

One owner; no mainnet; no encrypted database; no third-party paid service integration. The three included services compute useful results from supplied inputs, but are operated within this application. Reorg handling and service-provider settlement need further work before production funds are appropriate.
