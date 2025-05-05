import { useSuiClient } from "@mysten/dapp-kit"
import { CoinBalance } from "@mysten/sui/client"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"

export const useTokenBalance = <T>({
  address,
  coinType,
  ...options
}: {
  address?: string
  coinType?: string
} & Partial<UseQueryOptions<CoinBalance | null, Error, T>>) => {
  const client = useSuiClient()
  return useQuery({
    queryKey: ["token-balance", address, coinType],
    queryFn: async () => {
      if (!address || !coinType) return null
      const balance = await client.getBalance({
        owner: address,
        coinType,
      })
      return balance
    },
    ...options,
  })
}
