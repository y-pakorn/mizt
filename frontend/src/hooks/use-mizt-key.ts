import { useCurrentAccount } from "@mysten/dapp-kit"

import { useMiztAccount } from "./use-mizt-account"

export const useMiztKey = () => {
  const { key } = useMiztAccount()
  const account = useCurrentAccount()

  return !account ? null : key[account.address] || null
}
