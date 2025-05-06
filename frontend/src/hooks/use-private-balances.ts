import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import BigNumber from "bignumber.js"

import { CURRENCIES } from "@/config/currency"

import { useMiztKey } from "./use-mizt-key"

export type UsePrivateBalancesReturn = {
  address: string
  balance: {
    coinType: string
    amount: number
  }[]
}[]

export const usePrivateBalances = <T = UsePrivateBalancesReturn>({
  ...options
}: Partial<UseQueryOptions<UsePrivateBalancesReturn, Error, T>> = {}) => {
  const client = useSuiClient()
  const key = useMiztKey()

  return useQuery({
    enabled: !!key,
    queryKey: [
      "private-balances",
      key?.address,
      Object.keys(key?.accounts || {}),
    ],
    queryFn: async () => {
      return Promise.all(
        Object.entries(key?.accounts || {}).map(async ([address, account]) => {
          const balance = await client.getAllBalances({
            owner: address,
          })
          return {
            balance: balance.map((b) => ({
              coinType: b.coinType,
              amount: new BigNumber(b.totalBalance)
                .shiftedBy(
                  -(
                    CURRENCIES.find((c) => c.coinType === b.coinType)
                      ?.decimals || 0
                  )
                )
                .toNumber(),
            })),
            address,
          }
        })
      )
    },
    ...options,
  })
}
