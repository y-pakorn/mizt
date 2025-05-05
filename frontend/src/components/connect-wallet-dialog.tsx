import React from "react"
import { useConnectWallet, useWallets } from "@mysten/dapp-kit"
import { Loader2 } from "lucide-react"

import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"

export function ConnectWalletDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const wallets = useWallets()
  const connect = useConnectWallet()

  return (
    <Dialog {...props}>
      <DialogContent className="md:w-sm">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Connect your wallet to access your Mizt account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid w-full gap-1">
          {wallets.map((wallet, i) => {
            const isConnecting =
              connect.variables?.wallet?.id === wallet.id && connect.isPending
            return (
              <Button
                key={wallet.id || i}
                onClick={() => connect.mutate({ wallet })}
                variant="outline"
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="size-4 shrink-0"
                />
                {wallet.name}
                <div className="flex-1" />
                {isConnecting && <Loader2 className="animate-spin" />}
              </Button>
            )
          })}
        </div>
      </DialogContent>
      {children}
    </Dialog>
  )
}

export function ConnectWalletDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}
