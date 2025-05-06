import { EventId, getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"
import { base58 } from "@scure/base"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import { contract } from "@/config/contract"

interface MiztKey {
  address: string
  priv: number[]
  pub: number[]
  mizt: string // mizt...
  accounts: {
    priv: number[]
    mizt: string // mizt...
  }[]
}

interface MiztAccountState {
  key: Record<string, MiztKey>
  lastSynced: {
    time: number
    eventId: EventId | null
  } | null
  generateKey: (seed: string, address: string) => void
  generateNewAddress: (address: string) => string
  sync: () => Promise<void>
}

export const useMiztAccount = create<MiztAccountState>()(
  persist(
    (set, get) => ({
      key: {},
      lastSynced: null,
      generateKey: (seed: string, address: string) => {
        const priv = keccak_256(seed)
        const pub = secp256k1.getPublicKey(priv)
        const rand = secp256k1.utils.randomPrivateKey()
        const mizt = base58.encode(new Uint8Array([...pub, ...rand]))
        set((state) => ({
          key: {
            ...state.key,
            [address]: {
              address,
              pub: Array.from(pub),
              priv: Array.from(priv),
              mizt: `mizt${mizt}`,
              accounts: [],
            },
          },
        }))
      },
      generateNewAddress: (address: string) => {
        const key = get().key[address]
        if (!key) {
          return ""
        }
        const pub = new Uint8Array(key.pub)
        const rand = secp256k1.utils.randomPrivateKey()
        const mizt = base58.encode(new Uint8Array([...rand, ...pub]))

        set((state) => ({
          key: {
            ...state.key,
            [address]: { ...key, mizt: `mizt${mizt}` },
          },
        }))

        return mizt
      },
      sync: async () => {
        const client = new SuiClient({
          url: getFullnodeUrl("testnet"),
        })
        const mizt = get()
        while (true) {
          const events = await client.queryEvents({
            query: {
              MoveEventType: `${contract.packageId}::core::NewEphemeralPub`,
            },
            order: "ascending",
            cursor: mizt.lastSynced?.eventId,
            limit: 1000,
          })

          const pubkeys = events.data.map((e) => ({
            ephemeral: new Uint8Array((e.parsedJson as any).ephemeral_pub),
            shared: new Uint8Array((e.parsedJson as any).shared_pub),
          }))

          // for each pubkey, try to match with existing key
          for (const pubkey of pubkeys) {
          }

          if (!events.hasNextPage) {
            set({
              lastSynced: {
                eventId: events.nextCursor || null,
                time: Date.now(),
              },
            })
            break
          }
        }
      },
    }),
    {
      name: "mizt-account-2",
    }
  )
)
