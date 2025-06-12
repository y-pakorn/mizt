import { Metadata } from "next"
import { redirect } from "next/navigation"

import { CURRENCIES } from "@/config/currency"
import { siteConfig } from "@/config/site"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { message: string; amount: string; coin: string; key: string }
}): Promise<Metadata> {
  const { message, amount, coin, key } = searchParams
  const ticker = CURRENCIES.find((c) => c.coinType === coin)?.ticker
  return {
    title: `${amount} ${ticker} - "${message}"`,
    description: `Private payment requested by a Mizt account, ${amount} ${ticker}. "${message}"`,
    openGraph: {
      images: {
        url: siteConfig.ogRequestPaymentImage,
        width: 1200,
        height: 630,
      },
    },
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: { message: string; amount: string; coin: string; key: string }
}) {
  const { message, amount, coin, key } = searchParams
  const ticker = CURRENCIES.find((c) => c.coinType === coin)?.ticker
  return redirect(
    `/?message=${message}&amount=${amount}&coin=${coin}&key=${key}`
  )
}
