/**
 * Binary-tree (NOMT / EIP-7864) state-proof verification tests.
 *
 * These mirror the node-side `protocore_state` BLAKE3 hasher + sparse-Merkle
 * tree. The reference tree is rebuilt here in TypeScript from `(key, value)`
 * pairs so we can produce a `ProofEnvelope` for the SDK verifier to check, and
 * the leaf/internal node hashes are pinned against the node's golden vectors
 * (`crates/execution/state/src/hasher.rs`) to catch any preimage-layout drift.
 */

import { describe, expect, it } from "vitest";
import { blake3 } from "@noble/hashes/blake3.js";
import {
  PROOF_KIND_BINARY,
  ProofVerifier,
  ProofVerifyError,
  asBinaryProofEnvelope,
  type NonInclusionProofEnvelope,
  type ProofEnvelope,
} from "../src/proof.js";
import { bytesToHex } from "../src/crypto/index.js";

const TERMINATOR = new Uint8Array(32);

function hashValue(data: Uint8Array): Uint8Array {
  return blake3(data);
}
function hashLeaf(path: Uint8Array, valueHash: Uint8Array): Uint8Array {
  const buf = new Uint8Array(65);
  buf[0] = 0x00;
  buf.set(path, 1);
  buf.set(valueHash, 33);
  return blake3(buf);
}
function compress(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (isZero(left) && isZero(right)) return TERMINATOR;
  const buf = new Uint8Array(65);
  buf[0] = 0x01;
  buf.set(left, 1);
  buf.set(right, 33);
  return blake3(buf);
}
function isZero(h: Uint8Array): boolean {
  return h.every((b) => b === 0);
}
function pathBit(path: Uint8Array, depth: number): number {
  return (path[depth >>> 3]! >>> (7 - (depth & 7))) & 1;
}

/** A minimal reference binary trie over `path -> valueHash`, sorted by path. */
class RefTrie {
  private leaves = new Map<string, { path: Uint8Array; valueHash: Uint8Array }>();

  insert(key: Uint8Array, value: Uint8Array): void {
    const path = hashValue(key);
    this.leaves.set(bytesToHex(path), { path, valueHash: hashValue(value) });
  }

  private sorted(): { path: Uint8Array; valueHash: Uint8Array }[] {
    return [...this.leaves.values()].sort((a, b) => bytesToHex(a.path).localeCompare(bytesToHex(b.path)));
  }

  private subtreeRoot(leaves: { path: Uint8Array; valueHash: Uint8Array }[], depth: number): Uint8Array {
    if (leaves.length === 0) return TERMINATOR;
    if (leaves.length === 1) return hashLeaf(leaves[0]!.path, leaves[0]!.valueHash);
    const left = leaves.filter((l) => pathBit(l.path, depth) === 0);
    const right = leaves.filter((l) => pathBit(l.path, depth) === 1);
    return compress(this.subtreeRoot(left, depth + 1), this.subtreeRoot(right, depth + 1));
  }

  root(): Uint8Array {
    return this.subtreeRoot(this.sorted(), 0);
  }

  /** Build the leaf-side-first sibling path for `target` (descend recursion). */
  private descend(
    leaves: { path: Uint8Array; valueHash: Uint8Array }[],
    depth: number,
    target: Uint8Array,
    siblings: Uint8Array[],
  ): void {
    if (leaves.length <= 1) return;
    const left = leaves.filter((l) => pathBit(l.path, depth) === 0);
    const right = leaves.filter((l) => pathBit(l.path, depth) === 1);
    const onTargetLeft = pathBit(target, depth) === 0;
    const onPath = onTargetLeft ? left : right;
    const sibling = onTargetLeft ? right : left;
    this.descend(onPath, depth + 1, target, siblings);
    siblings.push(this.subtreeRoot(sibling, depth + 1));
  }

  proveInclusion(key: Uint8Array, value: Uint8Array): ProofEnvelope {
    const target = hashValue(key);
    const siblings: Uint8Array[] = [];
    this.descend(this.sorted(), 0, target, siblings);
    return {
      proofKind: PROOF_KIND_BINARY,
      key: bytesToHex(key),
      value: bytesToHex(value),
      siblings: siblings.map((s) => bytesToHex(s)),
    };
  }

  proveNonInclusion(key: Uint8Array): NonInclusionProofEnvelope {
    const target = hashValue(key);
    const siblings: Uint8Array[] = [];
    const sorted = this.sorted();
    this.descend(sorted, 0, target, siblings);
    // Determine the endpoint the target path reaches.
    let endpoint: NonInclusionProofEnvelope["endpoint"];
    const onPath = endpointLeaf(sorted, 0, target);
    if (onPath === null) {
      endpoint = { kind: "terminator" };
    } else {
      endpoint = {
        kind: "otherLeaf",
        path: bytesToHex(onPath.path),
        valueHash: bytesToHex(onPath.valueHash),
      };
    }
    return {
      proofKind: PROOF_KIND_BINARY,
      key: bytesToHex(key),
      siblings: siblings.map((s) => bytesToHex(s)),
      endpoint,
    };
  }
}

/** The single leaf (if any) sharing the target's path prefix at the endpoint. */
function endpointLeaf(
  leaves: { path: Uint8Array; valueHash: Uint8Array }[],
  depth: number,
  target: Uint8Array,
): { path: Uint8Array; valueHash: Uint8Array } | null {
  if (leaves.length === 0) return null;
  if (leaves.length === 1) return leaves[0]!;
  const next = leaves.filter((l) => pathBit(l.path, depth) === pathBit(target, depth));
  return endpointLeaf(next, depth + 1, target);
}

