import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"
import { base58 } from "@scure/base"
import { fromHex } from "viem"
import { generatePrivateKey } from "viem/accounts"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface MiztKey {
  address: string
  priv: number[]
  pub: number[]
  mizt: string // mizt...
  lastSynced: number
  accounts: {
    priv: number[]
    mizt: string // mizt...
  }[]
}

interface MiztAccountState {
  key: Record<string, MiztKey>
  generateKey: (seed: string, address: string) => void
  generateNewAddress: (address: string) => string
}

export const useMiztAccount = create<MiztAccountState>()(
  persist(
    (set, get) => ({
      key: {},
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
              lastSynced: Date.now(),
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
    }),
    {
      name: "mizt-account-2",
    }
  )
)
