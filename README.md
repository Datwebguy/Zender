# Zender

Private Zcash expense accounts for AI agent tasks.

Create a task, give it a budget and choose the services an agent may use. Connect an agent with a task-scoped credential, review purchases that need your approval, and follow payments, results and expense records in one workspace.

## How it works

1. Create a task and set its budget, permitted services and expiry.
2. Connect an agent to that task.
3. Review purchases that need approval.
4. Track the payment and receive the result.
5. Export the expense record or close the task when the work is done.

Zender uses shielded Zcash payments and keeps spending rules with the task. Testnet and mainnet use separate wallets and authorizations.

## Developer documentation

- [Setup and agent connections](expense/docs/developer.md)
- [Wallet configuration and payment lifecycle](expense/docs/wallet-integration.md)
- [Agent skill](expense/skills/zender/SKILL.md)
