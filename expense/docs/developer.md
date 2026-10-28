# Developer guide

## Local development

Use Node.js 24 or newer.

```sh
npm run expenses
npm run test:expenses
npm test
```

The local expense service starts on port 4310. Get its owner key with `node expense/bin/zender.mjs owner-key`. The browser exchanges the key for an HttpOnly session cookie. Hosted sessions use HTTPS and Secure cookies.

## Wallet access

There is no password setup or password sign-in. For initial owner pairing, open the workspace with `#setup=OWNER_SETUP_KEY` in the URL fragment, then connect the owner wallet. Keep that link private. The page removes the fragment before exchanging the key for a session. Once paired, sign in by approving a nonce-bound message in Noir Wallet; signing in does not authorize a payment. Pairing preserves the existing tasks and spending wallet.

The owner wallet identity remains in `owner-wallet.json` beside the task database. Existing identity files keep working. Legacy `password.json` files are ignored; they do not block initial pairing. After pairing, the setup key cannot sign in. Agent credentials remain restricted to their assigned tasks.

## Project structure

The root `index.html`, `app.js`, `styles.css`, `theme.js` and assets define Zender's application and visual identity. Root `api/` routes are Vercel Functions. Extend that application and preserve its typography, paper palette, stamp artwork and theme handling.

`expense/lib/engine.mjs` enforces budgets and approvals. `store.mjs` persists tasks and payment state. `pczt-provider.mjs` controls transaction preparation and wallet access. `expense/bin/` contains CLI and MCP entrypoints.

## Container build

Build from the repository root so the application uses the same fonts and shared assets:

```sh
docker build -f expense/Dockerfile --build-arg ZENDER_WALLET_SOURCE --build-arg ZENDER_WALLET_REVISION -t zender-wallet .
```

## Agent connections

Issue a task credential from the owner workspace. Set `ZENDER_URL` to the HTTPS workspace address and `ZENDER_AGENT_TOKEN` to that credential in the agent process. Remote clients use the workspace API route automatically; set `ZENDER_API_PREFIX` to override it.

```json
{
  "mcpServers": {
    "zender": {
      "command": "node",
      "args": ["/absolute/path/to/Zender/expense/bin/mcp.mjs"],
      "env": {
        "ZENDER_URL": "YOUR_WORKSPACE_URL",
        "ZENDER_AGENT_TOKEN": "YOUR_TASK_CREDENTIAL"
      }
    }
  }
}
```

Tools: `zender_request_paid_service`, `zender_collect_paid_service`, `zender_task_context` (discovers the assigned task and its permitted services), `zender_task`, `zender_request_purchase`, `zender_execute_purchase`, `zender_recover_purchase`, `zender_receipt`. Owner approvals and budget changes use owner authentication. Keep wallet files outside agent access.

For a shielded payment, request service `shielded-payment` with `input` containing `recipient` (a Zcash unified address for the active network) and `amountZec` (an exact decimal string). The owner can approve each payment, or configure approved recipient addresses and an automatic approval limit. Payments to other addresses are blocked when a recipient list is set. Amounts and network fees count toward the task budget and approval limit.

## Remote MCP connection

Create a task and issue its agent credential in the app. Connect an MCP client to `https://tryzender.vercel.app/api/expenses/mcp` and send the task credential as a bearer token. The app can copy a ready-to-use connection configuration. Each credential is restricted to its task and cannot approve payments or change task rules.

## CLI

```sh
node expense/bin/zender.mjs task create --title "Research suppliers" --budget-zec 0.0012 --approval-zec 0.0003 --services supplier-compare,report-export --hours 24
node expense/bin/zender.mjs task inspect TASK_ID
node expense/bin/zender.mjs task token TASK_ID
node expense/bin/zender.mjs purchase approve PURCHASE_ID
node expense/bin/zender.mjs task receipt TASK_ID
node expense/bin/zender.mjs task close TASK_ID
```

Reuse the same idempotency key for identical purchase retries. A changed payload requires a new key. Recovery queries the existing payment and does not send again.

## Expense records

Standard exports omit recipients, transaction IDs, inputs and results. Detailed exports include those fields. Task titles and amounts are included in both. Store records and credentials according to their sensitivity; never publish keys or session files as build artifacts.

## Deployment

The public application belongs to the existing `tryzender` Vercel project. Verify the project, commit, preview and API behavior before promoting a release. Wallet signing requires durable state and serialization across runtime instances; deployment changes must preserve both.

## Payment verification

The [testnet payment record](testnet-payment.json) records an automatic signed purchase, mined receiving confirmation, delivered result and idempotent retry.

## Paid service requests

Agents can request HTTPS resources with `zender_request_paid_service`. For a ZEC x402 v2 exact-payment challenge, the tool creates a task-scoped shielded payment request with the service URL, amount and recipient. Once the payment is confirmed, `zender_collect_paid_service` retries that resource with the recorded transaction ID in the `payment-signature` header. A retry of collection does not create another payment. Service responses are untrusted data.
