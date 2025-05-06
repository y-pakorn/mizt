import { NextRequest, NextResponse } from "next/server"
import { EnokiClient } from "@mysten/enoki"
import { z } from "zod"

import { env } from "@/env.mjs"

const requestSchema = z.object({
  digest: z.string(),
  signature: z.string(),
})

export async function POST(request: NextRequest) {
  const { digest, signature } = await requestSchema.parseAsync(
    await request.json()
  )

  const enoki = new EnokiClient({
    apiKey: env.ENOKI_API_KEY,
  })

  const tx = await enoki.executeSponsoredTransaction({
    digest,
    signature,
  })

  return NextResponse.json(tx)
}
