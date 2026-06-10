/**
 * Native `monom` M-of-N multisig witness assembly.
 *
 * Monolythium v2 has a **native** (precompile-free, protocol-level) multisig
 * spend path: a `monom…` address is `BLAKE3("MONO_MULTISIG_BLAKE3_20_V1" ||
 * threshold_be16 || (member_len_be8 || member)*sorted)[..20]`, and value is
 * moved *from* it by attaching a self-describing M-of-N witness as a typed
 * transaction extension (kind `0x40`). No on-chain registry is consulted —
 * the verifier reconstructs the address from the witness alone.
 *
 * This module is wire-critical: every byte here mirrors the Rust source of
 * truth exactly (`mono-core/crates/execution/tx/src/multisig.rs` for the
 * witness body + framing, `crates/crypto/crypto/src/address.rs` for the
 * address rule, and `crates/core/sdk/src/tx.rs` for
 * `multisig_base_sighash` / `assemble_multisig_signed`). Parity is pinned in
 * `tests/multisig.test.ts` against ground-truth bytes emitted by the Rust
 * crate.
 *
 * Design notes mirrored from Rust:
 * - Members are stored **sorted ascending by raw pubkey bytes**; the same
 *   canonicalisation the address derivation applies. `member_index` in a
 *   signature is an index into the sorted roster.
 * - Members sign the **base sighash**: the envelope's keccak-256 sighash with
 *   the multisig witness extension removed. Because every extension is part
 *   of the sighash preimage, members cannot sign over a preimage that already
 *   contains their own signatures — the witness is appended afterward.
 * - The witness body is `0x01 || "MONO_MULTISIG_WITNESS_V1" || bincode(witness)`.
 *   `bincode` here is bincode 1.x defaults: little-endian fixints, `u64`
 *   length prefixes on every `Vec`. The struct serialises in field order:
 *   `threshold: u16`, `members: Vec<MultisigMember>`,
 *   `signatures: Vec<MultisigMemberSignature>`, where `MultisigMember` is
 *   `{ algo_id: u16, pubkey: Vec<u8> }` and `MultisigMemberSignature` is
 *   `{ member_index: u16, signature: Vec<u8> }`.
 */

import { blake3 } from "@noble/hashes/blake3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { BincodeWriter } from "./crypto/bincode.js";
import { concatBytes, expectBytes } from "./crypto/bytes.js";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  STANDARD_ALGO_NUMBER_ML_DSA_65,
} from "./crypto/ml-dsa.js";
import { encodeTransactionForHash, type NativeEvmTxFields } from "./crypto/tx.js";
import { addressToTypedBech32 } from "./address.js";

/** Typed-extension kind byte for a native multisig spend witness (Rust `TX_EXTENSION_KIND_MULTISIG`). */
export const TX_EXTENSION_KIND_MULTISIG = 0x40 as const;

/** Witness body version byte — first byte of the extension body (Rust `TX_EXTENSION_MULTISIG_V1`). */
export const TX_EXTENSION_MULTISIG_V1 = 0x01 as const;

/** Domain tag mixed into the witness body version line (Rust `MULTISIG_WITNESS_DOMAIN`). */
export const MULTISIG_WITNESS_DOMAIN = "MONO_MULTISIG_WITNESS_V1" as const;

/** BLAKE3 multisig address-derivation domain (Rust `MULTISIG_ADDRESS_DERIVATION_DOMAIN`). */
export const MULTISIG_ADDRESS_DERIVATION_DOMAIN = "MONO_MULTISIG_BLAKE3_20_V1" as const;

/** Lower bound on roster size (Rust `MIN_MEMBERS`). */
export const MIN_MULTISIG_MEMBERS = 1 as const;

/** Upper bound on roster size (Rust `MAX_MULTISIG_MEMBERS`). */
export const MAX_MULTISIG_MEMBERS = 64 as const;

const WITNESS_DOMAIN_BYTES = new TextEncoder().encode(MULTISIG_WITNESS_DOMAIN);
const ADDRESS_DOMAIN_BYTES = new TextEncoder().encode(MULTISIG_ADDRESS_DERIVATION_DOMAIN);

export class MultisigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MultisigError";
  }
}

/** A single roster member: an ML-DSA-65 public key. */
export interface MultisigMember {
  /** Signature algorithm id. Must be ML-DSA-65 (`1001`). */
  algoId: number;
  /** Canonical ML-DSA-65 public-key bytes (1952 B). */
  pubkey: Uint8Array;
}

/** A member signature tagged with its index in the sorted roster. */
export interface MultisigMemberSignature {
  /** Index into the **sorted** member roster. */
  memberIndex: number;
  /** Canonical ML-DSA-65 signature bytes over the base sighash (3309 B). */
  signature: Uint8Array;
}

