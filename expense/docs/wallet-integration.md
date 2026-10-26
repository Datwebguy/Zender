# Wallet integration boundary

## Current state

Sandbox payments are durable simulations. The testnet integration can check wallet proposals but cannot broadcast. No live payment has been verified for this release.

The wallet executable, dedicated data directory, network connection and test funds are external prerequisites. The owner provisions the wallet outside the agent runtime. No wallet keys pass through MCP or HTTP arguments.

## Configuration

The server accepts these settings for integration development:

| Setting | Meaning |
| --- | --- |
| `ZENDER_WALLET_MODE` | `sandbox` (default) or `testnet`; other values fail |
| `ZENDER_WALLET_BIN` | Absolute path to installed wallet CLI, default `zipher-cli` |
| `ZENDER_WALLET_DIR` | Dedicated wallet data directory |
| `ZENDER_LIGHTWALLETD` | Testnet lightwallet server URL |
| `ZENDER_SERVICES_FILE` | Path to owner-configured service JSON |
| `ZENDER_DATA_DIR` | Local database and owner key directory |
| `PORT` | Local HTTP port, default 4310 |

A testnet service entry has `id`, `name`, integer `priceZat`, integer `feeZat` (maximum fee reserve), `recipient` (testnet Unified Address) and HTTPS `resultUrl`. Service destinations are configured by the owner, never supplied by an agent. This interface is Zender's service contract, not a claim of generic x402 or MPP compatibility.

## Proposal check

The adapter invokes the wallet without a shell:

```text
zipher-cli --testnet --data-dir DIRECTORY --server SERVER send propose --to ADDRESS --amount ZATOSHIS --memo "Zender PURCHASE_ID" --context-id PURCHASE_ID
```

It checks the JSON envelope and `address`, `send_amount`, and `fee` fields. A mismatched amount or destination, invalid response, or fee above the authorization is refused. A wallet-directory lock prevents concurrent proposal modification by this adapter. The directory must not be shared with unrelated wallet tools.

The existing `send confirm` operation can rebuild its proposal. It is deliberately not called: validating one quote does not enforce the contents of a later transaction. This gate must be replaced by fixed-proposal construction and verification before enabling automatic spending.

## Delivery contract

After an independently verified payment backend is added, a configured result endpoint receives:

```json
{ "purchaseId": "PURCHASE_ID", "txid": "TRANSACTION_ID", "input": {} }
```

It must verify receipt in its own wallet, match the recipient, amount and purchase memo, prevent replay, and return:

```json
{ "purchaseId": "PURCHASE_ID", "txid": "TRANSACTION_ID", "status": "delivered", "result": {} }
```

HTTP 202 or another non-delivered result does not close the purchase. Redirects are refused. Recovery uses a recorded transaction; it does not send again. If signing may have broadcast but no transaction ID was recorded, the purchase stays uncertain for operator reconciliation.

## Required before live spending

- Bind authorization to a fixed set of transaction outputs, memo and maximum total fee. Re-check that authorization immediately before signing.
- Keep signer material and policy mutation outside the agent's OS authority.
- Persist transaction construction identity before broadcast; reconcile interrupted submissions without re-signing or duplicate payment.
- Prove confirmation and memo/amount matching through a receiving testnet wallet, including lost responses and duplicate provider requests.
- Verify fee changes, insufficient funds, expiration during signing, reorgs, service outage, and restart recovery.
- Record the tested wallet version, network, confirmation policy and known limitations.

Mainnet, hosted multi-user authentication, encrypted local storage, wallet provisioning, and universal paid-service discovery are outside this release.
