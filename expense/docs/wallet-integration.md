# Wallet operations

## Configuration

| Setting | Purpose |
| --- | --- |
| `ZENDER_WALLET_MODE` | `sandbox`, `pczt-testnet` or `pczt-mainnet` |
| `ZENDER_WALLET_DIR` | Private wallet storage; use a separate directory for each network |
| `ZENDER_WALLET_BIN` | Wallet executable |
| `ZENDER_INSPECTOR_BIN` | Transaction inspector executable |
| `ZENDER_LIGHTWALLETD` | Server alias or host:port supported by the wallet |
| `ZENDER_CONFIRMATIONS` | Required mined confirmations; defaults to 1 on testnet and 10 on mainnet |
| `ZENDER_DATA_DIR` | Persistent task and expense storage |
| `ZENDER_OWNER_TOKEN` | Private owner credential |
| `ZENDER_PUBLIC_URL` | Public HTTPS origin |
| `ZENDER_WALLET_SOURCE` | Wallet source supplied to the build |
| `ZENDER_WALLET_REVISION` | Pinned wallet source revision |

Initialization checks both wallets against the configured network. Keep testnet and mainnet storage separate. Test coins and real ZEC must never share a task authorization.

## Payment lifecycle

The provider builds one PCZT, checks its recipient, amount, shielded outputs and fee, then persists the transaction ID and file hash before signing. After proving, it checks the transaction effects and task authorization again before submission.

An uncertain submission retains its transaction ID and budget reservation. Repeated execution does not enter the signer again. Recovery scans the receiving wallet for the recorded transaction and checks its amount, memo and mined confirmations before releasing the purchased result.

## Funding

Testnet funding uses the same faucet integration as the root application. Preserve the faucet request ID when a response is slow and poll that request rather than submitting another claim. Mainnet funding is an incoming ZEC transfer to the wallet's displayed mainnet address.

## Operations

Keep signing identities and wallet databases outside agent access. Preserve the pinned wallet licenses in built images. Back up wallet state and task records together. Never report a queued funding request as received coins, or a submitted payment as a delivered service.

For a release check, exercise approval, signed submission, confirmation, delivery, interrupted responses and recovery against the configured network. Record transaction evidence from the actual receiving wallet.
