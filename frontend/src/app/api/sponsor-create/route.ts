import { NextRequest, NextResponse } from "next/server"
import { EnokiClient } from "@mysten/enoki"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import {
  buildGaslessTransaction,
  createSuiClient,
  GasStationClient,
} from "@shinami/clients/sui"
import { z } from "zod"

import { env } from "@/env.mjs"
import { contract } from "@/config/contract"

const requestSchema = z.object({
  sender: z.string(),
  coinType: z.string(),
  amount: z.string(),
  recipient: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("address"),
      address: z.string(),
    }),
    z.object({
      type: z.literal("mizt"),
      address: z.string(),
      ephemeralPubkey: z.array(z.number()),
    }),
  ]),
})

export async function POST(request: NextRequest) {
  const { sender, recipient, coinType, amount } =
    await requestSchema.parseAsync(await request.json())

  const sui = new SuiClient({
    url: getFullnodeUrl("testnet"),
  })
  const enoki = new EnokiClient({
    apiKey: env.ENOKI_API_KEY,
  })
  const coins = await sui.getCoins({
    owner: sender,
    coinType,
  })
  const txb = new Transaction()
  // get final coin
  const coin = (() => {
    if (coins.data.length > 1) {
      txb.mergeCoins(
        coins.data[0].coinObjectId,
        coins.data.slice(1).map((coin) => coin.coinObjectId)
      )
    }
    return coins.data[0].coinObjectId
  })()
  const outCoin = txb.splitCoins(coin, [txb.pure.u64(amount)])

  // determine if recipient is address or mizt
  if (recipient.type === "address") {
    txb.transferObjects([outCoin], recipient.address)
  } else {
    txb.moveCall({
      target: `${contract.packageId}::core::transfer_coin_in`,
      arguments: [
        txb.object(contract.miztId),
        txb.pure.address(recipient.address),
        txb.pure.vector("u8", recipient.ephemeralPubkey),
        outCoin,
      ],
      typeArguments: [coinType],
    })
  }
  const tx = await txb.build({
    client: sui,
    onlyTransactionKind: true,
  })

  const sponsoredResponse = await enoki.createSponsoredTransaction({
    transactionKindBytes: Buffer.from(tx).toString("base64"),
    network: "testnet",
    sender,
    allowedAddresses: [recipient.address],
    allowedMoveCallTargets: [`${contract.packageId}::core::transfer_coin_in`],
  })

  return NextResponse.json(sponsoredResponse)
}
