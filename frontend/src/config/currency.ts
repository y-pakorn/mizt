import { Currency } from "@/types"

export const CURRENCIES: Currency[] = [
  {
    ticker: "SUI",
    name: "Sui",
    logo: "https://assets.crypto.ro/logos/sui-sui-logo.png",
    coinType: "0x2::sui::SUI",
    decimals: 9,
  },
  {
    ticker: "USDC",
    name: "USD Coin",
    logo: "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png",
    coinType:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    decimals: 6,
  },
  {
    ticker: "WAL",
    name: "Walrus",
    logo: "https://strapi-dev.scand.app/uploads/WAL_4720dc612f.png",
    coinType:
      "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
    decimals: 9,
  },
]

export const SUI_CURRENCY: Currency = CURRENCIES[0]!

export const DEFAULT_CURRENCY: Currency = CURRENCIES[0]
