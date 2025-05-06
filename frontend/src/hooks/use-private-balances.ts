import { useSuiClient } from "@mysten/dapp-kit"
import { QueryClient, useQuery, UseQueryOptions } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"

import { CURRENCIES } from "@/config/currency"

import { useMiztKey } from "./use-mizt-key"

export type UsePrivateBalancesReturn = {
  address: string
  balance: {
    coinType: string
    amount: number
  }[]
}[]

export const refreshPrivateBalances = async (
  queryClient: QueryClient,
  address: string
) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      return (
        query.queryKey[0] === "private-balances" &&
        query.queryKey[1] === address
      )
    },
  })
}
export const usePrivateBalances = <T = UsePrivateBalancesReturn>({
  ...options
}: Partial<UseQueryOptions<UsePrivateBalancesReturn, Error, T>> = {}) => {
  const client = useSuiClient()
  const key = useMiztKey()

  return useQuery({
    enabled: !!key,
    queryKey: ["private-balances", key?.address, _.keys(key?.accounts)],
    queryFn: async () => {
      return Promise.all(
        _.chain(key?.accounts)
          .keys()
          .map(async (address) => {
            const balance = await client.getAllBalances({
              owner: address,
            })
            if (balance.length === 0) return null
            return {
              balance: balance
                .map((b) => ({
                  coinType: b.coinType,
                  amount: new BigNumber(b.totalBalance)
                    .shiftedBy(
                      -(
                        CURRENCIES.find((c) => c.coinType === b.coinType)
                          ?.decimals || 0
                      )
                    )
                    .toNumber(),
                }))
                .filter((b) => b.amount > 0),
              address,
            }
          })
          .value()
      ).then((b) =>
        _.chain(b)
          .compact()
          .filter((b) => b.balance.length > 0)
          .value()
      )
    },
    ...options,
  })
}