/** A self-describing multisig spend witness with a canonically-sorted roster. */
export interface MultisigWitness {
  /** Quorum threshold: `1 <= threshold <= members.length`. */
  threshold: number;
  /** Full roster, sorted ascending by raw `pubkey` bytes. */
  members: MultisigMember[];
  /** Collected member signatures over the base sighash. */
  signatures: MultisigMemberSignature[];
}

/** Accepts a member pubkey as raw bytes / number[] / hex (delegated to {@link expectBytes}). */
export type MemberPubkeyInput = Uint8Array | readonly number[];

function toPubkeyBytes(value: MemberPubkeyInput, label: string): Uint8Array {
  return expectBytes(value, ML_DSA_65_PUBLIC_KEY_LEN, label);
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return a.length - b.length;
}

function u64BeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function expectThreshold(threshold: number): number {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 0xffff) {
    throw new MultisigError("threshold must be a uint16");
  }
  return threshold;
}

/**
 * Sort + dedupe-check a roster of ML-DSA-65 public keys into canonical
 * (ascending raw-byte) order, mirroring `address_from_multisig_members` and
 * `MultisigWitness::new`'s `members.sort_by(pubkey.cmp)`.
 *
 * Returns a fresh array sorted ascending; the input is not mutated.
 */
export function sortMultisigMembers(members: readonly MemberPubkeyInput[]): Uint8Array[] {
  return members
    .map((m, i) => toPubkeyBytes(m, `members[${i}]`))
    .sort(compareBytes);
}

/**
 * Derive the `monom…` bech32m multisig address for a roster + threshold.
 *
 * Mirrors `protocore_crypto::address_from_multisig_members`:
 * `BLAKE3("MONO_MULTISIG_BLAKE3_20_V1" || threshold_be16 ||
 * (member_len_be8 || member)*sorted)[..20]`, rendered with the `monom` HRP.
 *
 * The address rule itself is order-insensitive and imposes no roster-size
 * policy (matching Rust); use {@link assembleMultisigWitness} when you need
 * the roster-shape validation enforced.
 */
export function deriveMultisigAddressBytes(
  threshold: number,
  members: readonly MemberPubkeyInput[],
): Uint8Array {
  expectThreshold(threshold);
  const sorted = sortMultisigMembers(members);
  const parts: Uint8Array[] = [
    ADDRESS_DOMAIN_BYTES,
    Uint8Array.from([(threshold >> 8) & 0xff, threshold & 0xff]),
  ];
  for (const member of sorted) {
    parts.push(u64BeBytes(BigInt(member.length)));
    parts.push(member);
  }
  return blake3(concatBytes(...parts)).slice(0, 20);
}

/** {@link deriveMultisigAddressBytes} rendered as a `monom…` bech32m string. */
export function deriveMultisigAddress(
  threshold: number,
  members: readonly MemberPubkeyInput[],
): string {
  return addressToTypedBech32("multisig", deriveMultisigAddressBytes(threshold, members));
}

/**
 * Validate the static roster shape, mirroring Rust `validate_roster`.
 *
 * Enforces: 1..=64 members; `1 <= threshold <= members.length`;
 * `signatures.length <= members.length`; every member ML-DSA-65 with a
 * 1952-byte pubkey; the roster sorted ascending and duplicate-free.
 */
export function validateMultisigRoster(witness: MultisigWitness): void {
  const n = witness.members.length;
  if (n < MIN_MULTISIG_MEMBERS || n > MAX_MULTISIG_MEMBERS) {
    throw new MultisigError("roster size out of range");
  }
  if (witness.threshold === 0 || witness.threshold > n) {
    throw new MultisigError("threshold out of range");
  }
  if (witness.signatures.length > n) {
    throw new MultisigError("more signatures than members");
  }
  let prev: Uint8Array | undefined;
  for (const member of witness.members) {
    if (member.algoId !== STANDARD_ALGO_NUMBER_ML_DSA_65) {
      throw new MultisigError("non-ml-dsa-65 member");
    }
    if (member.pubkey.length !== ML_DSA_65_PUBLIC_KEY_LEN) {
      throw new MultisigError("member pubkey length");
    }
    if (prev !== undefined && compareBytes(member.pubkey, prev) <= 0) {
      throw new MultisigError("roster not sorted / duplicate");
    }
    prev = member.pubkey;
  }
}

/**
 * Build a {@link MultisigWitness} from a roster + threshold + collected
 * member signatures, sorting the roster into canonical order and validating
 * the roster shape — mirrors `MultisigWitness::new`.
 *
 * Callers supply `signatures` already keyed to the **sorted** roster
 * (`memberIndex` is the index into the sorted member list). Use
 * {@link multisigMemberIndex} to find a member's sorted index.
 */
