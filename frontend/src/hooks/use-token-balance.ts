import { useSuiClient } from "@mysten/dapp-kit"
import { CoinStruct } from "@mysten/sui/client"
import { QueryClient, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { BigNumber } from "bignumber.js"

import { CURRENCIES } from "@/config/currency"

export type UseTokenBalanceReturn = {
  amount: number
  coins: CoinStruct[]
} | null

export const refreshTokenBalance = async (
  client: QueryClient,
  address?: string,
  coinType?: string
) => {
  client.invalidateQueries({
    queryKey: ["token-balance", address, coinType],
    exact: true,
  })
}

export const useTokenBalance = <T = UseTokenBalanceReturn>({
  address,
  coinType,
  ...options
}: {
  address?: string
  coinType?: string
} & Partial<UseQueryOptions<UseTokenBalanceReturn, Error, T>>) => {
  const client = useSuiClient()
  return useQuery({
    queryKey: ["token-balance", address, coinType],
    queryFn: async () => {
      if (!address || !coinType) return null
      const balance = await client.getCoins({
        owner: address,
        coinType,
      })
      const totalBalance = balance.data.reduce(
        (acc, coin) => acc.plus(coin.balance),
        new BigNumber(0)
      )
      return {
        amount: totalBalance
          .shiftedBy(
            -(CURRENCIES.find((c) => c.coinType === coinType)?.decimals ?? 9)
          )
          .toNumber(),
        coins: balance.data,
      }
    },
    ...options,
  })
}
