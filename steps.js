import { ZODL_URL, FAUCETS, ACTIVE_FAUCET } from "./config.js";

const faucet = FAUCETS[ACTIVE_FAUCET];

export const STEPS = [
  {
    title: "Install Zodl",
    sentence: "Install the wallet, then switch it to testnet.",
    video: "/videos/1.mp4",
    button: { label: "Get Zodl", href: ZODL_URL },
  },
  {
    title: "Get testnet ZEC",
    sentence: faucet.sentence,
    video: "/videos/2.mp4",
    button: { label: "Open faucet", href: faucet.url },
  },
  {
    title: "Shield it",
    sentence: "Send the faucet ZEC to your own unified address.",
    video: "/videos/3.mp4",
  },
  {
    title: "Send a shielded note",
    sentence: "Type a note, scan the QR in Zodl, and confirm.",
    video: "/videos/4.mp4",
    form: true,
  },
  {
    title: "Read it back",
    sentence: "Tap the new transaction in Zodl and read your note.",
    video: "/videos/5.mp4",
  },
  {
    title: "Unshield",
    sentence: "Send the testnet ZEC to your own transparent address.",
    video: "/videos/6.mp4",
    done: true,
  },
];
