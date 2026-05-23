import { BincodeWriter } from "./bincode.js";
import { bigintToBeBytes, concatBytes, expectBytes, hexToBytes, parseBigint } from "./bytes.js";
import {
  ENUM_VARIANT_INDEX_ML_DSA_65,
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  STANDARD_ALGO_NUMBER_ML_DSA_65,
} from "./ml-dsa.js";

export interface NativeEvmTxFields {
  chainId: bigint | number | string;
  nonce: bigint | number | string;
  maxPriorityFeePerGas: bigint | number | string;
  maxFeePerGas: bigint | number | string;
  gasLimit: bigint | number | string;
  to: Uint8Array | readonly number[] | string | null;
  value: bigint | number | string;
  input?: Uint8Array | readonly number[] | string;
  extensions?: readonly NativeTxExtensionLike[];
}

export interface NativeTxExtension {
  kind: number;
  body: Uint8Array | readonly number[] | string;
}

export interface NativeTxExtensionDescriptor {
  kind: number;
  bodyHex: string;
}

export type NativeTxExtensionLike = NativeTxExtension | NativeTxExtensionDescriptor;

export function encodeTransactionForHash(fields: NativeEvmTxFields, tag: 0x01 | 0x02): Uint8Array {
  const n = normalizeTxFields(fields);
  return concatBytes(
    Uint8Array.of(tag),
    bigintToBeBytes(n.chainId, 8, "chainId"),
    bigintToBeBytes(n.nonce, 8, "nonce"),
    bigintToBeBytes(n.maxPriorityFeePerGas, 32, "maxPriorityFeePerGas"),
    bigintToBeBytes(n.maxFeePerGas, 32, "maxFeePerGas"),
    bigintToBeBytes(n.gasLimit, 8, "gasLimit"),
    n.to === null ? Uint8Array.of(0) : concatBytes(Uint8Array.of(1), n.to),
    bigintToBeBytes(n.value, 32, "value"),
    bigintToBeBytes(BigInt(n.input.length), 4, "input.length"),
    n.input,
    new Uint8Array(4), // access_list length
    encodeExtensionsForHash(n.extensions),
  );
}

export function bincodeSignedTransaction(
  fields: NativeEvmTxFields,
  signature: Uint8Array | readonly number[],
  publicKey: Uint8Array | readonly number[],
): Uint8Array {
  const n = normalizeTxFields(fields);
  const sig = expectBytes(signature, ML_DSA_65_SIGNATURE_LEN, "ML-DSA-65 signature");
  const pk = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key");
  const w = new BincodeWriter();
  w.u64(n.chainId);
  w.u64(n.nonce);
  w.rawBytes(uint256Le(n.maxPriorityFeePerGas, "maxPriorityFeePerGas"));
  w.rawBytes(uint256Le(n.maxFeePerGas, "maxFeePerGas"));
  w.u64(n.gasLimit);
  w.optionBytes(n.to);
  w.rawBytes(uint256Le(n.value, "value"));
  w.bytes(n.input);
  w.u64(0n); // access_list length
  w.u64(BigInt(n.extensions.length));
  for (const ext of n.extensions) bincodeTypedExtensionInto(w, ext);
  bincodeMlDsa65OpaqueInto(w, sig);
  bincodeMlDsa65OpaqueInto(w, pk);
  return w.toBytes();
}

interface NormalizedNativeTxExtension {
  kind: number;
  body: Uint8Array;
}

interface NormalizedNativeEvmTxFields {
  chainId: bigint;
  nonce: bigint;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  gasLimit: bigint;
  to: Uint8Array | null;
  value: bigint;
  input: Uint8Array;
  extensions: NormalizedNativeTxExtension[];
}

function normalizeTxFields(fields: NativeEvmTxFields): NormalizedNativeEvmTxFields {
  return {
    chainId: parseBigint(fields.chainId, "chainId"),
    nonce: parseBigint(fields.nonce, "nonce"),
    maxPriorityFeePerGas: parseBigint(fields.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    maxFeePerGas: parseBigint(fields.maxFeePerGas, "maxFeePerGas"),
    gasLimit: parseBigint(fields.gasLimit, "gasLimit"),
    to: normalizeTo(fields.to),
    value: parseBigint(fields.value, "value"),
    input: normalizeBytes(fields.input ?? new Uint8Array(0), "input"),
    extensions: normalizeExtensions(fields.extensions),
  };
}

function normalizeTo(value: NativeEvmTxFields["to"]): Uint8Array | null {
  if (value === null) return null;
  const bytes = normalizeBytes(value, "to");
  return expectBytes(bytes, 20, "to");
}

function normalizeBytes(value: Uint8Array | readonly number[] | string, label: string): Uint8Array {
  if (typeof value === "string") return hexToBytes(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function normalizeExtensions(value: NativeEvmTxFields["extensions"]): NormalizedNativeTxExtension[] {
  if (value === undefined) return [];
  return value.map((ext, index) => {
    if (!Number.isInteger(ext.kind) || ext.kind < 0 || ext.kind > 0xff) {
      throw new Error(`extensions[${index}].kind out of u8 range`);
    }
    const body = normalizeBytes("bodyHex" in ext ? ext.bodyHex : ext.body, `extensions[${index}].body`);
    if (body.length > 0xffff_ffff) {
      throw new Error(`extensions[${index}].body exceeds u32 length`);
    }
    return { kind: ext.kind, body };
  });
}

function encodeExtensionsForHash(extensions: readonly NormalizedNativeTxExtension[]): Uint8Array {
  const chunks: Uint8Array[] = [bigintToBeBytes(BigInt(extensions.length), 4, "extensions.length")];
  for (const ext of extensions) {
    chunks.push(
      Uint8Array.of(ext.kind),
      bigintToBeBytes(BigInt(ext.body.length), 4, "extension.body.length"),
      ext.body,
    );
  }
  return concatBytes(...chunks);
}

function uint256Le(value: bigint, label: string): Uint8Array {
  if (value < 0n || value >= 1n << 256n) throw new Error(`${label} out of u256 range`);
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function bincodeMlDsa65OpaqueInto(w: BincodeWriter, raw: Uint8Array): void {
  w.enumVariant(ENUM_VARIANT_INDEX_ML_DSA_65);
  w.u16(STANDARD_ALGO_NUMBER_ML_DSA_65);
  w.bytes(raw);
}

function bincodeTypedExtensionInto(w: BincodeWriter, ext: NormalizedNativeTxExtension): void {
  w.u8(ext.kind);
  w.bytes(ext.body);
}
