import { ZODL_URL, EXCHANGES, MORE_EXCHANGES, OTHER_WALLETS } from "./config.js";

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
    links: EXCHANGES,
    more: MORE_EXCHANGES,
  },
  {
    title: "Shield it",
    sentence: "In Zodl, tap Shield on your transparent balance.",
    video: "/videos/3.mp4",
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
    done: true,
  },
];
