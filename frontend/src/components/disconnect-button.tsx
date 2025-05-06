import { ComponentProps } from "react"
import { useDisconnectWallet } from "@mysten/dapp-kit"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DisconnectButton({ ...props }: ComponentProps<typeof Button>) {
  const disconnect = useDisconnectWallet()

  return (
    <Button
      size="sm"
      variant="outlineTranslucent"
      onClick={() => disconnect.mutate()}
      {...props}
    >
      Disconnect <LogOut />
    </Button>
  )
}
