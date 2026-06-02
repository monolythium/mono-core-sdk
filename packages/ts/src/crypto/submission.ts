import { RpcClient } from "../client.js";
import { bytesToHex, hexToBytes } from "./bytes.js";
import { MempoolClass } from "./envelope.js";
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

/**
 * Error message returned when an encrypted-mempool submission is attempted.
 *
 * The encrypted-submit path is gated OFF until the chain's MB-3 Ferveo
 * threshold decryption is live (see {@link buildEncryptedSubmission}).
 */
export const ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE =
  "encrypted mempool submission unavailable until MB-3 threshold decryption is active";

/**
 * Encrypted-mempool submission is GATED OFF.
 *
 * The single-key ML-KEM-768 `scheme: 0` envelope this used to build is the
 * RETIRED scheme: a single operator holding the cluster decryption key could
 * decrypt the inner transaction, violating the threshold-privacy guarantee
 * the encrypted mempool promises. The live chain runs with plaintext
 * submission as the default and does NOT run threshold decryption yet, so
 * there is no safe encrypted path to emit.
 *
 * This helper therefore refuses to build any envelope and throws. It never
 * produces a `scheme: 0` (or any) envelope, so a wallet can never be tricked
 * into believing its transaction is privately decryptable by a threshold of
 * operators when it is in fact decryptable by one.
 *
 * Use {@link buildPlaintextSubmission} / {@link submitPlaintextTransaction}
 * (the unaffected default path) for transaction submission.
 *
 * TODO(MB-3): when the chain activates MB-3 threshold decryption, port the
 * chain's Ferveo `scheme = 2` path here — the `ThresholdPubkey` is a 96-byte
 * BLS12-381 G1 element fetched from `lyth_getEncryptionKey`, and the inner tx
 * is encrypted to that threshold public key (not a single ML-KEM-768
 * encapsulation key). Only then may an envelope be emitted again.
 *
 * @throws always — the encrypted path is unavailable.
 */
export async function buildEncryptedSubmission(_args: {
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
  encryptionKey: EncryptionKey;
  class?: MempoolClass;
}): Promise<EncryptedSubmission> {
  await Promise.resolve();
  throw new Error(ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE);
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
 * path; `private == true` routes through the encrypted pipeline.
 * Wallets wire a UI privacy toggle straight onto `private`.
 *
 * Mirrors `TxClient::build_sign_submit_with_privacy` in the Rust SDK.
 * The default is PLAINTEXT and is fully supported.
 *
 * MB-3 gate: `private === true` is currently UNAVAILABLE — the encrypted
 * path throws {@link ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE} via
 * {@link buildEncryptedSubmission} because the chain does not yet run
 * Ferveo threshold decryption and the retired single-key scheme is unsafe.
 * Keep wallet privacy toggles disabled until MB-3 activates.
 *
 * @returns for the plaintext path, the node-echoed-and-validated canonical
 *   native tx hash (`0x`-prefixed).
 * @throws when `private === true` (encrypted submission unavailable).
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
