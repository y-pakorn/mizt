"use client"

import Link from "next/link"
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit"
import { toBytes } from "@noble/hashes/utils"
import { ChevronLeft, Copy, Pencil, Plus, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import { useMiztAccount } from "@/hooks/use-mizt-account"
import { useMiztKey } from "@/hooks/use-mizt-key"
import { useMiztName } from "@/hooks/use-mizt-name"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ConnectWalletDialog,
  ConnectWalletDialogTrigger,
} from "@/components/connect-wallet-dialog"
import { DisconnectButton } from "@/components/disconnect-button"
import {
  SetNameDialog,
  SetNameDialogTrigger,
} from "@/components/set-name-dialog"
import { SwitchAccountButton } from "@/components/switch-account-button"

export default function Me() {
  const currentAccount = useCurrentAccount()
  const sign = useSignPersonalMessage()

  const miztName = useMiztName({ address: currentAccount?.address })

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
        <Link href="/">
          <Button size="sm" variant="outlineTranslucent">
            <ChevronLeft />
            Home
          </Button>
        </Link>
        <Button size="sm" variant="outlineTranslucent" aria-readonly>
          Active <div className="size-2 rounded-full bg-green-400" />
        </Button>
        <SwitchAccountButton />
        <DisconnectButton />
      </div>
      <div className="w-[500px] space-y-2">
        <Tabs defaultValue="address">
          <Card>
            <CardContent className="space-y-2">
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="font-bold! italic">Mizt</span>
                <TabsList className="h-7 px-0.5 *:h-6 *:px-2 *:text-xs">
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="name">Name</TabsTrigger>
                </TabsList>
              </CardTitle>
              <div className="h-12 text-2xl *:flex *:items-center *:justify-end *:gap-2">
                <TabsContent value="address">
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
                </TabsContent>
                <TabsContent value="name">
                  <div className="mr-auto truncate">
                    {miztName.data ? `${miztName.data}.mizt` : "-"}
                  </div>
                  <SetNameDialog>
                    <SetNameDialogTrigger asChild>
                      <Button size="icon" variant="outline">
                        {miztName.data ? <Pencil /> : <Plus />}
                      </Button>
                    </SetNameDialogTrigger>
                  </SetNameDialog>
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
                </TabsContent>
              </div>
            </CardContent>
          </Card>
        </Tabs>

        <Card>
          <CardContent className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm">
              Balances
            </CardTitle>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
