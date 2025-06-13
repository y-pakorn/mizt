import { Metadata, ResolvingMetadata } from "next"
import { redirect } from "next/navigation"

import { CURRENCIES } from "@/config/currency"
import { siteConfig } from "@/config/site"

type Props = {
  searchParams: Promise<{
    message: string
    amount: string
    coin: string
    key: string
  }>
}

export async function generateMetadata(
  { searchParams }: Props,
  _: ResolvingMetadata
): Promise<Metadata> {
  const { message, amount, coin } = await searchParams
  const ticker = CURRENCIES.find((c) => c.coinType === coin)?.ticker
  return {
    title: `${amount} ${ticker} - "${message}"`,
    description: `Private payment requested by a Mizt account, ${amount} ${ticker}. "${message}"`,
    openGraph: {
      images: [
        {
          url: siteConfig.ogRequestPaymentImage,
          width: 1200,
          height: 630,
          alt: `${amount} ${ticker} - "${message}"`,
        },
      ],
    },
  }
}

export default async function Page({ searchParams }: Props) {
  const { message, amount, coin, key } = await searchParams
  return redirect(
    `/?message=${message}&amount=${amount}&coin=${coin}&key=${key}`
  )
}
