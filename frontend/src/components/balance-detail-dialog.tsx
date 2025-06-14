import { ComponentProps, useMemo } from "react"
import Link from "next/link"
import _ from "lodash"
import { ArrowUpRight, Copy } from "lucide-react"
import { toast } from "sonner"
import { toHex } from "viem"

import { contract } from "@/config/contract"
import { CURRENCIES } from "@/config/currency"
import { useMiztKey } from "@/hooks/use-mizt-key"

import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"

export function BalanceDetailDialog({
  coinType,
  balances,
  children,
  ...props
}: ComponentProps<typeof Dialog> & {
  coinType: string
  balances: Record<string, number>
}) {
  const key = useMiztKey()
  const currency = useMemo(
    () => CURRENCIES.find((c) => c.coinType === coinType),
    [coinType]
  )
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Balance Detail</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="h-full max-h-[500px] overflow-y-auto"
          type="hover"
        >
          <div className="grid space-y-2">
            {Object.entries(balances).map(([address, balance]) => (
              <div key={address}>
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono">
                    {address.slice(0, 26)}
                  </span>
                  <Link
                    href={`${contract.blockExplorer}/address/${address}`}
                    target="_blank"
                  >
                    <Button variant="ghost" size="iconXs">
                      <ArrowUpRight />
                    </Button>
                  </Link>
                  <div className="ml-auto font-medium">{balance}</div>
                  <img
                    src={currency?.logo}
                    alt={currency?.name}
                    className="size-4 shrink-0 rounded-full"
                  />
                </div>
                <div className="text-muted-foreground line truncate text-xs">
                  Private Key:{" "}
                  <span className="font-mono">
                    {toHex(
                      new Uint8Array(key?.accounts[address].suiPriv || [])
                    ).slice(0, 16)}
                    ...
                  </span>
                  <Button
                    variant="ghost"
                    size="iconXs"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        toHex(
                          new Uint8Array(key?.accounts[address].suiPriv || [])
                        )
                      )
                      toast.success("Private key copied to clipboard")
                    }}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
      {children}
    </Dialog>
  )
}

export function BalanceDetailDialogTrigger({
  children,
  ...props
}: ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}
