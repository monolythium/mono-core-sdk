/**
 * Client-side scheme-3 LythiumSeal seal path for the wallet/SDK.
 *
 * `getClusterSealKeys` reads the cluster seal roster (per-operator ML-KEM-768
 * encapsulation keys + `(t, n)` + roster hash + epoch). `sealTransaction`
 * turns a signed inner transaction into the scheme-3 `LythiumSealEnvelope`,
 * wraps it in an `EncryptedEnvelope` with the outer ML-DSA-65 signature, and
 * yields the wire bytes mono-core's `lyth_submitEncrypted` accepts.
 *
 * Byte-compatibility with the chain is proven by the cross-language KAT in
 * `tests/lythiumseal-kat.test.ts`.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { RpcClient } from "../client.js";
import { bytesToHex, expectBytes, hexToBytes } from "./bytes.js";
import {
  bincodeEncryptedEnvelope,
  outerSigDigest,
  MempoolClass,
  type DecryptHint,
  type EncryptedEnvelope,
  type NonceAad,
} from "./envelope.js";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
} from "./ml-dsa.js";
import {
  CLUSTER_MLKEM_SHAMIR,
  encodeSealEnvelope,
  SEAL_EK_LEN,
  sealRosterHash,
  sealToCluster,
  type SealRandomSource,
} from "./lythiumseal.js";

/** Algorithm tag the node serves for the scheme-3 seal path. */
export const CLUSTER_MLKEM_SHAMIR_ALGO = "cluster-mlkem768-shamir";

/**
 * The cluster seal roster the SDK seals a transaction body to.
 *
 * Built from the `lyth_getClusterSealKeys(clusterId)` RPC response (or read
 * from genesis when that RPC is disabled on the public profile): the ordered
 * per-operator ML-KEM-768 encapsulation keys + the `(t, n)` threshold + the
 * roster hash + the epoch.
 */
export interface ClusterSealKeys {
  algo: string;
  clusterId: number;
  epoch: bigint;
  /** 32-byte roster hash the seal context binds. */
  rosterHash: Uint8Array;
  /** Reconstruction threshold `t`. */
  t: number;
  /** Total operators `n`. */
  n: number;
  /** Per-operator 1184-byte ML-KEM-768 encapsulation keys, ordered `1..=n`. */
  recipientEks: Uint8Array[];
}

/** One operator's entry in a roster source (RPC JSON or genesis). */
export interface ClusterSealKeyEntryInput {
  operatorIndex: number;
  /** `0x`-hex of the operator's 1184-byte ML-KEM-768 encapsulation key. */
  mlKemEk: string;
}

/** A cluster seal roster as served by the RPC or read from genesis. */
export interface ClusterSealKeysSource {
  algo?: string;
  clusterId: number;
  epoch: number | string | bigint;
  /** `0x`-hex of the 32-byte roster hash (optional; recomputed + verified). */
  rosterHash?: string;
  t: number;
  n: number;
  roster: ClusterSealKeyEntryInput[];
}

/**
 * Normalize a roster source into the typed {@link ClusterSealKeys} the SDK
 * seals against. The roster hash is RECOMPUTED from the ordered ek set via
 * the canonical `seal_roster_hash` and, when the source carries one, the
 * recomputed value must match - so a wallet can never seal under a roster
 * hash that does not commit to the exact recipient set it is sealing to.
 *
 * @throws if the roster is empty, an ek has the wrong length, the operator
 *   indices are not the contiguous `1..=n` order, the threshold is out of
 *   `2 <= t <= n`, or a supplied roster hash does not match the recomputed one.
 */
export function parseClusterSealKeys(source: ClusterSealKeysSource): ClusterSealKeys {
  const n = source.roster.length;
  if (n === 0) {
    throw new Error("cluster seal roster is empty");
  }
  if (source.n !== n) {
    throw new Error(`cluster seal roster n=${source.n} disagrees with ${n} entries`);
  }
  if (!Number.isInteger(source.t) || source.t < 2 || source.t > n) {
    throw new Error(`cluster seal threshold t=${source.t} out of range 2..=${n}`);
  }
  // Sort by operator index so the roster-hash input is canonical, then
  // require the indices to be exactly the contiguous 1..=n set.
  const sorted = [...source.roster].sort((a, b) => a.operatorIndex - b.operatorIndex);
  const recipientEks: Uint8Array[] = [];
  const hashInput: { operatorIndex: number; ek: Uint8Array }[] = [];
  for (let i = 0; i < n; i++) {
    const entry = sorted[i]!;
    if (entry.operatorIndex !== i + 1) {
      throw new Error(
        `cluster seal roster operator indices must be 1..=${n}; got ${entry.operatorIndex} at slot ${i + 1}`,
      );
    }
    const ek = expectBytes(hexToBytes(entry.mlKemEk, `operator ${entry.operatorIndex} mlKemEk`), SEAL_EK_LEN, `operator ${entry.operatorIndex} ek`);
    recipientEks.push(ek);
    hashInput.push({ operatorIndex: entry.operatorIndex, ek });
  }
  const recomputed = sealRosterHash(keccak256, source.clusterId, source.t, n, hashInput);
  if (source.rosterHash !== undefined) {
    const supplied = expectBytes(hexToBytes(source.rosterHash, "rosterHash"), 32, "rosterHash");
    if (!bytesEqual(supplied, recomputed)) {
      throw new Error(
        `cluster seal roster hash mismatch: source ${bytesToHex(supplied)} != recomputed ${bytesToHex(recomputed)} (the roster hash does not commit to this ek set)`,
      );
    }
  }
  return {
    algo: source.algo ?? CLUSTER_MLKEM_SHAMIR_ALGO,
    clusterId: source.clusterId,
    epoch: toBigInt(source.epoch),
    rosterHash: recomputed,
    t: source.t,
    n,
    recipientEks,
  };
}

