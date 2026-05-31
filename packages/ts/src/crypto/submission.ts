import { RpcClient } from "../client.js";
import { hexToAddressBytes } from "../address.js";
import { bytesToHex, hexToBytes, parseBigint } from "./bytes.js";
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
  innerTxHashHex: string;
  innerWireBytes: number;
}

/**
 * A built plaintext submission — the bincode-encoded chain-side
 * `SignedTransaction` (`0x`-prefixed hex) ready to hand to
 * `mesh_submitTx`, plus the canonical hashes the wallet validates the
 * node echo against.
 *
 * Mirrors the chain-side artefacts produced by the Rust SDK's
 * `build_chain_signed_tx` (`mono-core/crates/core/sdk/src/tx.rs`): the
 * ML-DSA-65 signature is taken over the canonical chain-side `sighash`
 * (keccak-256 of the 0x01-tagged preimage) and the canonical native tx
 * hash is the keccak-256 of the 0x02-tagged preimage with the signature
 * and public key appended.
 */
export interface PlaintextSubmission {
  /** Bincode `SignedTransaction` wire bytes, `0x`-prefixed. */
  signedTxWireHex: string;
  /** Canonical native tx hash the node echoes on admission. */
  innerTxHashHex: string;
  /** Canonical chain-side sighash that was signed. */
  innerSighashHex: string;
  /** Length in bytes of the bincode `SignedTransaction`. */
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
  const input = normalizeInput(args.tx.input);
  const to = normalizeTo(args.tx.to);
  const nonceAad: NonceAad = {
    sender: args.backend.addressBytes(),
    nonce: parseBigint(args.tx.nonce, "nonce"),
    chainId: parseBigint(args.tx.chainId, "chainId"),
    class: args.class ?? (to !== null && input.length === 0 ? MempoolClass.Transfer : MempoolClass.ContractCall),
    maxFeePerGas: u128Checked(parseBigint(args.tx.maxFeePerGas, "maxFeePerGas"), "maxFeePerGas"),
    maxPriorityFeePerGas: u128Checked(
      parseBigint(args.tx.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
      "maxPriorityFeePerGas",
    ),
    gasLimit: parseBigint(args.tx.gasLimit, "gasLimit"),
  };
  const signed = args.backend.signEvmTx(args.tx);
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
    innerTxHashHex: bytesToHex(signed.txHash),
    innerWireBytes: signed.wireBytes.length,
  };
}

export async function submitEncryptedEnvelope(client: RpcClient, envelopeWireHex: string): Promise<string> {
  return client.call("lyth_submitEncrypted", [envelopeWireHex]);
}

/**
 * Build a PLAINTEXT submission — the opt-OUT-of-privacy counterpart to
 * {@link buildEncryptedSubmission}.
 *
 * Unlike the encrypted path, this never engages the Ferveo
 * threshold-decrypt pipeline. It re-shapes the native tx into the
 * chain-side `SignedTransaction`, signs over the canonical `sighash`
 * with the ML-DSA-65 backend, bincode-serializes the result, and
 * `0x`-hex-encodes it. The bytes are forwarded verbatim through
 * `mesh_submitTx` (the node routes them to `MempoolTx::plaintext` via
 * `submit_raw`) — the functional inclusion path on a chain running with
 * `encrypted_mempool_required = false`.
 *
 * Mirrors `TxClient::submit_plaintext` in the Rust SDK.
 */
export function buildPlaintextSubmission(args: {
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
}): PlaintextSubmission {
  const signed = args.backend.signEvmTx(args.tx);
  return {
    signedTxWireHex: `0x${signed.wireHex}`,
    innerTxHashHex: bytesToHex(signed.txHash),
    innerSighashHex: bytesToHex(signed.sighash),
    innerWireBytes: signed.wireBytes.length,
  };
}

/**
 * Submit a bincode-encoded chain-side `SignedTransaction` (`0x`-hex)
 * through the plaintext `mesh_submitTx` path and validate the node's
 * echoed canonical tx hash against the locally computed one.
 *
 * Mirrors the validation in `TxClient::submit_plaintext`: the node
 * echoes the 32-byte canonical native tx hash on admission, and any
 * mismatch (or non-32-byte response) is rejected loud so a wallet never
 * trusts a hash it did not derive itself.
 *
 * @returns the validated canonical native tx hash (`0x`-prefixed).
 */
export async function submitPlaintextTransaction(
  client: RpcClient,
  signedTxWireHex: string,
  expectedTxHashHex: string,
): Promise<string> {
  const returned = await client.call<string>("mesh_submitTx", [signedTxWireHex]);
  const returnedBytes = hexToBytes(returned, "mesh_submitTx tx hash");
  if (returnedBytes.length !== 32) {
    throw new Error(
      `mesh_submitTx tx hash must be 32 bytes, got ${returnedBytes.length}`,
    );
  }
  const expectedBytes = hexToBytes(expectedTxHashHex, "expected tx hash");
  if (!bytesEqual(returnedBytes, expectedBytes)) {
    throw new Error(
      `mesh_submitTx returned tx hash ${bytesToHex(returnedBytes)} but the locally computed canonical hash is ${bytesToHex(expectedBytes)}`,
    );
  }
  return bytesToHex(returnedBytes);
}

/**
 * Build, sign, and submit a native transaction with an explicit
 * encryption toggle. `private == false` (the default for the RC testnet
 * / operator posture) routes through the plaintext `mesh_submitTx`
 * path; `private == true` routes through the Ferveo encrypt-then-submit
 * pipeline. Wallets wire a UI privacy toggle straight onto `private`.
 *
 * Mirrors `TxClient::build_sign_submit_with_privacy` in the Rust SDK.
 * The default is PLAINTEXT; the encrypted path is engaged only when
 * `private === true`, and requires an {@link EncryptionKey} (fetch it
 * via {@link fetchEncryptionKey}).
 *
 * @returns the canonical native tx hash (`0x`-prefixed). For the
 *   plaintext path this is the node-echoed-and-validated hash; for the
 *   encrypted path it is the locally computed inner tx hash (the
 *   `lyth_submitEncrypted` RPC returns the encrypted-envelope admission
 *   hash, so wallets track the canonical inner hash for receipts /
 *   `lyth_txStatus` / indexer history).
 */
export async function submitTransactionWithPrivacy(args: {
  client: RpcClient;
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
  private: boolean;
  encryptionKey?: EncryptionKey;
  class?: MempoolClass;
}): Promise<string> {
  if (args.private) {
    if (args.encryptionKey === undefined) {
      throw new Error(
        "private submission requires an encryptionKey; fetch it via fetchEncryptionKey()",
      );
    }
    const built = await buildEncryptedSubmission({
      backend: args.backend,
      tx: args.tx,
      encryptionKey: args.encryptionKey,
      class: args.class,
    });
    await submitEncryptedEnvelope(args.client, built.envelopeWireHex);
    return built.innerTxHashHex;
  }
  const plaintext = buildPlaintextSubmission({ backend: args.backend, tx: args.tx });
  return submitPlaintextTransaction(
    args.client,
    plaintext.signedTxWireHex,
    plaintext.innerTxHashHex,
  );
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function u128Checked(value: bigint, field: string): bigint {
  const cap = (1n << 128n) - 1n;
  if (value < 0n || value > cap) {
    throw new Error(`${field} must fit in u128 for encrypted nonce AAD`);
  }
  return value;
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
