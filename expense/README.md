# Zender

Private expense accounts for agent tasks. Give a task a budget, choose permitted services, approve larger purchases, and keep a record of what was paid for and delivered.

This is an executable local sandbox release. It includes a durable spending engine, web workspace, CLI, MCP server and agent skill. Sandbox purchases use simulated payments and real computation over supplied inputs. They do not move ZEC. There is no mainnet support.

## Run

Requires Node.js 24 or newer. No dependency installation or external account is required for the sandbox.

```sh
cd expense
npm start
```

Open `http://127.0.0.1:4310`. In another terminal, get the workspace owner key:

```sh
node bin/zender.mjs owner-key
```

Paste it into the sign-in page. The key is generated on first startup and stored with mode 0600 in `.zender/owner.key`. It is not printed by server startup. The service binds only to loopback, refuses unrecognized hosts and cross-origin requests, and uses an HttpOnly same-site session cookie for the browser. This release is intended for one trusted owner on one machine, not shared hosting.

## Complete a task

Click **Run a walkthrough** in the workspace, or run:

```sh
node bin/zender.mjs demo
```

The walkthrough creates a task, compares supplied supplier quotes, simulates a response lost after payment, recovers the original purchase without another payment, and requests an above-threshold report purchase. Both walkthroughs recover the comparison automatically; the activity record preserves the interrupted and recovered states. Use the purchase dialog’s fault simulation option to exercise recovery manually. Approve the report purchase in the workspace, execute it, and export the expense record.

The supplied quotes are walkthrough inputs, not market data. Services in the sandbox are local deterministic tools, not an LLM or external search service. Their prices and fees are sandbox configuration.

## Owner CLI

```sh
node bin/zender.mjs task create --title "Research suppliers" --budget-zec 0.0012 --approval-zec 0.0003 --services document-extract,supplier-compare,report-export --hours 24
node bin/zender.mjs task inspect TASK_ID
node bin/zender.mjs task token TASK_ID
node bin/zender.mjs purchase approve PURCHASE_ID
node bin/zender.mjs purchase reject PURCHASE_ID
node bin/zender.mjs task receipt TASK_ID
node bin/zender.mjs task close TASK_ID
```

Budgets and approval thresholds include the maximum network fee reserved for a purchase. Amounts are integer zatoshis throughout the spending engine. The `--budget-zec` and `--approval-zec` interfaces accept decimal strings with up to eight places. A task budget is a spending authorization, not a deposit, escrow balance or promise of wallet funding.

Closing a task cancels purchases that have not started and revokes its agent credentials. Money already sent is not refunded. Uncertain payments retain a reservation and require reconciliation. A task expiration prevents new payments and approvals; it does not undo a payment in flight.

## Connect an agent

Issue a credential in **Connect an agent**, or with `task token`. The credential is returned once and only its hash is stored. It is limited to its task and expires with the authorization. Keep it private: it authorizes spending within that task's rules.

Set `ZENDER_AGENT_TOKEN` in the agent process. Start the MCP server with:

```sh
node bin/mcp.mjs
```

Example MCP client configuration; replace the path and token locally:

```json
{
  "mcpServers": {
    "zender": {
      "command": "node",
      "args": ["/absolute/path/to/Zender/expense/bin/mcp.mjs"],
      "env": { "ZENDER_AGENT_TOKEN": "YOUR_TASK_CREDENTIAL" }
    }
  }
}
```

The stdio server exposes `zender_task`, `zender_request_purchase`, `zender_execute_purchase`, `zender_recover_purchase`, and `zender_receipt`. It does not expose owner approval, policy changes or wallet secrets. Install the bundled [skill](skills/zender/SKILL.md) in your agent's skills directory.

The same credential works with the CLI. Always supply a stable `--key` for a purchase and reuse it for identical retries. Changing a purchase while reusing its key is rejected.

## Zcash adapter status

The testnet adapter checks wallet proposal output through an installed Zipher CLI. It always selects testnet and uses a dedicated wallet directory. It does not bundle third-party wallet code or require seed phrases through the Zender interface.

**Automatic live broadcasting is disabled.** The inspected CLI rebuilds a proposal during confirmation, so comparing a preliminary quote is insufficient to bind signing to the approved outputs and maximum fee. A compatible fixed-proposal signing adapter and funded testnet verification are required before live agent spending can be enabled. Do not represent this release as a working on-chain agent wallet.

See [wallet integration](docs/wallet-integration.md) for the exact boundary and release gates. The original Zender tutorial remains separate from this application.

## Privacy and trust

Expense records stay in the local SQLite database. Redacted exports omit recipients, transaction IDs, inputs and results; task title, service names and amounts remain visible. A detailed CLI export with `--details` explicitly includes sensitive fields. Local database files contain purchase details in plaintext and rely on filesystem protection; encrypted storage is not implemented.

Financial controls live in the service, not the skill or model prompt. They protect against an agent limited to the task-scoped API. An agent with shell access to the owner's service directory or OS account could read or modify the owner key and database. Run untrusted agents in a separate account or container without those files. This release does not supply an OS isolation mechanism.

Shielded transactions hide selected on-chain information. They do not hide purchases from the merchant or the local wallet operator and do not by themselves conceal network metadata. A recorded receipt is not proof that purchased information is accurate.

## Verification

```sh
npm test
```

Tests cover budget reservations, approval enforcement, cross-task access, idempotency, concurrent execution, response-loss recovery, persistence across restart, revocation, expiry, redacted exports, CLI and MCP flows, and wallet proposal validation. HTTP handler integration tests use an in-process transport so they run without a listening port. Browser rendering and live blockchain payments are separate verification gates.

## Layout

| Path | Responsibility |
| --- | --- |
| `lib/engine.mjs` | Authorization, purchase state and budget accounting |
| `lib/store.mjs` | SQLite persistence and transactions |
| `lib/providers.mjs` | Sandbox services and gated testnet adapter |
| `server.mjs` | Local HTTP service, sessions and task-scoped access |
| `public/` | Responsive owner workspace |
| `bin/zender.mjs` | Owner and agent CLI |
| `bin/mcp.mjs` | Task-scoped MCP tools |
| `skills/zender/` | Agent operating instructions |

Required notices for existing repository assets remain in the root license.