/**
 * Fetch the cluster seal roster from a running node via
 * `lyth_getClusterSealKeys(clusterId)`.
 *
 * NOTE: this RPC is DISABLED on the public node profile. When it returns
 * "method not found" / "unavailable", read the roster from genesis instead
 * and pass it through {@link parseClusterSealKeys} - the roster lives in the
 * genesis `[[clusters.members]]` `seal_ek` fields, which is exactly what the
 * RPC would otherwise serve.
 *
 * @throws if the RPC is unavailable (carry the roster as input instead) or
 *   the served roster does not validate.
 */
export async function getClusterSealKeys(client: RpcClient, clusterId = 0): Promise<ClusterSealKeys> {
  const result = await client.call<ClusterSealKeysSource & { clusterId?: number }>(
    "lyth_getClusterSealKeys",
    [clusterId],
  );
  return parseClusterSealKeys({ ...result, clusterId: result.clusterId ?? clusterId });
}

/** A built scheme-3 encrypted submission, ready for `lyth_submitEncrypted`. */
export interface SealedSubmission {
  /** Bincode `EncryptedEnvelope` wire bytes, `0x`-prefixed hex. */
  envelopeWireHex: string;
  /** Bincode `EncryptedEnvelope` wire bytes. */
  envelopeWireBytes: Uint8Array;
  /** Length of the inner scheme-3 ciphertext body in bytes. */
  ciphertextBytes: number;
}

/**
 * Seal a signed inner transaction to the cluster and wrap it in an
 * `EncryptedEnvelope` with the outer ML-DSA-65 signature.
 *
 * `signedTxBincode` is the bincode `SignedTransaction` wire bytes (the body
 * `mesh_submitTx` would otherwise carry in the clear). `aad` is the
 * authenticated envelope header; per Law §3.6 / R3-H08 its fee fields MUST
 * mirror the inner tx's fee fields exactly, so the chain's `verify_inner_match`
 * passes on reveal - the caller is responsible for building it from the same
 * fields it signed.
 *
 * The outer signature is taken over the canonical preimage
 * `keccak256(bincode(aad) || ciphertext || bincode(hint) || sender_pubkey)`,
 * identical to mono-core's `EncryptedEnvelope::signed_digest`.
 *
 * @param rng deterministic source for the KAT; defaults to a CSPRNG.
 */
export async function sealTransaction(args: {
  signedTxBincode: Uint8Array;
  clusterSealKeys: ClusterSealKeys;
  aad: NonceAad;
  senderAddress: Uint8Array;
  senderPubkey: Uint8Array;
  signOuterDigest: (digest: Uint8Array) => Promise<Uint8Array> | Uint8Array;
  rng?: SealRandomSource;
}): Promise<SealedSubmission> {
  const keys = args.clusterSealKeys;
  const senderPubkey = expectBytes(args.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey");
  const senderAddress = expectBytes(args.senderAddress, 20, "senderAddress");

  const env = sealToCluster({
    plaintext: args.signedTxBincode,
    recipientEks: keys.recipientEks,
    t: keys.t,
    clusterId: keys.clusterId,
    epoch: keys.epoch,
    rosterHash: keys.rosterHash,
    rng: args.rng,
  });
  const ciphertext = encodeSealEnvelope(env);

  const decryptionHint: DecryptHint = { epoch: keys.epoch, scheme: CLUSTER_MLKEM_SHAMIR };
  const digest = outerSigDigest(args.aad, ciphertext, decryptionHint, senderPubkey);
  const outerSignature = expectBytes(
    await args.signOuterDigest(digest),
    ML_DSA_65_SIGNATURE_LEN,
    "outerSignature",
  );

  const envelope: EncryptedEnvelope = {
    nonceAad: args.aad,
    ciphertext,
    decryptionHint,
    senderPubkey,
    outerSignature,
    sender: senderAddress,
  };
  const envelopeWireBytes = bincodeEncryptedEnvelope(envelope);
  return {
    envelopeWireHex: `0x${bytesToHex(envelopeWireBytes).slice(2)}`,
    envelopeWireBytes,
    ciphertextBytes: ciphertext.length,
  };
}

/**
 * Submit a built scheme-3 encrypted envelope through `lyth_submitEncrypted`.
 *
 * @returns the mempool tx hash the node assigns on admission.
 */
export async function submitSealedTransaction(
  client: RpcClient,
  submission: SealedSubmission,
): Promise<string> {
  return client.call<string>("lyth_submitEncrypted", [submission.envelopeWireHex]);
}

/** Re-export so callers can build the AAD with the right class enum. */
export { MempoolClass };

function keccak256(input: Uint8Array): Uint8Array {
  return keccak_256(input);
}

function toBigInt(value: number | string | bigint): bigint {
  if (typeof value === "bigint") return value;
  return BigInt(value);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