function repeat(byte: number): Uint8Array {
  return new Uint8Array(32).fill(byte);
}

describe("binary state-proof node hashes (golden vectors)", () => {
  it("matches the node's golden leaf hash", () => {
    expect(bytesToHex(hashLeaf(repeat(0xaa), repeat(0xbb)))).toBe(
      "0xd7a46b3a6443bf61bcbc9ebf67197c335dc5b2b9156fcda49932091608aab79e",
    );
  });

  it("matches the node's golden internal hash", () => {
    expect(bytesToHex(compress(repeat(0xaa), repeat(0xbb)))).toBe(
      "0x2f1b74ae700f9a1e25d3d85121175794c61ee2160d05efa16f0b85ebf09c3e5d",
    );
  });

  it("collapses two terminator children to the terminator", () => {
    expect(bytesToHex(compress(TERMINATOR, TERMINATOR))).toBe(bytesToHex(TERMINATOR));
  });
});

describe("ProofVerifier inclusion", () => {
  const v = new ProofVerifier();

  it("verifies a known inclusion proof against the BLAKE3 state root", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    trie.insert(new TextEncoder().encode("bob"), new TextEncoder().encode("50"));
    trie.insert(new TextEncoder().encode("carol"), new TextEncoder().encode("7"));
    const root = bytesToHex(trie.root());
    const proof = trie.proveInclusion(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));

    expect(v.verifyInclusion(root, proof)).toBe(true);
    expect(() => v.assertInclusion(root, proof)).not.toThrow();
  });

  it("verifies a single-leaf tree (root is the leaf hash, empty sibling path)", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("solo"), new TextEncoder().encode("1"));
    const proof = trie.proveInclusion(new TextEncoder().encode("solo"), new TextEncoder().encode("1"));
    expect(proof.siblings).toHaveLength(0);
    expect(v.verifyInclusion(bytesToHex(trie.root()), proof)).toBe(true);
  });

  it("rejects a tampered value", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    trie.insert(new TextEncoder().encode("bob"), new TextEncoder().encode("50"));
    const root = bytesToHex(trie.root());
    const proof = trie.proveInclusion(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    proof.value = bytesToHex(new TextEncoder().encode("999"));

    expect(v.verifyInclusion(root, proof)).toBe(false);
    expect(() => v.assertInclusion(root, proof)).toThrow(ProofVerifyError);
  });

  it("rejects the wrong root", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    const proof = trie.proveInclusion(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    expect(v.verifyInclusion(`0x${"00".repeat(32)}`, proof)).toBe(false);
  });

  it("rejects a non-binary proofKind", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    const proof = trie.proveInclusion(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    expect(() => v.verifyInclusion(bytesToHex(trie.root()), { ...proof, proofKind: "verkle" })).toThrow(
      /unsupported proofKind/,
    );
  });
});

describe("ProofVerifier non-inclusion", () => {
  const v = new ProofVerifier();

  it("verifies absence against a tree of other leaves (otherLeaf endpoint)", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    trie.insert(new TextEncoder().encode("bob"), new TextEncoder().encode("50"));
    const root = bytesToHex(trie.root());
    const proof = trie.proveNonInclusion(new TextEncoder().encode("zoe-not-present"));
    expect(v.verifyNonInclusion(root, proof)).toBe(true);
    expect(() => v.assertNonInclusion(root, proof)).not.toThrow();
  });

  it("verifies absence against the empty tree (terminator endpoint)", () => {
    const trie = new RefTrie();
    const proof = trie.proveNonInclusion(new TextEncoder().encode("anything"));
    expect(proof.endpoint.kind).toBe("terminator");
    expect(v.verifyNonInclusion(bytesToHex(trie.root()), proof)).toBe(true);
  });

  it("rejects a forged absence proof for a key that is actually present", () => {
    const trie = new RefTrie();
    trie.insert(new TextEncoder().encode("alice"), new TextEncoder().encode("100"));
    trie.insert(new TextEncoder().encode("bob"), new TextEncoder().encode("50"));
    const root = bytesToHex(trie.root());
    // Build a non-inclusion proof shaped for "alice" — the endpoint leaf's path
    // equals the target, so the verifier must reject it.
    const proof = trie.proveNonInclusion(new TextEncoder().encode("alice"));
    expect(v.verifyNonInclusion(root, proof)).toBe(false);
    expect(() => v.assertNonInclusion(root, proof)).toThrow(ProofVerifyError);
  });
});

describe("asBinaryProofEnvelope", () => {
  it("narrows a well-formed binary proof", () => {
    const env = asBinaryProofEnvelope({
      proofKind: "binary",
      key: "0xaa",
      value: "0xbb",
      siblings: ["0x" + "11".repeat(32)],
    });
    expect(env).not.toBeNull();
    expect(env!.proofKind).toBe("binary");
  });

  it("returns null for a non-binary or malformed proof", () => {
    expect(asBinaryProofEnvelope(null)).toBeNull();
    expect(asBinaryProofEnvelope({ proofKind: "verkle" })).toBeNull();
    expect(asBinaryProofEnvelope({ proofKind: "binary", key: "0x", value: "0x" })).toBeNull();
  });
});
