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
  {
    ticker: "haSUI",
    name: "Haedal Staked Sui",
    logo: "https://coin-images.coingecko.com/coins/images/33512/large/hasui.png?1740451722",
    coinType:
      "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    decimals: 9,
  },
  {
    ticker: "SuiNS",
    name: "Sui Name Service",
    logo: "https://token-image.suins.io/icon.svg",
    coinType:
      "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
    decimals: 6,
  },
  {
    ticker: "BLUE",
    name: "Bluefin",
    logo: "https://bluefin.io/images/square.png",
    coinType:
      "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
    decimals: 9,
  },
  {
    ticker: "DEEP",
    name: "Deepbook",
    logo: "https://images.deepbook.tech/icon.svg",
    coinType:
      "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    decimals: 6,
  },
]

export const SUI_CURRENCY: Currency = CURRENCIES[0]!

export const DEFAULT_CURRENCY: Currency = CURRENCIES[0]
