import { ZODL_URL, EXCHANGES, MORE_EXCHANGES, OTHER_WALLETS, ZINGO_URL, TESTNET_SERVER, FAUCET_URL } from "./config.js";

// Mainnet: real ZEC in Zodl.
export const STEPS = [
  {
    title: "Install Zodl",
    sentence: "Install it and tap Create New Wallet. About 10 minutes in all.",
    video: "/videos/1.mp4",
    button: { label: "Get Zodl", href: ZODL_URL },
    more: OTHER_WALLETS,
  },
  {
    title: "Get a little ZEC",
    sentence: "Tap Swap in Zodl, or buy a dollar or two on an exchange.",
    video: "/videos/2.mp4",
    verify: true,
    links: EXCHANGES,
    more: MORE_EXCHANGES,
  },
  {
    title: "Shield it",
    sentence: "In Zodl, tap Shield on your transparent balance.",
    video: "/videos/3.mp4",
    verify: true,
  },
  {
    title: "Seal a letter",
    sentence: "Write to yourself, one year from now. Then send it to yourself in Zodl.",
    video: "/videos/4.mp4",
    form: true,
  },
  {
    title: "Read it back",
    sentence: "Tap the new transaction in Zodl. Your letter is there.",
    video: "/videos/5.mp4",
  },
  {
    title: "Unshield",
    sentence: "Send a little ZEC to your own transparent address.",
    video: "/videos/6.mp4",
    verify: true,
    done: true,
  },
];

// Testnet practice round: free test ZEC in Zingo. Same six moves, nothing real at stake.
export const TEST_STEPS = [
  {
    title: "Install Zingo",
    sentence: "In Settings → Server, pick Testnet first. Then create a wallet.",
    button: { label: "Get Zingo", href: ZINGO_URL },
    more: `Server: ${TESTNET_SERVER}`,
  },
  {
    title: "Get test ZEC",
    sentence: "Copy your tm address in Zingo and ask the faucet for some.",
    button: { label: "Open faucet", href: FAUCET_URL },
    verify: true,
  },
  {
    title: "Shield it",
    sentence: "In Zingo, shield your transparent test ZEC.",
    verify: true,
  },
  {
    title: "Seal a practice letter",
    sentence: "Write to yourself. Then send it to yourself in Zingo.",
    form: true,
  },
  {
    title: "Read it back",
    sentence: "Open the new transaction in Zingo. Your letter is there.",
  },
  {
    title: "Unshield",
    sentence: "Send a little test ZEC to your own tm address.",
    verify: true,
    done: true,
  },
];
