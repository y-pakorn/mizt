import { ComponentProps, useEffect, useMemo, useState } from "react"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import {
  Secp256k1Keypair,
  Secp256k1PublicKey,
} from "@mysten/sui/keypairs/secp256k1"
import { Transaction } from "@mysten/sui/transactions"
import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"
import { base58 } from "@scure/base"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BigNumber } from "bignumber.js"
import _ from "lodash"
import {
  ArrowDown,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Loader2,
  MoveRight,
  RefreshCcw,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { contract } from "@/config/contract"
import { CURRENCIES } from "@/config/currency"
import { cn } from "@/lib/utils"
import { useMiztAccount } from "@/hooks/use-mizt-account"
import { useMiztKey } from "@/hooks/use-mizt-key"
import { useMiztPubkey } from "@/hooks/use-mizt-pubkey"
import { refreshPrivateBalances } from "@/hooks/use-private-balances"
import { refreshTokenBalance } from "@/hooks/use-token-balance"

import { Button } from "./ui/button"
import { Card, CardContent, CardTitle } from "./ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { TransparentInput } from "./ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

export function SendPrivateBalanceDialog({
  coinType,
  total,
  balances,
  children,
  ...props
}: {
  coinType: string
  total: number
  balances: Record<string, number>
} & ComponentProps<typeof Dialog>) {
  const currentAccount = useCurrentAccount()
  const mizt = useMiztAccount()
  const key = useMiztKey()

  const client = useSuiClient()
  const queryClient = useQueryClient()

  const [amount, setAmount] = useState<string>("")
  const [recipient, setRecipient] = useState<string>("")
  const [recipientType, setRecipientType] = useState<"external" | "mizt">(
    "external"
  )
  const setRecipientDebounce = useMemo(() => _.debounce(setRecipient, 500), [])

  const amountNumber = useMemo(() => {
    try {
      return parseFloat(amount)
    } catch (_) {
      return null
    }
  }, [amount])

  useEffect(() => {
    setRecipient("")
  }, [recipientType])

  const currency = useMemo(() => {
    return CURRENCIES.find((c) => c.coinType === coinType)
  }, [coinType])

  const { name, pubkey } = useMemo(() => {
    if (recipientType === "external") {
      return {
        name: undefined,
        pubkey: undefined,
      }
    } else {
      if (recipient.endsWith(".mizt")) {
        return {
          name: recipient.slice(0, -5),
          pubkey: undefined,
        }
      } else {
        try {
          const trimmed = recipient.replace(/^mizt/, "")
          const decoded = base58.decode(trimmed)
          const epimeralKey = decoded.slice(0, 32)
          const epimeralPubkey = secp256k1.getPublicKey(epimeralKey)
          const meta = decoded.slice(32)
          const sharedSecret = secp256k1.getSharedSecret(epimeralKey, meta)
          const hashedSharedSecret = keccak_256(sharedSecret)
          const hashedSharedSecretPubkey =
            secp256k1.getPublicKey(hashedSharedSecret)
          const addrPubkey = secp256k1.ProjectivePoint.fromHex(meta)
            .add(secp256k1.ProjectivePoint.fromHex(hashedSharedSecretPubkey))
            .toRawBytes()
          const addr = new Secp256k1PublicKey(addrPubkey).toSuiAddress()
          return {
            name: undefined,
            pubkey: {
              epimeralPubkey,
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
    }
  }, [recipient, recipientType])

  const _namePubkey = useMiztPubkey({
    name,
  })
  const [nonce, setNonce] = useState<number>(0)
  const namePubkey = useMemo(() => {
    if (!_namePubkey.data) return null
    const meta = new Uint8Array(_namePubkey.data.pub)
    const epimeralKey = secp256k1.utils.randomPrivateKey()
    const epimeralPubkey = secp256k1.getPublicKey(epimeralKey)
    const sharedSecret = secp256k1.getSharedSecret(epimeralKey, meta)
    const mizt = base58.encode(new Uint8Array([...epimeralKey, ...meta]))
    const hashedSharedSecret = keccak_256(sharedSecret)
    const hashedSharedSecretPubkey = secp256k1.getPublicKey(hashedSharedSecret)
    const addrPubkey = secp256k1.ProjectivePoint.fromHex(meta)
      .add(secp256k1.ProjectivePoint.fromHex(hashedSharedSecretPubkey))
      .toRawBytes()
    const addr = new Secp256k1PublicKey(addrPubkey).toSuiAddress()
    return {
      epimeralPubkey,
      sharedSecret,
      mizt: `mizt${mizt}`,
      addr,
    }
  }, [_namePubkey.data, nonce])

  const transfer = useMutation({
    mutationFn: async () => {
      if (!currentAccount) return
      if (!amountNumber) throw new Error("Invalid amount")
      if (amountNumber > total) throw new Error("Insufficient balance")
      if (recipientType === "external") {
        if (!recipient) throw new Error("Invalid external recipient")
      } else {
        if (!namePubkey && !pubkey) throw new Error("Invalid mizt recipient")
      }
      const coin = CURRENCIES.find((c) => c.coinType === coinType)
      if (!coin) throw new Error("Invalid coin type")

      const fullAmount = new BigNumber(amount)
      let taken = new BigNumber(0)
      const usedBalances: {
        account: string
        amount: string
        takeFullBalance: boolean
      }[] = []
      _.chain(balances)
        .entries()
        .sortBy(([_, amount]) => amount)
        .takeWhile(([account, amount]) => {
          const amountBn = new BigNumber(amount)
          const usedThisAccount = BigNumber.min(
            amountBn,
            fullAmount.minus(taken)
          )
          taken = taken.plus(usedThisAccount)
          usedBalances.push({
            account,
            amount: usedThisAccount
              .shiftedBy(coin.decimals)
              .integerValue(BigNumber.ROUND_FLOOR)
              .toString(),
            takeFullBalance: usedThisAccount.eq(amountBn),
          })
          return taken.lt(fullAmount)
        })
        .value()

      const txs = await Promise.all(
        usedBalances.map(async ({ account, amount }) => {
          const res = await fetch("/api/sponsor-create", {
            method: "POST",
            body: JSON.stringify({
              sender: account,
              recipient:
                recipientType === "external"
                  ? {
                      type: "address",
                      address: recipient,
                    }
                  : {
                      type: "mizt",
                      address: (namePubkey || pubkey)?.addr,
                      ephemeralPubkey: [
                        ...((namePubkey || pubkey)?.epimeralPubkey || []),
                      ],
                    },
              amount,
              coinType,
            }),
          })

          const { digest, bytes } = await res.json()
          const privateKey = key?.accounts[account]?.suiPriv!
          const keypair = Secp256k1Keypair.fromSecretKey(
            new Uint8Array(privateKey)
          )
          const { signature } = await keypair.signTransaction(
            Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0))
          )
          const submitRes = await fetch("/api/sponsor-submit", {
            method: "POST",
            body: JSON.stringify({
              digest,
              signature,
            }),
          })
          const { digest: finalDigest } = await submitRes.json()
          await client.waitForTransaction({
            digest: finalDigest,
          })
          return finalDigest as string
        })
      )

      refreshTokenBalance(queryClient, currentAccount.address, coinType)
      refreshPrivateBalances(queryClient, currentAccount.address)
      mizt.sync(currentAccount.address)
      toast.success("Transferred successfully", {
        description: (
          <div>
            {txs.map((tx) => (
              <a
                href={`${contract.blockExplorer}/tx/${tx}`}
                target="_blank"
                className="inline-flex items-center gap-2 underline"
                key={tx}
              >
                {tx.slice(0, 12)}... <ArrowUpRight className="size-4" />
              </a>
            ))}
          </div>
        ),
        duration: 10000, // 10 seconds
      })
      return txs
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Private Balance</DialogTitle>
          <DialogDescription>
            Gaslessly combine and send your private balance to any address,
            including other <span className="font-bold italic">Mizt</span>{" "}
            accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full space-y-1">
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
                <Button variant="translucent" disabled>
                  <img
                    src={currency?.logo}
                    alt={currency?.name}
                    className="size-4 rounded-full"
                  />
                  <span className="font-semibold">{currency?.ticker}</span>
                </Button>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <div className="flex-1" />
                <Wallet className="size-3" />
                <span className="font-semibold">{total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <Tabs
                defaultValue="external"
                value={recipientType}
                onValueChange={(v) =>
                  setRecipientType(v as "external" | "mizt")
                }
              >
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm">
                  Recipient
                  <TabsList className="h-7 px-0.5 *:h-6 *:px-2 *:text-xs">
                    <TabsTrigger value="external">External Address</TabsTrigger>
                    <TabsTrigger value="mizt">Mizt Account</TabsTrigger>
                  </TabsList>
                </CardTitle>
                <TabsContent value="external">
                  <TransparentInput
                    onChange={(e) => setRecipientDebounce(e.target.value)}
                    className="mb-0 h-10 text-2xl!"
                    placeholder="0x883b27de942203191726d6722dc097b6d5499234be2aa22c3872849c45fdd712"
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
                </TabsContent>
                <TabsContent value="mizt">
                  <TransparentInput
                    onChange={(e) => setRecipientDebounce(e.target.value)}
                    className="mb-0 h-10 text-2xl!"
                    placeholder="muasist.mizt or miztDhy1Nee3SEV..."
                    autoCorrect="false"
                    spellCheck="false"
                  />
                  <div>
                    {namePubkey && (
                      <div className="text-muted-foreground line-clamp-1 flex items-center justify-end gap-2 truncate text-xs">
                        <div className="mr-auto truncate">
                          {namePubkey.mizt.slice(0, 20)}...
                        </div>
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
                      </div>
                    )}
                    {(namePubkey?.addr || pubkey?.addr) && (
                      <div className="text-muted-foreground truncate font-mono text-xs">
                        {namePubkey?.addr.slice(0, 20) ||
                          pubkey?.addr.slice(0, 20)}
                        ...
                      </div>
                    )}
                    {name && !namePubkey && (
                      <div className="text-muted-foreground flex h-6 items-center text-xs">
                        Name not found.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        <Button
          className="w-full"
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
      </DialogContent>
      {children}
    </Dialog>
  )
}

export function SendPrivateBalanceDialogTrigger({
  children,
  ...props
}: ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}
