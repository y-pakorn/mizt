"use client"

import Link from "next/link"
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit"
import { toBytes } from "@noble/hashes/utils"
import { AnimatePresence, motion } from "framer-motion"
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

import { contract } from "@/config/contract"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  BalanceDetailDialog,
  BalanceDetailDialogTrigger,
} from "@/components/balance-detail-dialog"
import {
  ConnectWalletDialog,
  ConnectWalletDialogTrigger,
} from "@/components/connect-wallet-dialog"
import {
  CreatePaymentLinkDialog,
  CreatePaymentLinkDialogTrigger,
} from "@/components/create-payment-link-dialog"
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  if (!currentAccount || !key) {
    return (
      <motion.main
        className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={logoVariants}>
          <Link href="/">
            <motion.h2
              className="inline-flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.img
                src="/logo.webp"
                alt="Mizt"
                className="size-7"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              />
              <span className="text-2xl font-semibold italic">mizt</span>
            </motion.h2>
          </Link>
        </motion.div>

        <motion.h1
          className="text-center text-5xl font-stretch-condensed"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          Sign In To Access Your <span className="font-bold italic">Mizt</span>{" "}
          Account
        </motion.h1>
        <motion.p
          className="text-muted-foreground text-center"
          variants={itemVariants}
        >
          Generate your own mizt account, manage your private assets, and more.
        </motion.p>
        <AnimatePresence mode="wait">
          {!currentAccount && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ConnectWalletDialog>
                <ConnectWalletDialogTrigger asChild>
                  <Button size="lg">Connect Wallet</Button>
                </ConnectWalletDialogTrigger>
              </ConnectWalletDialog>
            </motion.div>
          )}
          {currentAccount && !key && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button onClick={signAndGenerate}>
                Sign Message To Generate Account
              </Button>
            </motion.div>
          )}

          <motion.div
            key="version"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-muted-foreground text-center font-mono text-xs">
              Protocol Version: {contract.version}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.main>
    )
  }

  return (
    <motion.main
      className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={logoVariants}>
        <Link href="/">
          <motion.h2
            className="inline-flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.img
              src="/logo.webp"
              alt="Mizt"
              className="size-7"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            />
            <span className="text-2xl font-semibold italic">mizt</span>
          </motion.h2>
        </Link>
      </motion.div>

      <motion.h1
        className="inline-flex items-center gap-2 text-5xl font-stretch-condensed"
        variants={itemVariants}
      >
        <motion.div
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
        >
          <Link href="/">
            <ChevronLeft className="size-8" />
          </Link>
        </motion.div>
        <span>
          Your <span className="font-bold italic">Mizt</span> Account
        </span>
      </motion.h1>

      <motion.p className="text-muted-foreground" variants={itemVariants}>
        Manage your Mizt account and transactions.
      </motion.p>

      <motion.div className="flex items-center gap-4" variants={itemVariants}>
        <motion.div whileHover={{ scale: 1.05 }}>
          <Button size="sm" variant="outlineTranslucent">
            <AnimatePresence mode="wait">
              {mizt.isSyncing ? (
                <motion.div
                  key="syncing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  Syncing{" "}
                  <motion.div
                    className="size-2 rounded-full bg-orange-400"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.1, repeat: Infinity }}
                  />
                </motion.div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => {
                        mizt.sync(currentAccount.address)
                      }}
                    >
                      Active{" "}
                      <motion.div
                        className="size-2 rounded-full bg-green-400"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.1, repeat: Infinity }}
                      />
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>Sync your Mizt account</TooltipContent>
                </Tooltip>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <SwitchAccountButton />
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <DisconnectButton />
        </motion.div>
      </motion.div>

      <motion.div className="w-[500px] space-y-2" variants={itemVariants}>
        <Tabs defaultValue="name">
          <motion.div
            variants={cardVariants}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <Card>
              <CardContent className="space-y-2">
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm">
                  <span className="font-bold! italic">Mizt</span>
                  <motion.div>
                    <TabsList className="h-7 px-0.5 *:h-6 *:px-2 *:text-xs">
                      <TabsTrigger value="name">Name</TabsTrigger>
                      <TabsTrigger value="address">Address</TabsTrigger>
                    </TabsList>
                  </motion.div>
                </CardTitle>
                <div className="h-12 text-2xl *:flex *:items-center *:justify-end *:gap-2">
                  <TabsContent value="address">
                    <motion.div className="mr-auto truncate">
                      {key.mizt}
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                          mizt.generateNewAddress(currentAccount.address)
                        }}
                      >
                        <RefreshCcw />
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
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
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CreatePaymentLinkDialog>
                        <CreatePaymentLinkDialogTrigger asChild>
                          <Button variant="outlineTranslucent">
                            Create Payment Link
                          </Button>
                        </CreatePaymentLinkDialogTrigger>
                      </CreatePaymentLinkDialog>
                    </motion.div>
                  </TabsContent>
                  <TabsContent value="name">
                    <AnimatePresence mode="wait">
                      {miztName.isPending ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="mr-auto"
                        >
                          <Skeleton className="h-9 w-full" />
                        </motion.div>
                      ) : miztName.data ? (
                        <motion.div
                          key="name"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mr-auto truncate"
                        >
                          {miztName.data}.mizt
                        </motion.div>
                      ) : (
                        <motion.div
                          key="setup"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="text-muted-foreground flex w-full items-center justify-between gap-2"
                        >
                          <div>
                            Setup Your{" "}
                            <span className="font-bold italic">Mizt</span> Name
                          </div>
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <MoveRight className="size-8" />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SetNameDialog>
                        <SetNameDialogTrigger asChild>
                          <Button size="icon" variant="outline">
                            {miztName.data ? <Pencil /> : <Plus />}
                          </Button>
                        </SetNameDialogTrigger>
                      </SetNameDialog>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
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
                    </motion.div>
                  </TabsContent>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Tabs>

        <motion.div variants={cardVariants} whileHover={{ scale: 1.02, y: -5 }}>
          <Card>
            <CardContent className="space-y-2">
              <CardTitle className="text-muted-foreground text-sm">
                Balances
              </CardTitle>
              <CardDescription></CardDescription>
              <ScrollArea className="h-full max-h-[200px]">
                <div className="grid grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {privateBalances.isPending ? (
                      _.range(2).map((i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Skeleton className="h-18 w-full" />
                        </motion.div>
                      ))
                    ) : !privateBalances.data ||
                      !_.size(privateBalances.data?.coins) ? (
                      <motion.div
                        className="text-muted-foreground/25 col-span-2 flex h-18 items-center justify-center text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        No balances here yet.
                      </motion.div>
                    ) : (
                      _.entries(privateBalances.data?.coins).map(
                        ([coinType, { total, byAccount }], index) => {
                          const currency = CURRENCIES.find(
                            (c) => c.coinType === coinType
                          )
                          if (!currency) return null
                          return (
                            <motion.div
                              key={coinType}
                              className="bg-background/30 rounded-lg p-3"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1, duration: 0.5 }}
                            >
                              <div className="flex items-center gap-1">
                                <motion.div
                                  className="truncate font-medium"
                                  animate={{
                                    scale: [1, 1.05, 1],
                                  }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {total.toLocaleString()}
                                </motion.div>
                                <motion.img
                                  src={currency.logo}
                                  alt={currency.name}
                                  className="ml-auto size-3 shrink-0 rounded-full"
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.6 }}
                                />
                                <div className="text-sm font-semibold">
                                  {currency.ticker}
                                </div>
                                <motion.div
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.8 }}
                                >
                                  <SendPrivateBalanceDialog
                                    coinType={coinType}
                                    total={total}
                                    balances={byAccount}
                                  >
                                    <SendPrivateBalanceDialogTrigger asChild>
                                      <Button
                                        variant="outlineTranslucent"
                                        size="iconXs"
                                      >
                                        <ArrowRight />
                                      </Button>
                                    </SendPrivateBalanceDialogTrigger>
                                  </SendPrivateBalanceDialog>
                                </motion.div>
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <div>{_.size(byAccount)} accounts</div>
                                <motion.div
                                  className="ml-auto"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.8 }}
                                >
                                  <BalanceDetailDialog
                                    coinType={coinType}
                                    balances={byAccount}
                                  >
                                    <BalanceDetailDialogTrigger asChild>
                                      <Button variant="ghost" size="iconXs">
                                        <Eye />
                                      </Button>
                                    </BalanceDetailDialogTrigger>
                                  </BalanceDetailDialog>
                                </motion.div>
                              </div>
                            </motion.div>
                          )
                        }
                      )
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      <motion.div
        key="version"
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="text-muted-foreground text-center font-mono text-xs">
          Protocol Version: {contract.version}
        </div>
      </motion.div>
    </motion.main>
  )
}
