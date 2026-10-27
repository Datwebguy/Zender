# Wallet integration

## Fixed transaction path

`ZENDER_WALLET_MODE=pczt-testnet` selects the fixed-PCZT provider. The Docker build compiles a pinned wallet revision plus Zender's transaction inspector. Source location is a platform build argument; mandatory wallet licenses are installed in the image.

The provider creates separate payer and merchant wallets. It constructs one transaction, inspects recipient, amount, shielded outputs and fee, and persists its transaction ID and file hash before signing. It signs and proves that file, inspects the final effects again, rechecks task authorization, then submits it. Submission uncertainty retains the transaction ID and budget reservation. Recovery only scans the merchant wallet; it never submits another transaction.

Delivery requires a mined transaction with the exact ID and an incoming shielded output matching the purchase amount and memo. The included services produce their result only after this check. One confirmation is required; reorg rollback is not implemented. Both wallets are hosted by the same operator, so this is wallet-level independent receipt verification, not an independent merchant organization.

## Configuration

| Variable | Meaning |
| --- | --- |
| `ZENDER_WALLET_MODE` | `sandbox` by default; `pczt-testnet` enables this integration |
| `ZENDER_WALLET_BIN` | Wallet executable, default `zcash-devtool` |
| `ZENDER_INSPECTOR_BIN` | Inspector executable, default `zender-inspect` |
| `ZENDER_WALLET_DIR` | Private wallet storage, defaults below the data directory |
| `ZENDER_LIGHTWALLETD` | Wallet server alias, default `zecrocks` |
| `ZENDER_DATA_DIR` | Persistent SQLite and owner-key directory |
| `ZENDER_OWNER_TOKEN` | Private owner sign-in credential |
| `ZENDER_PUBLIC_URL` | Public HTTPS origin; enables public binding and Secure cookies |
| `ZENDER_WALLET_SOURCE` | Docker build argument for the pinned wallet source |
| `ZENDER_WALLET_REVISION` | Pinned source revision, `0b3436bb8d235c67cd36b800cb45a7b1b489c415` |

Funding uses valueless public-testnet coins. The free faucet is an external dependency and may reject a request. Its status is displayed without treating a queued request as funding. Mainnet is unsupported.

The older `testnet` proposal adapter remains gated and cannot broadcast, because its confirmation command can rebuild the transaction.

## Verification boundary

The binaries build, wallets initialize and synchronize, and controlled-runner authorization tests pass. Public-testnet funding was rejected by the faucet; signing through confirmed receipt has not yet been demonstrated with funded coins. Do not describe this as a verified on-chain release until a transaction ID, mined height and matching receiving output are recorded.

Keys and purchase records remain plaintext on a filesystem-protected persistent volume. Agents receive task-scoped API credentials, never wallet keys. Agents with access to the server OS could bypass these boundaries. Multi-user tenancy, encrypted storage, reorg reconciliation and external merchant operation are not implemented.
