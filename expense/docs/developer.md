# Developer guide

## Local development

Use Node.js 24 or newer.

```sh
npm run expenses
npm run test:expenses
npm test
```

The local expense service starts on port 4310. Get its owner key with `node expense/bin/zender.mjs owner-key`. The browser exchanges the key for an HttpOnly session cookie. Hosted sessions use HTTPS and Secure cookies.

## Project structure

The root `index.html`, `app.js`, `styles.css`, `theme.js` and assets define Zender's application and visual identity. Root `api/` routes are Vercel Functions. Extend that application and preserve its typography, paper palette, stamp artwork and theme handling.

`expense/lib/engine.mjs` enforces budgets and approvals. `store.mjs` persists tasks and payment state. `pczt-provider.mjs` controls transaction preparation and wallet access. `expense/bin/` contains CLI and MCP entrypoints.

## Container build

Build from the repository root so the application uses the same fonts and shared assets:

```sh
docker build -f expense/Dockerfile --build-arg ZENDER_WALLET_SOURCE --build-arg ZENDER_WALLET_REVISION -t zender-wallet .
```

## Agent connections

Issue a task credential from the owner workspace. Set `ZENDER_URL` to the HTTPS workspace address and `ZENDER_AGENT_TOKEN` to that credential in the agent process.

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

Tools: `zender_task`, `zender_request_purchase`, `zender_execute_purchase`, `zender_recover_purchase`, `zender_receipt`. Owner approvals and budget changes use owner authentication. Keep wallet files outside agent access.

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
