// Zender configuration. Public values only.
// Never put a seed, spending key, or viewing key in this file.

// Mainnet. Each visitor sends this to their own shielded address, so it comes straight back.
// No fee field: Zodl applies ZIP 317.
export const AMOUNT = "0.001";

// Display text for the wallet. The note itself always goes in memo.
export const MESSAGE = "Zender";

export const ZODL_URL = "https://zodl.com/";

// Exchanges that list ZEC (checked 3 Oct 2026). Plain links, no logos.
export const EXCHANGES = [
  { label: "Gemini", href: "https://www.gemini.com/" },
  { label: "Coinbase", href: "https://www.coinbase.com/" },
  { label: "Kraken", href: "https://www.kraken.com/" },
];
