"use client"

import {
  useAccounts,
  useCurrentAccount,
  useDisconnectWallet,
  useSignPersonalMessage,
  useSwitchAccount,
} from "@mysten/dapp-kit"
import { toBytes } from "@noble/hashes/utils"
import {
  Check,
  ChevronsLeftRightEllipsis,
  Copy,
  LogOut,
  RefreshCcw,
} from "lucide-react"
import { toast } from "sonner"

import { useMiztAccount } from "@/hooks/use-mizt-account"
import { useMiztKey } from "@/hooks/use-mizt-key"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ConnectWalletDialog,
  ConnectWalletDialogTrigger,
} from "@/components/connect-wallet-dialog"

export default function Me() {
  const currentAccount = useCurrentAccount()
  const sign = useSignPersonalMessage()
  const disconnect = useDisconnectWallet()
  const accounts = useAccounts()
  const switchAccount = useSwitchAccount()

  const mizt = useMiztAccount()
  const key = useMiztKey()

  const signAndGenerate = async () => {
    if (!currentAccount) return
    const signature = await sign.mutateAsync({
      message: toBytes(`Generate mizt account for ${currentAccount.address}`),
    })
    mizt.generateKey(signature.signature, currentAccount.address)
  }

  if (!currentAccount || !key) {
    return (
      <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
        <h1 className="text-5xl font-stretch-condensed">
          Sign In To Access Your <span className="font-bold italic">Mizt</span>{" "}
          Account
        </h1>
        <p className="text-muted-foreground">
          Generate your own mizt account, manage your private assets, and more.
        </p>
        {!currentAccount && (
          <ConnectWalletDialog>
            <ConnectWalletDialogTrigger asChild>
              <Button size="lg">Connect Wallet</Button>
            </ConnectWalletDialogTrigger>
          </ConnectWalletDialog>
        )}
        {currentAccount && !key && (
          <Button onClick={signAndGenerate}>
            Sign Message To Generate Account
          </Button>
        )}
      </main>
    )
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
      <h1 className="text-5xl font-stretch-condensed">
        Your <span className="font-bold italic">Mizt</span> Account
      </h1>
      <p className="text-muted-foreground">
        Manage your Mizt account and transactions.
      </p>
      <div className="flex items-center gap-4">
        <Button size="sm" variant="outlineTranslucent" aria-readonly>
          Active <div className="size-2 rounded-full bg-green-400" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outlineTranslucent">
              Switch Account <ChevronsLeftRightEllipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {accounts.map((account) => {
              const isActive = account.address === currentAccount.address
              return (
                <DropdownMenuItem
                  key={account.address}
                  className="w-[250px]"
                  onClick={() => switchAccount.mutate({ account })}
                >
                  <span className="font-semibold">{account.label}</span>
                  <span className="text-muted-foreground">
                    {account.address.slice(0, 8)}...
                  </span>
                  {isActive && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="outlineTranslucent"
          onClick={() => disconnect.mutate()}
        >
          Disconnect <LogOut />
        </Button>
      </div>
      <div className="w-[500px]">
        <Card>
          <CardContent className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm">
              <span className="font-bold! italic">Mizt</span> Address
            </CardTitle>
            <div className="flex h-12 items-center justify-end gap-2 text-2xl">
              <div className="mr-auto truncate">{key.mizt}</div>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => {
                  mizt.generateNewAddress(currentAccount.address)
                }}
              >
                <RefreshCcw />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(key.mizt)
                  toast.success("Mizt address copied to clipboard")
                }}
              >
                <Copy />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
