/**
 * Binary-tree state-proof verification (NOMT / EIP-7864 sparse Merkle).
 *
 * Since the W4-F cutover the node's value-path state commitment is a
 * binary sparse Merkle tree hashed with BLAKE3 (the consensus state hash —
 * NOT keccak, which stays on the EVM-compat receipt surfaces). `eth_getBalance`,
 * `eth_getStorageAt`, and `lyth_registryStateProof` ship the value alongside a
 * binary-native {@link ProofEnvelope} carrying a `proofKind` discriminant plus
 * the sibling path.
 *
 * This module mirrors the Rust verifier in `protocore-state`
 * (`verify_binary_inclusion` / `verify_binary_non_inclusion`) and the SDK's
 * `ProofVerifier` in `crates/sdk`, so a TypeScript caller can trust-minimise a
 * state read against a BLAKE3 `storage_root` / state root without a node.
 *
 * Node-hash discipline (must match `protocore_state::Blake3Hasher` exactly):
 * - value hash  = `BLAKE3(value)`
 * - leaf        = `BLAKE3(0x00 || path32 || valueHash32)`
 * - internal    = `BLAKE3(0x01 || left32 || right32)`, with the empty-subtree
 *   collapse: an internal node whose two children are both the terminator IS
 *   the terminator (`0x00..00`).
 * - terminator (empty subtree) = `[0x00; 32]`.
 * - the leaf key's tree path is `BLAKE3(key)`, walked MSB-first.
 */

import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex, expectBytes, hexToBytes } from "./crypto/bytes.js";

/** Domain tag prefixing a leaf preimage (`protocore_state::TREE_TAG_LEAF`). */
const TREE_TAG_LEAF = 0x00;
/** Domain tag prefixing an internal-node preimage (`TREE_TAG_INTERNAL`). */
const TREE_TAG_INTERNAL = 0x01;
/** Empty-subtree marker (`protocore_state::TREE_TERMINATOR`). */
const TREE_TERMINATOR = new Uint8Array(32);

const HASH_BYTE_LENGTH = 32;

/** The `proofKind` discriminant for the binary sparse-Merkle proof. */
export const PROOF_KIND_BINARY = "binary";

/**
 * Wire shape of a binary-native Merkle inclusion proof attached to a response.
 *
 * Mirrors `protocore_rpc::proof::ProofEnvelope`. `proofKind` is `"binary"`
 * since the W4-F cutover; a future scheme (e.g. a STARK keystone) adds a new
 * value and callers branch on it.
 */
export interface ProofEnvelope {
  /** Proof family discriminant. `"binary"` for the sparse-Merkle scheme. */
  proofKind: string;
  /** Hex sibling hashes from the leaf's depth up to the root, leaf-side first. */
  siblings: string[];
  /** Hex-encoded leaf key. */
  key: string;
  /** Hex-encoded leaf value. */
  value: string;
}

/** The node a target path reaches when walked from the root. */
export type BinaryProofEndpoint =
  | { kind: "found"; valueHash: string }
  | { kind: "terminator" }
  | { kind: "otherLeaf"; path: string; valueHash: string };

/**
 * Wire shape of a binary-native non-inclusion proof.
 *
 * Mirrors `protocore_state::BinaryNonInclusionProof` as emitted by the node's
 * non-inclusion endpoint: the sibling path the target key walks plus the
 * endpoint it reaches (an empty subtree or a different leaf).
 */
export interface NonInclusionProofEnvelope {
  /** Proof family discriminant. `"binary"`. */
  proofKind: string;
  /** The key proved absent (hex). */
  key: string;
  /** Hex sibling hashes from the endpoint's depth up to the root, endpoint-side first. */
  siblings: string[];
  /** The node the key's path reaches (never `found`). */
  endpoint: BinaryProofEndpoint;
}

export type ProofVerifyErrorCode =
  | "unsupported_proof_kind"
  | "invalid_hex"
  | "invalid_hash_length"
  | "proof_verify_failed"
  | "non_inclusion_verify_failed"
  | "state_root_mismatch";

