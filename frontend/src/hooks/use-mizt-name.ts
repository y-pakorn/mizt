import { useSuiClient } from "@mysten/dapp-kit"
import { QueryClient, useQuery } from "@tanstack/react-query"

import { contract } from "@/config/contract"

export const refreshMiztName = async (
  address: string,
  queryClient: QueryClient
) => {
  queryClient.invalidateQueries({
    queryKey: ["mizt-name", address],
    exact: true,
  })
}

export const useMiztName = ({ address }: { address?: string }) => {
  const client = useSuiClient()
  return useQuery({
    queryKey: ["mizt-name", address],
    queryFn: async () => {
      if (!address) return null
      const name = await client.getDynamicFieldObject({
        parentId: contract.nameOwnerId,
        name: {
          type: "address",
          value: address,
        },
      })
      return (name.data?.content as any)?.fields?.value || null
    },
  })
}
