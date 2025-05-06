"use client"

import Link from "next/link"
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit"
import { toBytes } from "@noble/hashes/utils"
import _ from "lodash"
import {
  ArrowRight,
  ChevronLeft,
  Copy,
  Eye,
  MoveRight,
  Pencil,
  Plus,
  RefreshCcw,
} from "lucide-react"
import { toast } from "sonner"

import { CURRENCIES } from "@/config/currency"
import { useMiztAccount } from "@/hooks/use-mizt-account"
import { useMiztKey } from "@/hooks/use-mizt-key"
import { useMiztName } from "@/hooks/use-mizt-name"
import { usePrivateBalances } from "@/hooks/use-private-balances"
import { useSync } from "@/hooks/use-sync"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BalanceDetailDialog,
  BalanceDetailDialogTrigger,
} from "@/components/balance-detail-dialog"
import {
  ConnectWalletDialog,
  ConnectWalletDialogTrigger,
} from "@/components/connect-wallet-dialog"
import { DisconnectButton } from "@/components/disconnect-button"
import {
  SendPrivateBalanceDialog,
  SendPrivateBalanceDialogTrigger,
} from "@/components/send-private-balance-dialog"
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

  const privateBalances = usePrivateBalances({
    refetchInterval: 30_000, // 30 seconds
    select: (data) => {
      return {
        accounts: data,
        coins: data.reduce(
          (acc, account) => {
            account.balance.forEach((balance) => {
              if (!acc[balance.coinType]) {
                acc[balance.coinType] = {
                  total: 0,
                  byAccount: {},
                }
              }
              acc[balance.coinType].total += balance.amount
              acc[balance.coinType].byAccount[account.address] = balance.amount
            })
            return acc
          },
          {} as Record<
            string,
            {
              total: number
              byAccount: Record<string, number>
            }
          >
        ),
      }
    },
  })

  const __ = useSync()

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
      <h1 className="inline-flex items-center gap-2 text-5xl font-stretch-condensed">
        <Link href="/">
          <ChevronLeft className="size-8" />
        </Link>
        Your <span className="font-bold italic">Mizt</span> Account
      </h1>
      <p className="text-muted-foreground">
        Manage your Mizt account and transactions.
      </p>
      <div className="flex items-center gap-4">
        <Button size="sm" variant="outlineTranslucent">
          {mizt.isSyncing ? (
            <>
              Syncing <div className="size-2 rounded-full bg-orange-400" />
            </>
          ) : (
            <>
              Active <div className="size-2 rounded-full bg-green-400" />
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outlineTranslucent"
          onClick={() => {
            navigator.clipboard.writeText(currentAccount.address)
            toast.success("Address copied to clipboard")
          }}
        >
          Copy Address <Copy />
        </Button>

        <SwitchAccountButton />
        <DisconnectButton />
      </div>
      <div className="w-[500px] space-y-2">
        <Tabs defaultValue="name">
          <Card>
            <CardContent className="space-y-2">
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="font-bold! italic">Mizt</span>
                <TabsList className="h-7 px-0.5 *:h-6 *:px-2 *:text-xs">
                  <TabsTrigger value="name">Name</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
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
                  {miztName.isPending ? (
                    <Skeleton className="mr-auto h-9 w-full" />
                  ) : miztName.data ? (
                    <div className="mr-auto truncate">{miztName.data}.mizt</div>
                  ) : (
                    <div className="text-muted-foreground flex w-full items-center justify-between gap-2">
                      <div>
                        Setup Your{" "}
                        <span className="font-bold italic">Mizt</span> Name
                      </div>
                      <MoveRight className="size-8" />
                    </div>
                  )}
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
                      navigator.clipboard.writeText(`${miztName.data}.mizt`)
                      toast.success("Mizt name copied to clipboard")
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
            <CardDescription></CardDescription>
            <div className="grid max-h-[200px] grid-cols-2 gap-2 overflow-y-auto">
              {Object.entries(privateBalances.data?.coins || {}).map(
                ([coinType, { total, byAccount }]) => {
                  const currency = CURRENCIES.find(
                    (c) => c.coinType === coinType
                  )
                  if (!currency) return null
                  return (
                    <div
                      key={coinType}
                      className="bg-background/30 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-1">
                        <div className="truncate font-medium">
                          {total.toLocaleString()}
                        </div>
                        <img
                          src={currency.logo}
                          alt={currency.name}
                          className="ml-auto size-3 shrink-0 rounded-full"
                        />
                        <div className="text-sm font-semibold">
                          {currency.ticker}
                        </div>
                        <SendPrivateBalanceDialog
                          coinType={coinType}
                          total={total}
                          balances={byAccount}
                        >
                          <SendPrivateBalanceDialogTrigger asChild>
                            <Button variant="outlineTranslucent" size="iconXs">
                              <ArrowRight />
                            </Button>
                          </SendPrivateBalanceDialogTrigger>
                        </SendPrivateBalanceDialog>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <div>{_.size(byAccount)} accounts</div>
                        <BalanceDetailDialog
                          coinType={coinType}
                          balances={byAccount}
                        >
                          <BalanceDetailDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="iconXs"
                              className="ml-auto"
                            >
                              <Eye />
                            </Button>
                          </BalanceDetailDialogTrigger>
                        </BalanceDetailDialog>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
