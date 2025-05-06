import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"

import { contract } from "@/config/contract"

type UseMiztPubkeyReturn = {
  owner: string
  pub: number[]
} | null

export const useMiztPubkey = <T>({
  name,
  ...options
}: { name?: string } & Partial<
  UseQueryOptions<UseMiztPubkeyReturn, Error, T>
> = {}) => {
  const client = useSuiClient()

  return useQuery({
    queryKey: ["mizt-pubkey", name],
    queryFn: async ({ queryKey: [, name] }) => {
      if (!name) return null
      const pubkey = await client.getDynamicFieldObject({
        parentId: contract.nameId,
        name: {
          type: "0x1::string::String",
          value: name,
        },
      })
      const fields = (pubkey.data?.content as any)?.fields?.value?.fields
      if (!fields) return null
      return {
        owner: fields.owner as string,
        pub: fields.pub as number[],
      }
    },
    ...options,
  })
}
