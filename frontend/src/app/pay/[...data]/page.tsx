import { cache } from "react"
import { Metadata, ResolvingMetadata } from "next"
import { redirect } from "next/navigation"
import { base58 } from "@scure/base"

import { CURRENCIES } from "@/config/currency"
import { siteConfig } from "@/config/site"

export const revalidate = false

type Props = {
  // searchParams: Promise<{
  //   message: string
  //   amount: string
  //   coin: string
  //   key: string
  // }>
  params: Promise<{
    data: [string]
  }>
}

const getData = cache((data: string) => {
  const decoded = new TextDecoder().decode(base58.decode(data))
  const { message, amount, coin, key } = JSON.parse(decoded)
  return {
    message,
    amount,
    coin,
    key,
  }
})

export async function generateMetadata(
  { params }: Props,
  _: ResolvingMetadata
): Promise<Metadata> {
  const { data } = await params
  const { message, amount, coin } = getData(data[0])
  const ticker = CURRENCIES.find((c) => c.coinType === coin)?.ticker
  return {
    title: `${amount} ${ticker} - "${message}"`,
    description: `Private payment requested by a Mizt account, ${amount} ${ticker}. "${message}"`,
    openGraph: {
      images: {
        url: siteConfig.ogRequestPaymentImage,
        width: 1200,
        height: 630,
        alt: `${amount} ${ticker} - "${message}"`,
      },
    },
    twitter: {
      card: "summary_large_image",
      title: `${amount} ${ticker} - "${message}"`,
      description: `Private payment requested by a Mizt account, ${amount} ${ticker}. "${message}"`,
      images: {
        url: siteConfig.ogRequestPaymentImage,
        width: 1200,
        height: 630,
        alt: `${amount} ${ticker} - "${message}"`,
      },
    },
  }
}

export default async function Page({ params }: Props) {
  const { data } = await params
  const { message, amount, coin, key } = getData(data[0])
  if (!key || !coin || !amount) {
    return redirect("/")
  }
  return redirect(
    `/?message=${message}&amount=${amount}&coin=${coin}&key=${key}`
  )
}
