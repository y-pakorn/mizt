"use client"

import { useState } from "react"
import { ArrowDown, ChevronDown } from "lucide-react"

import { DEFAULT_CURRENCY } from "@/config/currency"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input, TransparentInput } from "@/components/ui/input"
import { Currency } from "@/types"

export default function Home() {
  const [coin, setCoin] = useState<Currency>(DEFAULT_CURRENCY)
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
      <h1 className="text-5xl font-stretch-condensed">
        Hide your coin in the <span className="font-bold italic">Mizt</span>
      </h1>
      <p className="text-muted-foreground">
        To the unknown, in the void of the cryptography.
      </p>
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
              <TransparentInput className="h-12 text-2xl!" placeholder="0" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="translucent">
                    <img
                      src={coin.logo}
                      alt={coin.name}
                      className="size-4 rounded-full"
                    />
                    <span className="font-bold">{coin.ticker}</span>
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
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
              className="h-12 text-2xl!"
              placeholder="mizt1aorevjidfi139xqakqz92"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
