import { RpcClient } from "../client.js";
import { hexToAddressBytes } from "../address.js";
import { hexToBytes, parseBigint } from "./bytes.js";
import { buildEncryptedEnvelope, MempoolClass, type DecryptHint, type NonceAad } from "./envelope.js";
import type { MlDsa65Backend } from "./ml-dsa.js";
import type { NativeEvmTxFields } from "./tx.js";

export interface EncryptionKey {
  algo: string;
  epoch: bigint;
  encapsulationKey: Uint8Array;
}

export interface EncryptedSubmission {
  envelopeWireHex: string;
  innerSighashHex: string;
  innerWireBytes: number;
}

export async function fetchEncryptionKey(client: RpcClient): Promise<EncryptionKey> {
  const result = await client.call<{ algo?: string; epoch: number | string; encapsulationKey: string }>(
    "lyth_getEncryptionKey",
    [],
  );
  return {
    algo: result.algo ?? "ml-kem-768",
    epoch: typeof result.epoch === "string" ? BigInt(result.epoch) : BigInt(result.epoch),
    encapsulationKey: hexToBytes(result.encapsulationKey, "encapsulationKey"),
  };
}

export async function buildEncryptedSubmission(args: {
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
  encryptionKey: EncryptionKey;
  class?: MempoolClass;
}): Promise<EncryptedSubmission> {
  const signed = args.backend.signEvmTx(args.tx);
  const input = normalizeInput(args.tx.input);
  const to = normalizeTo(args.tx.to);
  const nonceAad: NonceAad = {
    sender: args.backend.addressBytes(),
    nonce: parseBigint(args.tx.nonce, "nonce"),
    chainId: parseBigint(args.tx.chainId, "chainId"),
    class: args.class ?? (to !== null && input.length === 0 ? MempoolClass.Transfer : MempoolClass.ContractCall),
    maxFeePerGas: u128Saturate(parseBigint(args.tx.maxFeePerGas, "maxFeePerGas")),
    maxPriorityFeePerGas: u128Saturate(parseBigint(args.tx.maxPriorityFeePerGas, "maxPriorityFeePerGas")),
    gasLimit: parseBigint(args.tx.gasLimit, "gasLimit"),
  };
  const decryptionHint: DecryptHint = { epoch: args.encryptionKey.epoch, scheme: 0 };
  const built = await buildEncryptedEnvelope({
    signedInnerTxBincode: signed.wireBytes,
    nonceAad,
    decryptionHint,
    kemEncapsulationKey: args.encryptionKey.encapsulationKey,
    senderAddress: args.backend.addressBytes(),
    senderPubkey: args.backend.publicKey(),
    signOuterDigest: (digest) => args.backend.signPrehash(digest),
  });
  return {
    envelopeWireHex: built.wireHex,
    innerSighashHex: `0x${[...signed.sighash].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
    innerWireBytes: signed.wireBytes.length,
  };
}

export async function submitEncryptedEnvelope(client: RpcClient, envelopeWireHex: string): Promise<string> {
  return client.call("lyth_submitEncrypted", [envelopeWireHex]);
}

function u128Saturate(value: bigint): bigint {
  const cap = (1n << 128n) - 1n;
  if (value < 0n) return 0n;
  return value > cap ? cap : value;
}

function normalizeTo(value: NativeEvmTxFields["to"]): Uint8Array | null {
  if (value === null) return null;
  if (typeof value === "string") return hexToAddressBytes(value);
  const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value);
  if (bytes.length !== 20) throw new Error("to must be 20 bytes");
  return bytes;
}

function normalizeInput(value: NativeEvmTxFields["input"]): Uint8Array {
  if (value === undefined) return new Uint8Array(0);
  if (typeof value === "string") return hexToBytes(value, "input");
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
