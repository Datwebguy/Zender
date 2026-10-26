# Release status

## Working

- Local owner workspace with task creation, purchase review, approvals, credential issue, recovery, close and expense export.
- SQLite persistence; integer zatoshi accounting; budget reservations include fee caps.
- Task-scoped agent credentials stored as hashes, expiration and revocation.
- Stable request idempotency; changed-payload rejection; one durable execution claim; conservative recovery after restart.
- CLI and five-tool stdio MCP interface using the same API and policy engine.
- Bundled agent skill explaining purchase, approval and recovery behavior.
- Three sandbox services operate on supplied inputs: extraction, quote comparison and Markdown export.
- Testnet wallet proposal adapter with explicit broadcast gate.

## Verification completed

Original repository tests and all four expense test files pass. Expense tests exercise 16 scenarios across the spending engine, API authorization, CLI/MCP flow and wallet proposal adapter. HTTP requests are tested through the actual handler using an in-process transport; no external service is mocked into a successful live blockchain claim. The wallet command runner uses controlled JSON fixtures and is not a funded wallet test.

The MCP executable was also checked through its actual stdin/stdout interface. JavaScript syntax checks and whitespace checks pass.

## Not verified or not implemented

- Browser rendering: the execution sandbox denies Chromium's required socket operations. HTML/CSS and browser JavaScript are implemented, but visual and interactive browser QA has not run.
- Listening HTTP server: the execution sandbox denies binding a local TCP port. The server's request handlers and state flow are verified without a socket.
- Live Zcash payments: no funded wallet is configured, and automatic broadcasting is deliberately disabled until signing binds to the approved fixed proposal.
- External paid-service integration: the result contract is defined, but no third-party provider has been exercised end to end.
- Hosted deployment, multi-user accounts, encrypted storage and mainnet support.

This release is a working local sandbox foundation, not a completed on-chain hackathon submission. The next acceptance gate is a fixed-proposal signer plus a receiving testnet service proving amount, memo, confirmation and result delivery.
