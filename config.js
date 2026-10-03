// Zender configuration. Public values only.
// Never put a seed, spending key, or viewing key in this file.

// Not used. In step 4 the visitor pastes their own utest1 address and sends to themselves.
// Leave empty. Never put a seed, spending key, or viewing key here.
export const RECEIVE_ADDRESS = "";

// Fixed. A 0.1 TAZ faucet drip covers it and the fee. No fee field: Zodl applies ZIP 317.
export const AMOUNT = "0.001";

// Display text for the wallet. The note itself always goes in memo.
export const MESSAGE = "Zender";

export const ZODL_URL = "https://zodl.com/";

// Store links as published on https://zodl.com/ on build day, 2 Oct 2026.
export const APP_STORE_URL = "https://apps.apple.com/us/app/zashi-zcash-wallet/id1672392439";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=co.electriccoin.zcash";

export const FAUCETS = {
  primary: {
    url: "https://zcashfaucet.jinolabs.xyz",
    sentence: "Request 0.1 TAZ, then wait until Zodl shows a balance.",
    opens: "Opens the Jino Labs testnet faucet.",
  },
  fallback: {
    url: "https://zechub.wiki/tools?tool=faucet",
    sentence: "Request testnet ZEC, then wait until Zodl shows a balance.",
    opens: "Opens the ZecHub testnet faucet.",
  },
};

// The primary faucet reset every connection on build day, 2 Oct 2026.
// Switch back to "primary" once it is confirmed to drip again.
export const ACTIVE_FAUCET = "fallback";
