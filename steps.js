import { ZODL_URL, EXCHANGES } from "./config.js";

export const STEPS = [
  {
    title: "Install Zodl",
    sentence: "Install it and tap Create New Wallet. About 10 minutes in all.",
    video: "/videos/1.mp4",
    button: { label: "Get Zodl", href: ZODL_URL },
  },
  {
    title: "Get a little ZEC",
    sentence: "Buy a dollar or two and send it to your transparent address.",
    video: "/videos/2.mp4",
    links: EXCHANGES,
  },
  {
    title: "Shield it",
    sentence: "Send it to your own shielded address.",
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
    sentence: "Send a little ZEC to your own transparent address.",
    video: "/videos/6.mp4",
    done: true,
  },
];
