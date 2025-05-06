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
      "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
    decimals: 6,
  },
  {
    ticker: "WAL",
    name: "Walrus",
    logo: "https://strapi-dev.scand.app/uploads/WAL_4720dc612f.png",
    coinType:
      "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
    decimals: 9,
  },
]

export const DEFAULT_CURRENCY: Currency = CURRENCIES[0]
