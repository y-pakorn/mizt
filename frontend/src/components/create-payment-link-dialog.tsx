import { ComponentProps, useMemo, useState } from "react"
import { base58 } from "@scure/base"
import { ChevronDown, Link } from "lucide-react"
import { toast } from "sonner"

import { env } from "@/env.mjs"
import { CURRENCIES, DEFAULT_CURRENCY } from "@/config/currency"
import { useMiztKey } from "@/hooks/use-mizt-key"

import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export function CreatePaymentLinkDialog({
  children,
  ...props
}: ComponentProps<typeof Dialog>) {
  const key = useMiztKey()

  const [message, setMessage] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [coin, setCoin] = useState(DEFAULT_CURRENCY)

  const amountNumber = useMemo(() => {
    if (!amount) return null
    try {
      return parseFloat(amount)
    } catch {
      return null
    }
  }, [amount])

  return (
    <Dialog {...props}>
      {children}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payment Link</DialogTitle>
          <DialogDescription>
            Create a new payment link to receive private balance with customized
            message and amount.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Message (Optional)</Label>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Lend 10.25 USDC to @muasist"
          />

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.25"
              />
            </div>
            <div className="w-[120px] space-y-2">
              <Label>Coin</Label>
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
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            variant="secondary"
            disabled={!amountNumber}
            onClick={() => {
              if (!key?.mizt) {
                toast.error("Please generate a Mizt address first")
                return
              }
              const data = JSON.stringify({
                message,
                amount: amountNumber,
                coin: coin.coinType,
                key: key.mizt,
              })
              const link = `${env.NEXT_PUBLIC_APP_URL}/pay/${base58.encode(new TextEncoder().encode(data))}`
              navigator.clipboard.writeText(link)
              toast.success("Link copied to clipboard")
            }}
          >
            Create And Copy Link <Link />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CreatePaymentLinkDialogTrigger({
  children,
  ...props
}: ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}
