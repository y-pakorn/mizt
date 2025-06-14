"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit"
import { Secp256k1PublicKey } from "@mysten/sui/keypairs/secp256k1"
import { Transaction } from "@mysten/sui/transactions"
import { base58 } from "@scure/base"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BigNumber } from "bignumber.js"
import { AnimatePresence, motion } from "framer-motion"
import _ from "lodash"
import {
  ArrowDown,
  ChevronDown,
  ExternalLink,
  Loader2,
  MoveRight,
  RefreshCcw,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { contract } from "@/config/contract"
import { CURRENCIES, DEFAULT_CURRENCY } from "@/config/currency"
import {
  generateStealthAddress,
  generateStealthAddressEpimeral,
} from "@/lib/crypto"
import { cn } from "@/lib/utils"
import { useMiztPubkey } from "@/hooks/use-mizt-pubkey"
import { refreshTokenBalance, useTokenBalance } from "@/hooks/use-token-balance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TransparentInput } from "@/components/ui/input"
import {
  ConnectWalletDialog,
  ConnectWalletDialogTrigger,
} from "@/components/connect-wallet-dialog"
import { DisconnectButton } from "@/components/disconnect-button"
import { SwitchAccountButton } from "@/components/switch-account-button"
import { Currency } from "@/types"

export default function Home() {
  const searchParams = useSearchParams()

  const [message, setMessage] = useState<string>("")
  useEffect(() => {
    const message = searchParams.get("message")
    const amount = searchParams.get("amount")
    const coin = searchParams.get("coin")
    const key = searchParams.get("key")

    if (!amount || !key || !coin) {
      setAmount("")
      setCoin(DEFAULT_CURRENCY)
      setRecipient("")
      setDisplayRecipient("")
      return
    }
    setMessage(message ?? "")
    setAmount(amount)
    setCoin(CURRENCIES.find((c) => c.coinType === coin) ?? DEFAULT_CURRENCY)
    setRecipient(key)
    setDisplayRecipient(key)
  }, [searchParams])

  const currentAccount = useCurrentAccount()
  const client = useSuiClient()
  const queryClient = useQueryClient()
  const sae = useSignAndExecuteTransaction()

  const [amount, setAmount] = useState<string>("")
  const [coin, setCoin] = useState<Currency>(DEFAULT_CURRENCY)
  const [recipient, setRecipient] = useState<string>("")
  const [displayRecipient, setDisplayRecipient] = useState<string>("")
  const setRecipientDebounce = useMemo(() => _.debounce(setRecipient, 500), [])

  const amountNumber = useMemo(() => {
    try {
      return parseFloat(amount)
    } catch (_) {
      return null
    }
  }, [amount])

  const balance = useTokenBalance({
    address: currentAccount?.address,
    coinType: coin.coinType,
  })

  const { name, pubkey } = useMemo(() => {
    if (recipient.endsWith(".mizt")) {
      return {
        name: recipient.slice(0, -5),
        pubkey: undefined,
      }
    } else {
      try {
        const trimmed = recipient.replace(/^mizt/, "")
        const decoded = base58.decode(trimmed)
        const epimeralKey = new Uint8Array(decoded.slice(0, 32))
        const meta = new Uint8Array(decoded.slice(32))
        const { stealthPub, ephPub, sharedSecret } =
          generateStealthAddressEpimeral(meta, epimeralKey)
        const addr = new Secp256k1PublicKey(stealthPub).toSuiAddress()
        return {
          name: undefined,
          pubkey: {
            epimeralPubkey: ephPub,
            sharedSecret,
            addr,
          },
        }
      } catch (_) {
        return {
          name: undefined,
          pubkey: undefined,
        }
      }
    }
  }, [recipient])

  const _namePubkey = useMiztPubkey({
    name,
  })
  const [nonce, setNonce] = useState<number>(0)
  const namePubkey = useMemo(() => {
    if (!_namePubkey.data) return null
    const { stealthPub, ephPub, mizt, sharedSecret } = generateStealthAddress(
      new Uint8Array(_namePubkey.data.pub)
    )
    const addr = new Secp256k1PublicKey(stealthPub).toSuiAddress()
    return {
      epimeralPubkey: ephPub,
      sharedSecret,
      mizt,
      addr,
    }
  }, [_namePubkey.data, nonce])

  const transfer = useMutation({
    mutationFn: async () => {
      if (!currentAccount) return
      if (!balance.data) throw new Error("No balance")
      if (!amountNumber) throw new Error("Invalid amount")
      if (amountNumber > balance.data.amount)
        throw new Error("Insufficient balance")
      const usedPubkey = namePubkey || pubkey
      if (!usedPubkey) throw new Error("Invalid recipient")
      const tx = new Transaction()
      const fullAmount = new BigNumber(amountNumber)
        .shiftedBy(
          CURRENCIES.find((c) => c.coinType === coin.coinType)?.decimals ?? 9
        )
        .integerValue(BigNumber.ROUND_FLOOR)
        .toString()
      const mergedCoin =
        coin.coinType === "0x2::sui::SUI"
          ? tx.gas
          : (() => {
              const coins = balance.data.coins
              if (coins.length === 1) return tx.object(coins[0].coinObjectId)
              tx.mergeCoins(
                tx.object(coins[0].coinObjectId),
                coins.slice(1).map((c) => tx.object(c.coinObjectId))
              )
              return tx.object(coins[0].coinObjectId)
            })()
      const [splittedCoin] = tx.splitCoins(mergedCoin, [fullAmount])

      tx.moveCall({
        target: `${contract.packageId}::core::transfer_coin_in`,
        arguments: [
          tx.object(contract.miztId),
          tx.pure.address(usedPubkey.addr),
          tx.pure.vector("u8", usedPubkey.epimeralPubkey),
          splittedCoin,
        ],
        typeArguments: [coin.coinType],
      })

      const res = await sae.mutateAsync({
        transaction: tx,
      })

      const result = await client.waitForTransaction({
        digest: res.digest,
      })

      setAmount("")
      setNonce((n) => n + 1)
      refreshTokenBalance(queryClient, currentAccount.address, coin.coinType)
      toast.success("Transferred successfully", {
        description: `Tx Hash: ${result.digest}`,
        action: {
          label: <ExternalLink className="size-4" />,
          onClick: () =>
            window.open(
              `${contract.blockExplorer}/tx/${result.digest}`,
              "_blank"
            ),
        },
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

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

  const arrowVariants = {
    initial: { rotate: 0, scale: 1 },
    hover: {
      rotate: 180,
      scale: 1.1,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    pulse: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
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

      <AnimatePresence mode="wait">
        {message ? (
          <motion.div
            key="message"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-2 text-center"
          >
            <motion.h1
              className="text-5xl font-stretch-condensed"
              variants={itemVariants}
            >
              {message}
            </motion.h1>
            <motion.p className="text-muted-foreground" variants={itemVariants}>
              Hide your coin in the{" "}
              <span className="font-bold italic">Mizt</span>
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-2 text-center"
          >
            <motion.h1
              className="text-5xl font-stretch-condensed"
              variants={itemVariants}
            >
              Hide your coin in the{" "}
              <span className="font-bold italic">Mizt</span>
            </motion.h1>
            <motion.p className="text-muted-foreground" variants={itemVariants}>
              To the unknown, in the void of the cryptography on{" "}
              <span className="font-medium">Mainnet</span>.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentAccount && (
          <motion.div
            className="flex items-center gap-4"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <SwitchAccountButton />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <DisconnectButton />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative w-[500px] space-y-1"
        variants={itemVariants}
      >
        <motion.div
          className="bg-card absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl p-2"
          variants={arrowVariants}
          initial="initial"
          animate="pulse"
          whileHover="hover"
        >
          <ArrowDown className="size-6" />
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ scale: 1.02, y: -5 }}>
          <Card>
            <CardContent className="space-y-2">
              <CardTitle className="text-muted-foreground text-sm">
                Coin
              </CardTitle>
              <div className="flex items-center gap-2">
                <motion.div className="flex-1" whileFocus={{ scale: 1.02 }}>
                  <TransparentInput
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mb-0 h-10 text-2xl!"
                    placeholder="0"
                  />
                </motion.div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="translucent">
                        <motion.img
                          src={coin.logo}
                          alt={coin.name}
                          className="size-4 rounded-full"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        />
                        <span className="font-semibold">{coin.ticker}</span>
                        <ChevronDown />
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {CURRENCIES.map((currency, index) => (
                      <motion.div
                        key={currency.ticker}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setCoin(currency)
                            setAmount("")
                          }}
                        >
                          <img
                            src={currency.logo}
                            alt={currency.name}
                            className="size-4 rounded-full"
                          />
                          <span className="font-semibold">
                            {currency.ticker}
                          </span>
                        </DropdownMenuItem>
                      </motion.div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <motion.div
                className="text-muted-foreground flex items-center gap-2 text-xs"
                animate={{ opacity: balance.data ? 1 : 0.5 }}
              >
                <div className="flex-1" />
                <motion.div
                  animate={{ rotate: balance.isLoading ? 360 : 0 }}
                  transition={{
                    duration: 1,
                    repeat: balance.isLoading ? Infinity : 0,
                  }}
                >
                  <Wallet className="size-3" />
                </motion.div>
                <motion.span
                  className="font-semibold"
                  animate={{
                    scale: balance.data?.amount ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {balance.data?.amount.toLocaleString() || "-"}
                </motion.span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ scale: 1.02, y: -5 }}>
          <Card>
            <CardContent className="space-y-2">
              <CardTitle className="text-muted-foreground text-sm">
                <span className="font-bold! italic">Mizt</span> Recipient
              </CardTitle>
              <motion.div whileFocus={{ scale: 1.02 }}>
                <TransparentInput
                  value={displayRecipient}
                  onChange={(e) => {
                    setRecipientDebounce(e.target.value)
                    setDisplayRecipient(e.target.value)
                  }}
                  className="mb-0 h-10 text-2xl!"
                  placeholder="muasist.mizt or miztDhy1Nee3SEV..."
                  autoCorrect="false"
                  spellCheck="false"
                  onPaste={(e) => {
                    e.preventDefault()
                    const text = e.clipboardData.getData("text")
                    const input = e.target as HTMLInputElement
                    input.setSelectionRange(0, 0)
                    document.execCommand("insertText", false, text)
                  }}
                />
              </motion.div>
              <div>
                <AnimatePresence>
                  {namePubkey && (
                    <motion.div
                      className="text-muted-foreground flex items-center justify-end gap-2 text-xs"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className="mr-auto truncate"
                        animate={{ color: ["#6b7280", "#10b981", "#6b7280"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {namePubkey.mizt}
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          size="iconXs"
                          variant="outlineTranslucent"
                          onClick={() => setNonce((n) => n + 1)}
                        >
                          <RefreshCcw
                            className={cn(
                              _namePubkey.isPending && "animate-spin"
                            )}
                          />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(namePubkey?.addr || pubkey?.addr) && (
                    <motion.div
                      className="text-muted-foreground truncate font-mono text-xs"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {namePubkey?.addr || pubkey?.addr}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {name && !namePubkey && (
                    <motion.div
                      className="text-muted-foreground flex h-6 items-center text-xs"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      Name not found.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        className="w-[500px]"
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {currentAccount ? (
          <motion.div
            animate={
              transfer.isPending
                ? {
                    backgroundImage: [
                      "linear-gradient(45deg, transparent, rgba(168, 85, 247, 0.1), transparent)",
                      "linear-gradient(135deg, transparent, rgba(59, 130, 246, 0.1), transparent)",
                      "linear-gradient(225deg, transparent, rgba(16, 185, 129, 0.1), transparent)",
                      "linear-gradient(315deg, transparent, rgba(168, 85, 247, 0.1), transparent)",
                    ],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: transfer.isPending ? Infinity : 0,
            }}
          >
            <Button
              className="w-full"
              variant="outline"
              disabled={transfer.isPending || !amountNumber || !recipient}
              onClick={() => transfer.mutateAsync()}
            >
              <motion.span
                animate={transfer.isPending ? { opacity: [1, 0.5, 1] } : {}}
                transition={{
                  duration: 1,
                  repeat: transfer.isPending ? Infinity : 0,
                }}
              >
                {transfer.isPending ? "Transferring..." : "Transfer"}
              </motion.span>
              <motion.div
                animate={transfer.isPending ? { rotate: 360 } : {}}
                transition={{
                  duration: 1,
                  repeat: transfer.isPending ? Infinity : 0,
                }}
              >
                {transfer.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <MoveRight />
                )}
              </motion.div>
            </Button>
          </motion.div>
        ) : (
          <ConnectWalletDialog>
            <ConnectWalletDialogTrigger asChild>
              <Button className="w-full" variant="outline">
                Connect And Transfer <MoveRight />
              </Button>
            </ConnectWalletDialogTrigger>
          </ConnectWalletDialog>
        )}
      </motion.div>

      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link href="/me">
          <Button className="w-[500px]" variant="translucent">
            Your <span className="font-bold italic">Mizt</span> Account
          </Button>
        </Link>
      </motion.div>
    </motion.main>
  )
}