export class ProofVerifyError extends Error {
  constructor(
    public readonly code: ProofVerifyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProofVerifyError";
  }
}

/** BLAKE3-256 over `data` (the value-path state-commitment hash). */
function hashValue(data: Uint8Array): Uint8Array {
  return blake3(data);
}

/** Leaf hash `BLAKE3(0x00 || path || valueHash)`. */
function hashLeaf(path: Uint8Array, valueHash: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = TREE_TAG_LEAF;
  buf.set(path, 1);
  buf.set(valueHash, 33);
  return blake3(buf);
}

/**
 * Internal hash `BLAKE3(0x01 || left || right)` with the empty-subtree
 * collapse: two terminator children collapse back to the terminator.
 */
function compress(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (isTerminator(left) && isTerminator(right)) {
    return TREE_TERMINATOR;
  }
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = TREE_TAG_INTERNAL;
  buf.set(left, 1);
  buf.set(right, 33);
  return blake3(buf);
}

function isTerminator(hash: Uint8Array): boolean {
  for (let i = 0; i < hash.length; i++) {
    if (hash[i] !== 0) return false;
  }
  return true;
}

/** The bit at `depth` of a 32-byte path, MSB-first (`depth` in `0..256`). */
function pathBit(path: Uint8Array, depth: number): number {
  const byte = path[depth >>> 3]!;
  return (byte >>> (7 - (depth & 7))) & 1;
}

/**
 * Fold `current` up through `siblings` (leaf-side first) using `target`'s path
 * bits, returning the implied root. Shared by both verifiers — mirrors
 * `protocore_state::fold_to_root`.
 */
function foldToRoot(target: Uint8Array, current: Uint8Array, siblings: Uint8Array[]): Uint8Array {
  const depth = siblings.length;
  let node = current;
  for (let i = 0; i < depth; i++) {
    const level = depth - 1 - i;
    const sibling = siblings[i]!;
    node = pathBit(target, level) === 0 ? compress(node, sibling) : compress(sibling, node);
  }
  return node;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function decodeHash(value: string, field: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = hexToBytes(value, field);
  } catch (cause) {
    throw new ProofVerifyError("invalid_hex", `${field} is not valid hex: ${String(cause)}`);
  }
  if (bytes.length !== HASH_BYTE_LENGTH) {
    throw new ProofVerifyError(
      "invalid_hash_length",
      `${field} must be ${HASH_BYTE_LENGTH} bytes, got ${bytes.length}`,
    );
  }
  return bytes;
}

function decodeSiblings(siblings: string[]): Uint8Array[] {
  return siblings.map((sib, index) => decodeHash(sib, `siblings[${index}]`));
}

function assertBinaryKind(proofKind: string): void {
  if (proofKind !== PROOF_KIND_BINARY) {
    throw new ProofVerifyError(
      "unsupported_proof_kind",
      `unsupported proofKind: ${proofKind} (expected ${PROOF_KIND_BINARY})`,
    );
  }
}

/**
 * Verify a binary-tree inclusion or non-inclusion proof against a trusted
 * BLAKE3 state / storage root.
 *
 * Stateless — a single instance can be shared. It exists so a future proof
 * family (e.g. a STARK keystone) can slot in behind the same SDK surface.
 * Mirrors `protocore_sdk::proof::ProofVerifier`.
 */
export class ProofVerifier {
  /**
   * Verify a {@link ProofEnvelope} inclusion proof against `stateRoot`.
   *
   * @returns `true` when the proof binds `(key, value)` to `stateRoot`.
   */
  verifyInclusion(stateRoot: string | Uint8Array, proof: ProofEnvelope): boolean {
    assertBinaryKind(proof.proofKind);
    const root = toHashBytes(stateRoot, "stateRoot");
    const key = decodeHex(proof.key, "proof.key");
    const value = decodeHex(proof.value, "proof.value");
    const siblings = decodeSiblings(proof.siblings);

    const target = hashValue(key);
    const leaf = hashLeaf(target, hashValue(value));
    return bytesEqual(foldToRoot(target, leaf, siblings), root);
  }

