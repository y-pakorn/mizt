import { useEffect } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"

import { useMiztAccount } from "./use-mizt-account"
import { useMiztKey } from "./use-mizt-key"

export const useSync = ({ interval = 30_000 }: { interval?: number } = {}) => {
  const mizt = useMiztAccount()
  const currentAccount = useMiztKey()

  useEffect(() => {
    if (!currentAccount) return
    mizt.sync(currentAccount.address)
    const intervalId = setInterval(() => {
      mizt.sync(currentAccount.address)
    }, interval)
    return () => clearInterval(intervalId)
  }, [interval])
}
