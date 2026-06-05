import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bigintToBeBytes, bytesToHex, concatBytes, expectBytes } from "./bytes.js";
import { bincodeSignedTransaction, encodeTransactionForHash, type NativeEvmTxFields } from "./tx.js";

export const ML_DSA_65_SEED_LEN = 32;
export const ML_DSA_65_SIGNING_KEY_LEN = 4032;
export const ML_DSA_65_PUBLIC_KEY_LEN = 1952;
export const ML_DSA_65_SIGNATURE_LEN = 3309;
export const STANDARD_ALGO_NUMBER_ML_DSA_65 = 1001;
export const ENUM_VARIANT_INDEX_ML_DSA_65 = 2;
export const ADDRESS_DERIVATION_DOMAIN = "MONO_ADDRESS_BLAKE3_20_V1";

const ADDRESS_DERIVATION_DOMAIN_BYTES = new TextEncoder().encode(ADDRESS_DERIVATION_DOMAIN);

export class MlDsa65Backend {
  readonly #secretKey: Uint8Array;
  readonly #publicKey: Uint8Array;
  readonly #addressBytes: Uint8Array;

  private constructor(secretKey: Uint8Array, publicKey: Uint8Array) {
    this.#secretKey = expectBytes(secretKey, ML_DSA_65_SIGNING_KEY_LEN, "ML-DSA-65 secret key").slice();
    this.#publicKey = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key").slice();
    this.#addressBytes = mlDsa65AddressBytes(this.#publicKey);
  }

  static fromSeed(seed: Uint8Array | readonly number[]): MlDsa65Backend {
    const kp = ml_dsa65.keygen(expectBytes(seed, ML_DSA_65_SEED_LEN, "ML-DSA-65 seed"));
    return new MlDsa65Backend(kp.secretKey, kp.publicKey);
  }

  publicKey(): Uint8Array {
    return this.#publicKey.slice();
  }

  addressBytes(): Uint8Array {
    return this.#addressBytes.slice();
  }

  getAddress(): string {
    return bytesToHex(this.#addressBytes);
  }

  sign(message: Uint8Array): Uint8Array {
    return ml_dsa65.sign(message, this.#secretKey, { extraEntropy: false });
  }

  signPrehash(digest: Uint8Array): Uint8Array {
    return this.sign(expectBytes(digest, 32, "prehash"));
  }

  verify(message: Uint8Array, signature: Uint8Array): boolean {
    return ml_dsa65.verify(
      expectBytes(signature, ML_DSA_65_SIGNATURE_LEN, "ML-DSA-65 signature"),
      message,
      this.#publicKey,
    );
  }

  signEvmTx(fields: NativeEvmTxFields): {
    wireHex: string;
    wireBytes: Uint8Array;
    sighash: Uint8Array;
    txHash: Uint8Array;
  } {
    const txHashPreimage = encodeTransactionForHash(fields, 0x01);
    const sighash = keccak_256(txHashPreimage);
    const signature = this.sign(sighash);
    const wireBytes = bincodeSignedTransaction(fields, signature, this.#publicKey);
    const txHash = keccak_256(
      concatBytes(
        encodeTransactionForHash(fields, 0x02),
        signature,
        this.#publicKey,
      ),
    );
    return {
      wireHex: bytesToHex(wireBytes).slice(2),
      wireBytes,
      sighash,
      txHash,
    };
  }
}

export function mlDsa65AddressFromPublicKey(publicKey: Uint8Array | readonly number[]): string {
  return bytesToHex(mlDsa65AddressBytes(publicKey));
}

export function mlDsa65AddressBytes(publicKey: Uint8Array | readonly number[]): Uint8Array {
  const bytes = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key");
  return blake3(concatBytes(
    ADDRESS_DERIVATION_DOMAIN_BYTES,
    bigintToBeBytes(BigInt(STANDARD_ALGO_NUMBER_ML_DSA_65), 2, "ML-DSA-65 algo id"),
    bytes,
  )).slice(0, 20);
}

export function encodeMlDsa65Opaque(raw: Uint8Array | readonly number[]): Uint8Array {
  const bytes = raw instanceof Uint8Array ? raw : Uint8Array.from(raw);
  const len = bytes.length === ML_DSA_65_PUBLIC_KEY_LEN ? ML_DSA_65_PUBLIC_KEY_LEN : ML_DSA_65_SIGNATURE_LEN;
  expectBytes(bytes, len, "ML-DSA-65 opaque bytes");
  const out = new Uint8Array(4 + 2 + 8 + bytes.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, ENUM_VARIANT_INDEX_ML_DSA_65, true);
  dv.setUint16(4, STANDARD_ALGO_NUMBER_ML_DSA_65, true);
  dv.setBigUint64(6, BigInt(bytes.length), true);
  out.set(bytes, 14);
  return out;
}

export function uint256Bytes(value: bigint | number | string, label: string): Uint8Array {
  const v = typeof value === "bigint" ? value : typeof value === "number" ? BigInt(value) : BigInt(value);
  return bigintToBeBytes(v, 32, label);
}
