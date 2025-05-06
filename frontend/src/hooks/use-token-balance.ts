import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { BigNumber } from "bignumber.js"

import { CURRENCIES } from "@/config/currency"

export type UseTokenBalanceReturn = number | null

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
      const balance = await client.getBalance({
        owner: address,
        coinType,
      })
      return new BigNumber(balance.totalBalance)
        .shiftedBy(
          -(CURRENCIES.find((c) => c.coinType === coinType)?.decimals ?? 9)
        )
        .toNumber()
    },
    ...options,
  })
}
