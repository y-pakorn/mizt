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

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
      <Link href="/">
        <h2 className="inline-flex items-center gap-1">
          <img src="/logo.webp" alt="Mizt" className="size-7" />
          <span className="text-2xl font-semibold italic">mizt</span>
        </h2>
      </Link>
      {message ? (
        <>
          <h1 className="text-5xl font-stretch-condensed">{message}</h1>
          <p className="text-muted-foreground">
            Hide your coin in the <span className="font-bold italic">Mizt</span>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-5xl font-stretch-condensed">
            Hide your coin in the <span className="font-bold italic">Mizt</span>
          </h1>
          <p className="text-muted-foreground">
            To the unknown, in the void of the cryptography on{" "}
            <span className="font-medium">Mainnet</span>.
          </p>
        </>
      )}
      {currentAccount && (
        <div className="flex items-center gap-4">
          <SwitchAccountButton />
          <DisconnectButton />
        </div>
      )}
      <div className="relative w-[500px] space-y-1">
        <div className="bg-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl p-2">
          <ArrowDown className="size-6" />
        </div>
        <Card>
          <CardContent className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm">
              Coin
            </CardTitle>
            <div className="flex items-center gap-2">
              <TransparentInput
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mb-0 h-10 text-2xl!"
                placeholder="0"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="translucent">
                    <img
                      src={coin.logo}
                      alt={coin.name}
                      className="size-4 rounded-full"
                    />
                    <span className="font-semibold">{coin.ticker}</span>
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CURRENCIES.map((currency) => (
                    <DropdownMenuItem
                      key={currency.ticker}
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
                      <span className="font-semibold">{currency.ticker}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <div className="flex-1" />
              <Wallet className="size-3" />
              <span className="font-semibold">
                {balance.data?.amount.toLocaleString() || "-"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm">
              <span className="font-bold! italic">Mizt</span> Recipient
            </CardTitle>
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
            <div>
              {namePubkey && (
                <div className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
                  <div className="mr-auto truncate">{namePubkey.mizt}</div>
                  <Button
                    size="iconXs"
                    variant="outlineTranslucent"
                    onClick={() => setNonce((n) => n + 1)}
                  >
                    <RefreshCcw
                      className={cn(_namePubkey.isPending && "animate-spin")}
                    />
                  </Button>
                </div>
              )}
              {(namePubkey?.addr || pubkey?.addr) && (
                <div className="text-muted-foreground truncate font-mono text-xs">
                  {namePubkey?.addr || pubkey?.addr}
                </div>
              )}
              {name && !namePubkey && (
                <div className="text-muted-foreground flex h-6 items-center text-xs">
                  Name not found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {currentAccount ? (
        <Button
          className="w-[500px]"
          variant="outline"
          disabled={transfer.isPending || !amountNumber || !recipient}
          onClick={() => transfer.mutateAsync()}
        >
          {transfer.isPending ? "Transferring..." : "Transfer"}{" "}
          {transfer.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <MoveRight />
          )}
        </Button>
      ) : (
        <ConnectWalletDialog>
          <ConnectWalletDialogTrigger asChild>
            <Button className="w-[500px]" variant="outline">
              Connect And Transfer <MoveRight />
            </Button>
          </ConnectWalletDialogTrigger>
        </ConnectWalletDialog>
      )}
      <Link href="/me">
        <Button className="w-[500px]" variant="translucent">
          Your <span className="font-bold italic">Mizt</span> Account
        </Button>
      </Link>
    </main>
  )
}
