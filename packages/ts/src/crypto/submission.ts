import { bytesToHex, hexToBytes, parseBigint } from "./bytes.js";
import { MempoolClass, type NonceAad } from "./envelope.js";
import type { MlDsa65Backend } from "./ml-dsa.js";
import {
  parseClusterSealKeys,
  sealTransaction,
  type ClusterSealKeys,
  type ClusterSealKeysSource,
} from "./seal.js";
import type { NativeEvmTxFields } from "./tx.js";

export interface JsonRpcCallClient {
  call<T>(method: string, params?: unknown): Promise<T>;
}

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

export async function fetchEncryptionKey(client: JsonRpcCallClient): Promise<EncryptionKey> {
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
 * Scheme-3 encrypted submission needs a cluster seal roster. Public node
 * profiles may keep `lyth_getClusterSealKeys` disabled, in which case callers
 * should pass a roster source from the pinned genesis/chain registry.
 */
export const ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE =
  "private submission requires cluster seal keys; pass clusterSealKeysSource or enable lyth_getClusterSealKeys";

/**
 * Build a scheme-3 LythiumSeal encrypted-mempool submission.
 *
 * The caller may pass already parsed cluster keys, a JSON roster source, or
 * allow the SDK to fetch `lyth_getClusterSealKeys(clusterId)`. The single-key
 * envelope path stays retired; this function only emits the threshold
 * cluster-sealed envelope accepted by `lyth_submitEncrypted`.
 */
export async function buildEncryptedSubmission(args: {
  client?: JsonRpcCallClient;
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
  encryptionKey?: EncryptionKey;
  clusterId?: number;
  clusterSealKeys?: ClusterSealKeys;
  clusterSealKeysSource?: ClusterSealKeysSource;
  class?: MempoolClass;
}): Promise<EncryptedSubmission> {
  const signed = args.backend.signEvmTx(args.tx);
  const clusterSealKeys = await resolveClusterSealKeys(args);
  const aad = nonceAadForTx(args.tx, args.backend.addressBytes(), args.class);
  const sealed = await sealTransaction({
    signedTxBincode: signed.wireBytes,
    clusterSealKeys,
    aad,
    senderAddress: args.backend.addressBytes(),
    senderPubkey: args.backend.publicKey(),
    signOuterDigest: (digest) => args.backend.signPrehash(digest),
  });
  return {
    envelopeWireHex: sealed.envelopeWireHex,
    innerSighashHex: bytesToHex(signed.sighash),
    innerTxHashHex: bytesToHex(signed.txHash),
    innerWireBytes: signed.wireBytes.length,
  };
}

export async function submitEncryptedEnvelope(
  client: JsonRpcCallClient,
  envelopeWireHex: string,
): Promise<string> {
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
  client: JsonRpcCallClient,
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
 * encryption toggle. `private == false` routes through the plaintext
 * `mesh_submitTx` path; `private == true` routes through the scheme-3
 * LythiumSeal encrypted pipeline.
 *
 * Mirrors `TxClient::build_sign_submit_with_privacy` in the Rust SDK.
 *
 * @returns for the plaintext path, the node-echoed-and-validated canonical
 *   native tx hash (`0x`-prefixed); for the private path, the locally computed
 *   inner native tx hash after the encrypted envelope is admitted.
 */
export async function submitTransactionWithPrivacy(args: {
  client: JsonRpcCallClient;
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
  private: boolean;
  encryptionKey?: EncryptionKey;
  clusterId?: number;
  clusterSealKeys?: ClusterSealKeys;
  clusterSealKeysSource?: ClusterSealKeysSource;
  class?: MempoolClass;
}): Promise<string> {
  if (args.private) {
    const built = await buildEncryptedSubmission({
      client: args.client,
      backend: args.backend,
      tx: args.tx,
      encryptionKey: args.encryptionKey,
      clusterId: args.clusterId,
      clusterSealKeys: args.clusterSealKeys,
      clusterSealKeysSource: args.clusterSealKeysSource,
      class: args.class,
    });
    const returned = await submitEncryptedEnvelope(args.client, built.envelopeWireHex);
    assertRpcHash(returned, "lyth_submitEncrypted tx hash");
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

async function resolveClusterSealKeys(args: {
  client?: JsonRpcCallClient;
  clusterId?: number;
  clusterSealKeys?: ClusterSealKeys;
  clusterSealKeysSource?: ClusterSealKeysSource;
}): Promise<ClusterSealKeys> {
  if (args.clusterSealKeys !== undefined) return args.clusterSealKeys;
  if (args.clusterSealKeysSource !== undefined) {
    return parseClusterSealKeys(args.clusterSealKeysSource);
  }
  if (args.client === undefined) {
    throw new Error(ENCRYPTED_SUBMISSION_UNAVAILABLE_MESSAGE);
  }
  const clusterId = args.clusterId ?? 0;
  const result = await args.client.call<ClusterSealKeysSource & { clusterId?: number }>(
    "lyth_getClusterSealKeys",
    [clusterId],
  );
  return parseClusterSealKeys({ ...result, clusterId: result.clusterId ?? clusterId });
}

function nonceAadForTx(
  tx: NativeEvmTxFields,
  sender: Uint8Array,
  mempoolClass?: MempoolClass,
): NonceAad {
  return {
    sender,
    nonce: parseBigint(tx.nonce, "nonce"),
    chainId: parseBigint(tx.chainId, "chainId"),
    class: mempoolClass ?? inferMempoolClass(tx),
    maxFeePerGas: parseBigint(tx.maxFeePerGas, "maxFeePerGas"),
    maxPriorityFeePerGas: parseBigint(tx.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    gasLimit: parseBigint(tx.gasLimit, "gasLimit"),
  };
}

function inferMempoolClass(tx: NativeEvmTxFields): MempoolClass {
  if (tx.to === null || hasInput(tx.input)) return MempoolClass.ContractCall;
  return MempoolClass.Transfer;
}

function hasInput(input: NativeEvmTxFields["input"]): boolean {
  if (input === undefined) return false;
  if (typeof input === "string") {
    const stripped = input.startsWith("0x") || input.startsWith("0X") ? input.slice(2) : input;
    return stripped.length > 0;
  }
  return input.length > 0;
}

function assertRpcHash(value: string, label: string): void {
  const bytes = hexToBytes(value, label);
  if (bytes.length !== 32) {
    throw new Error(`${label} must be 32 bytes, got ${bytes.length}`);
  }
}
