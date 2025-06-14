import {
  Secp256k1Keypair,
  Secp256k1PublicKey,
} from "@mysten/sui/keypairs/secp256k1"
import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"
import { base58 } from "@scure/base"

// alias for base‐point and group‐order
const G = secp256k1.ProjectivePoint.BASE
const n = secp256k1.CURVE.n

// helper: big‐endian bytes → BigInt
export function bytesToBigInt(b: Uint8Array): bigint {
  return BigInt("0x" + Buffer.from(b).toString("hex"))
}

//— sender: derive a one-time stealth pubkey —//
export function generateStealthAddress(userPubCompressed: Uint8Array) {
  // 1) new ephemeral key
  const ephPriv = secp256k1.utils.randomPrivateKey()
  const ephPub = secp256k1.getPublicKey(ephPriv, true)

  // 2) ECDH: P = ephPriv * userPub
  const P = secp256k1.ProjectivePoint.fromHex(userPubCompressed).multiply(
    bytesToBigInt(ephPriv)
  )

  // 3) hash compressed P → scalar h
  const h = keccak_256(P.toRawBytes(true))
  const hScalar = bytesToBigInt(h) % n

  // 4) stealthPub = userPub + h·G
  const stealthPt = secp256k1.ProjectivePoint.fromHex(userPubCompressed).add(
    G.multiply(hScalar)
  )
  const stealthPub = stealthPt.toRawBytes(true)

  const mizt = `mizt${base58.encode(new Uint8Array([...ephPriv, ...userPubCompressed]))}`

  return { stealthPub, ephPub, mizt, sharedSecret: P.toRawBytes(true) }
}

export function generateStealthAddressEpimeral(
  userPubCompressed: Uint8Array,
  ephPriv: Uint8Array
) {
  // 1) new ephemeral key
  const ephPub = secp256k1.getPublicKey(ephPriv, true)

  // 2) ECDH: P = ephPriv * userPub
  const P = secp256k1.ProjectivePoint.fromHex(userPubCompressed).multiply(
    bytesToBigInt(ephPriv)
  )

  // 3) hash compressed P → scalar h
  const h = keccak_256(P.toRawBytes(true))
  const hScalar = bytesToBigInt(h) % n

  // 4) stealthPub = userPub + h·G
  const stealthPt = secp256k1.ProjectivePoint.fromHex(userPubCompressed).add(
    G.multiply(hScalar)
  )
  const stealthPub = stealthPt.toRawBytes(true)

  const mizt = base58.encode(new Uint8Array([...ephPriv, ...userPubCompressed]))

  return { stealthPub, ephPub, mizt, sharedSecret: P.toRawBytes(true) }
}

//— you (recipient): recover the matching private key —//
export function recoverStealthPrivateKey(
  ephPubCompressed: Uint8Array,
  userPrivBytes: Uint8Array
) {
  // 1) ECDH: P' = userPriv * ephPub
  const P2 = secp256k1.ProjectivePoint.fromHex(ephPubCompressed).multiply(
    bytesToBigInt(userPrivBytes)
  )

  // 2) hash compressed P' → same hScalar
  const h2 = keccak_256(P2.toRawBytes(true))
  const hScalar2 = bytesToBigInt(h2) % n

  // 3) stealthPriv = userPriv + hScalar2  (mod n)
  const stealthBi = (bytesToBigInt(userPrivBytes) + hScalar2) % n
  // return bytes
  return secp256k1.CURVE.Fp.toBytes(stealthBi)
}
