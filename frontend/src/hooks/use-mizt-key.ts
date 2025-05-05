import { useMemo } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"

import { useMiztAccount } from "./use-mizt-account"

export const useMiztKey = () => {
  const { key } = useMiztAccount()
  const account = useCurrentAccount()

  return useMemo(() => {
    if (!account) return null
    return key[account.address] || null
  }, [account, key])
}