export function assembleMultisigWitness(
  threshold: number,
  members: readonly MemberPubkeyInput[],
  signatures: readonly MultisigMemberSignature[] = [],
): MultisigWitness {
  expectThreshold(threshold);
  const sortedPubkeys = sortMultisigMembers(members);
  const witness: MultisigWitness = {
    threshold,
    members: sortedPubkeys.map((pubkey) => ({
      algoId: STANDARD_ALGO_NUMBER_ML_DSA_65,
      pubkey,
    })),
    signatures: signatures.map((s, i) => ({
      memberIndex: expectMemberIndex(s.memberIndex, `signatures[${i}].memberIndex`),
      signature: expectBytes(s.signature, ML_DSA_65_SIGNATURE_LEN, `signatures[${i}].signature`),
    })),
  };
  validateMultisigRoster(witness);
  return witness;
}

function expectMemberIndex(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new MultisigError(`${label} must be a uint16`);
  }
  return value;
}

/**
 * Find the index of `pubkey` in the canonically-sorted roster, or `-1` if it
 * is not a member. Use this to key a {@link MultisigMemberSignature}'s
 * `memberIndex` when collecting signatures.
 */
export function multisigMemberIndex(
  members: readonly MemberPubkeyInput[],
  pubkey: MemberPubkeyInput,
): number {
  const target = toPubkeyBytes(pubkey, "pubkey");
  const sorted = sortMultisigMembers(members);
  return sorted.findIndex((m) => compareBytes(m, target) === 0);
}

/**
 * Canonical witness extension body bytes — mirrors `MultisigWitness::encode_body`.
 *
 * Layout: `0x01 || "MONO_MULTISIG_WITNESS_V1" || bincode(witness)`.
 */
export function encodeMultisigWitnessBody(witness: MultisigWitness): Uint8Array {
  validateMultisigRoster(witness);
  const w = new BincodeWriter();
  // bincode(MultisigWitness) — fields in declaration order.
  w.u16(witness.threshold);
  w.u64(BigInt(witness.members.length));
  for (const member of witness.members) {
    w.u16(member.algoId);
    w.bytes(member.pubkey);
  }
  w.u64(BigInt(witness.signatures.length));
  for (const sig of witness.signatures) {
    w.u16(sig.memberIndex);
    w.bytes(sig.signature);
  }
  return concatBytes(
    Uint8Array.of(TX_EXTENSION_MULTISIG_V1),
    WITNESS_DOMAIN_BYTES,
    w.toBytes(),
  );
}

function hasMultisigExtension(fields: NativeEvmTxFields): boolean {
  return (fields.extensions ?? []).some((ext) => ext.kind === TX_EXTENSION_KIND_MULTISIG);
}

function stripMultisigExtensions(fields: NativeEvmTxFields): NativeEvmTxFields {
  if (!hasMultisigExtension(fields)) return fields;
  return {
    ...fields,
    extensions: (fields.extensions ?? []).filter((ext) => ext.kind !== TX_EXTENSION_KIND_MULTISIG),
  };
}

/**
 * Compute the **base sighash** each multisig member signs for this tx —
 * mirrors `multisig_base_sighash` / `Transaction::base_sighash`.
 *
 * This is keccak-256 over the envelope's `TAG_SIGHASH` encoding with any
 * multisig witness extension removed. When no multisig extension is present
 * (the normal case — you pass the plain transfer envelope) it equals the
 * ordinary sighash. Every member signs these same 32 bytes.
 */
export function multisigBaseSighash(fields: NativeEvmTxFields): Uint8Array {
  const base = stripMultisigExtensions(fields);
  return keccak_256(encodeTransactionForHash(base, 0x01));
}

/**
 * Attach a multisig witness to a transfer envelope, returning the envelope
 * fields with the `0x40` witness extension appended — mirrors the extension
 * step of `assemble_multisig_signed`.
 *
 * The returned fields carry the witness as the last extension. The witness's
 * member signatures must each be over `multisigBaseSighash(fields)` of the
 * **input** (witness-free) envelope; appending the witness does not change
 * the base sighash (`base_sighash` strips it).
 *
 * The caller still signs the outer envelope over the base sighash with one
 * of the roster members' keys (the chain verifies the outer signer is a
 * member). Pass the resulting `wireBytes` from a single-signer wire encode of
 * these fields, or use the lower-level `bincodeSignedTransaction` from
 * `@monolythium/core-sdk/crypto` with the outer member signature + pubkey.
 */
export function assembleMultisigSigned(
  fields: NativeEvmTxFields,
  witness: MultisigWitness,
): NativeEvmTxFields {
  if (hasMultisigExtension(fields)) {
    throw new MultisigError("transaction already carries a multisig witness extension");
  }
  const body = encodeMultisigWitnessBody(witness);
  const extensions = [
    ...(fields.extensions ?? []),
    { kind: TX_EXTENSION_KIND_MULTISIG, body },
  ];
  return { ...fields, extensions };
}