  /**
   * Verify a {@link ProofEnvelope} inclusion proof, throwing a
   * {@link ProofVerifyError} on failure (the loud variant for wallets).
   */
  assertInclusion(stateRoot: string | Uint8Array, proof: ProofEnvelope): void {
    if (!this.verifyInclusion(stateRoot, proof)) {
      throw new ProofVerifyError(
        "proof_verify_failed",
        `inclusion proof for key ${proof.key} does not verify against the state root`,
      );
    }
  }

  /**
   * Verify a {@link NonInclusionProofEnvelope} against `stateRoot`.
   *
   * Returns `false` for a `found` endpoint (that is an inclusion, not
   * absence) or an `otherLeaf` whose path equals the queried key. Mirrors
   * `protocore_state::verify_binary_non_inclusion`.
   */
  verifyNonInclusion(stateRoot: string | Uint8Array, proof: NonInclusionProofEnvelope): boolean {
    assertBinaryKind(proof.proofKind);
    const root = toHashBytes(stateRoot, "stateRoot");
    const key = decodeHex(proof.key, "proof.key");
    const siblings = decodeSiblings(proof.siblings);
    const target = hashValue(key);

    let endpointHash: Uint8Array;
    switch (proof.endpoint.kind) {
      case "found":
        return false;
      case "terminator":
        endpointHash = TREE_TERMINATOR;
        break;
      case "otherLeaf": {
        const path = decodeHash(proof.endpoint.path, "endpoint.path");
        if (bytesEqual(path, target)) return false;
        endpointHash = hashLeaf(path, decodeHash(proof.endpoint.valueHash, "endpoint.valueHash"));
        break;
      }
    }
    return bytesEqual(foldToRoot(target, endpointHash, siblings), root);
  }

  /**
   * Verify a non-inclusion proof, throwing a {@link ProofVerifyError} on
   * failure.
   */
  assertNonInclusion(stateRoot: string | Uint8Array, proof: NonInclusionProofEnvelope): void {
    if (!this.verifyNonInclusion(stateRoot, proof)) {
      throw new ProofVerifyError(
        "non_inclusion_verify_failed",
        `non-inclusion proof for key ${proof.key} does not verify against the state root`,
      );
    }
  }
}

/** A reusable stateless verifier instance. */
export const proofVerifier = new ProofVerifier();

/** Coerce a hex string or 32-byte array into the 32-byte root. */
function toHashBytes(value: string | Uint8Array, field: string): Uint8Array {
  if (typeof value === "string") return decodeHash(value, field);
  return expectBytes(value, HASH_BYTE_LENGTH, field);
}

/** Decode `0x`-prefixed (or bare) hex; mirrors the node's lenient decode. */
function decodeHex(value: string, field: string): Uint8Array {
  try {
    return hexToBytes(value, field);
  } catch (cause) {
    throw new ProofVerifyError("invalid_hex", `${field} is not valid hex: ${String(cause)}`);
  }
}

/**
 * Narrow an opaque `AccountProofResponse.proof` field into a typed binary
 * {@link ProofEnvelope}, returning `null` when absent or not the binary scheme.
 */
export function asBinaryProofEnvelope(proof: unknown): ProofEnvelope | null {
  if (proof == null || typeof proof !== "object") return null;
  const obj = proof as Record<string, unknown>;
  if (obj.proofKind !== PROOF_KIND_BINARY) return null;
  if (
    typeof obj.key !== "string" ||
    typeof obj.value !== "string" ||
    !Array.isArray(obj.siblings) ||
    obj.siblings.some((s) => typeof s !== "string")
  ) {
    return null;
  }
  return {
    proofKind: PROOF_KIND_BINARY,
    siblings: obj.siblings as string[],
    key: obj.key,
    value: obj.value,
  };
}

/** Hex-encode a 32-byte hash with the `0x` prefix (test/helper convenience). */
export function hashToHex(hash: Uint8Array): string {
  return bytesToHex(hash);
}
