import { env } from "@/env.mjs"

export const siteConfig = {
  name: "Mizt",
  author: "yoisha",
  description: "Hide your coin in the Mizt",
  keywords: ["mizt", "crypto", "coin", "hide", "mint", "sui", "crypto"],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "yoisha",
  },
  twitter: "",
  favicon: "/logo.webp",
  ogImage: "https://i.ibb.co/wNjNy1Hs/og.webp",
  ogRequestPaymentImage: "https://i.ibb.co/7dYnPdh9/ogrequest.webp",
}
