import { EventId, getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import {
  Secp256k1Keypair,
  Secp256k1PublicKey,
} from "@mysten/sui/keypairs/secp256k1"
import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"
import { base58 } from "@scure/base"
import _ from "lodash"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import { contract } from "@/config/contract"

interface MiztKey {
  address: string
  priv: number[]
  pub: number[]
  mizt: string // mizt...
  accounts: Record<
    string,
    {
      suiPriv: number[]
      suiAddress: string
    }
  > // address -> account
  lastSynced: {
    time: number
    eventId: EventId | null
  } | null
}

interface MiztAccountState {
  key: Record<string, MiztKey>
  generateKey: (seed: string, address: string) => void
  generateNewAddress: (address: string) => string
  sync: (address: string) => Promise<void>
  removeAccounts: (address: string, removeAccounts: string[]) => void
  isSyncing: boolean
}

export const useMiztAccount = create<MiztAccountState>()(
  persist(
    (set, get) => ({
      key: {},
      isSyncing: false,
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
              accounts: {},
              lastSynced: null,
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
      sync: async (address: string) => {
        const client = new SuiClient({
          url: getFullnodeUrl("mainnet"),
        })
        set({
          isSyncing: true,
        })
        const key = get().key[address]
        if (!key) {
          set({
            isSyncing: false,
          })
          return
        }
        let cursor = key.lastSynced?.eventId
        while (true) {
          const events = await client.queryEvents({
            query: {
              MoveEventType: `${contract.packageId}::core::NewEphemeralPub`,
            },
            order: "ascending",
            cursor,
            limit: 1000,
          })

          const pubkeys = events.data.map((e) => ({
            ephemeral: new Uint8Array((e.parsedJson as any).ephemeral_pub),
            addr: (e.parsedJson as any).addr as string,
          }))

          // for each pubkey, try to match with existing key
          for (const pubkey of pubkeys) {
            // calculate target address based on ephemeral pubkey
            const sharedSecret = secp256k1.getSharedSecret(
              new Uint8Array(key.priv),
              pubkey.ephemeral
            )
            const hashedSharedSecret = keccak_256(sharedSecret)
            const addrPrivateKey = secp256k1.CURVE.Fp.toBytes(
              secp256k1.CURVE.Fp.add(
                secp256k1.CURVE.Fp.fromBytes(new Uint8Array(key.priv)),
                secp256k1.CURVE.Fp.fromBytes(hashedSharedSecret)
              )
            )
            const keypair = Secp256k1Keypair.fromSecretKey(addrPrivateKey)
            const addr = keypair.toSuiAddress()
            if (addr === pubkey.addr) {
              key.accounts[addr] = {
                suiPriv: [...addrPrivateKey],
                suiAddress: addr,
              }
            }
          }

          set((state) => ({
            key: {
              ...state.key,
              [address]: key,
            },
          }))

          if (!events.hasNextPage) {
            set((state) => ({
              key: {
                ...state.key,
                [address]: {
                  ...key,
                  lastSynced: {
                    eventId: events.nextCursor || null,
                    time: Date.now(),
                  },
                },
              },
            }))
            break
          } else {
            cursor = events.nextCursor
          }
        }
        set({
          isSyncing: false,
        })
      },
      removeAccounts: (address: string, removeAccounts: string[]) => {
        set((state) => ({
          key: {
            ...state.key,
            [address]: {
              ...state.key[address],
              accounts: _.omit(state.key[address].accounts, removeAccounts),
            },
          },
        }))
      },
    }),

    {
      name: "mizt-account-2",
    }
  )
)
