"use client"

import { useEffect, useMemo, useState } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { secp256k1 } from "@noble/curves/secp256k1"
import { base58 } from "@scure/base"
import _ from "lodash"
import { ArrowDown, ChevronDown, MoveRight, RefreshCcw } from "lucide-react"

import { CURRENCIES, DEFAULT_CURRENCY } from "@/config/currency"
import { cn } from "@/lib/utils"
import { useMiztAccount } from "@/hooks/use-mizt-account"
import { useMiztPubkey } from "@/hooks/use-mizt-pubkey"
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
  const currentAccount = useCurrentAccount()

  const [amount, setAmount] = useState<string>("")
  const [coin, setCoin] = useState<Currency>(DEFAULT_CURRENCY)
  const [recipient, setRecipient] = useState<string>("")
  const setRecipientDebounce = useMemo(() => _.debounce(setRecipient, 500), [])

  useEffect(() => {
    setAmount("")
  }, [coin])

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
        const epimeralKey = decoded.slice(0, 32)
        const meta = decoded.slice(32)
        const sharedSecret = secp256k1.getSharedSecret(epimeralKey, meta)
        return {
          name: undefined,
          pubkey: {
            epimeralKey,
            sharedSecret,
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

  const namePubkey = useMiztPubkey({
    name,
    select: (data) => {
      if (!data) return null
      const meta = data.pub
      const epimeralKey = secp256k1.utils.randomPrivateKey()
      const epimeralPubkey = secp256k1.getPublicKey(epimeralKey)
      const sharedSecret = secp256k1.getSharedSecret(
        epimeralKey,
        new Uint8Array(data.pub)
      )
      const mizt = base58.encode(new Uint8Array([...epimeralKey, ...meta]))
      return {
        epimeralPubkey,
        sharedSecret,
        mizt: `mizt${mizt}`,
      }
    },
  })

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
      <h1 className="text-5xl font-stretch-condensed">
        Hide your coin in the <span className="font-bold italic">Mizt</span>
      </h1>
      <p className="text-muted-foreground">
        To the unknown, in the void of the cryptography.
      </p>
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
                className="h-12 text-2xl!"
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
                      onClick={() => setCoin(currency)}
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <CardTitle className="text-muted-foreground text-sm">
              <span className="font-bold! italic">Mizt</span> Recipient
            </CardTitle>
            <TransparentInput
              onChange={(e) => setRecipientDebounce(e.target.value)}
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
            {namePubkey.data && (
              <div className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
                <div className="mr-auto truncate">{namePubkey.data.mizt}</div>
                <Button
                  size="iconSm"
                  variant="outlineTranslucent"
                  onClick={() => namePubkey.refetch()}
                >
                  <RefreshCcw
                    className={cn(namePubkey.isPending && "animate-spin")}
                  />
                </Button>
              </div>
            )}
            {name && !namePubkey.data && !namePubkey.isPending && (
              <div className="text-muted-foreground text-xs">
                Name not found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {currentAccount ? (
        <Button className="w-[500px]" variant="outline">
          Transfer <MoveRight />
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
    </main>
  )
}
