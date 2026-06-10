import { describe, expect, it } from "vitest";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  MAX_MULTISIG_MEMBERS,
  MULTISIG_WITNESS_DOMAIN,
  MultisigError,
  TX_EXTENSION_KIND_MULTISIG,
  TX_EXTENSION_MULTISIG_V1,
  assembleMultisigSigned,
  assembleMultisigWitness,
  deriveMultisigAddress,
  deriveMultisigAddressBytes,
  encodeMultisigWitnessBody,
  multisigBaseSighash,
  multisigMemberIndex,
  sortMultisigMembers,
  validateMultisigRoster,
  type MultisigMemberSignature,
  type MultisigWitness,
} from "../src/multisig.js";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  STANDARD_ALGO_NUMBER_ML_DSA_65,
} from "../src/crypto/ml-dsa.js";
import { encodeTransactionForHash, type NativeEvmTxFields } from "../src/crypto/tx.js";

// --- Rust ground truth -------------------------------------------------
//
// Emitted by mono-core test `protocore-tx --test zz_multisig_parity_groundtruth`
// for the fixed fixture below (5 members from seeds [0xC0, i+1, 0..], a
// 3-of-5 threshold, signatures from sorted indices 0/1/2, over the fixed
// chain-69420 transfer tx). Members are reproduced here deterministically
// from the same seeds; only the wire-critical outputs are pinned.
const GROUND_TRUTH = {
  // monom bech32m of BLAKE3(domain||thr_be16||(len_be8||pk)*sorted)[..20]
  // (raw 20-byte payload: 290e9a161402887183bb98a7b205ddb051bc0bbb)
  address: "monom19y8f59s5q2y8rqamnznmypwakpgmczam8an6py",
  baseSighash: "ea67618cadc81b2edd46c3525fbc225a862843de15da56e49266d3029be07d25",
  // keccak256 of the full ~19.8 KB witness body (0x01||domain||bincode)
  witnessBodyKeccak: "49d3e6ac52d1dfc4b73c47092ce55c59b9dac55ff7b89b9cad62dd39f9694d53",
  witnessBodyLen: 19810,
  // keccak256 of TAG_SIGHASH encoding of the assembled tx (witness appended)
  assembledSighashPreimageKeccak:
    "e9a0a024f128169e45110d6ea7bf40d5a4306b83dac066f04723da0d1d77eaa7",
  assembledSighashPreimageLen: 19973,
} as const;

function memberSeed(i: number): Uint8Array {
  const s = new Uint8Array(32);
  s[0] = 0xc0;
  s[1] = i + 1;
  return s;
}

function memberKey(i: number): { secretKey: Uint8Array; publicKey: Uint8Array } {
  return ml_dsa65.keygen(memberSeed(i));
}

function memberPubkeys(n: number): Uint8Array[] {
  return Array.from({ length: n }, (_, i) => memberKey(i).publicKey);
}

const FIXTURE_TX: NativeEvmTxFields = {
  chainId: 69420n,
  nonce: 7n,
  maxPriorityFeePerGas: 1_000_000_000n,
  maxFeePerGas: 20_000_000_000n,
  gasLimit: 21_000n,
  to: new Uint8Array(20).fill(0x11),
  value: 42n,
  input: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
};

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function keccakHex(bytes: Uint8Array): string {
  return hex(keccak_256(bytes));
}

/** Build the canonical 3-of-5 witness with deterministic member sigs. */
function buildFixtureWitness(): MultisigWitness {
  const pubkeys = memberPubkeys(5);
  const base = multisigBaseSighash(FIXTURE_TX);
  // Sign with the members at SORTED indices 0/1/2.
  const sorted = sortMultisigMembers(pubkeys);
  const signatures: MultisigMemberSignature[] = [0, 1, 2].map((idx) => {
    const sortedPk = sorted[idx]!;
    const originalIdx = pubkeys.findIndex((p) => hex(p) === hex(sortedPk));
    const sk = memberKey(originalIdx).secretKey;
    return {
      memberIndex: idx,
      signature: ml_dsa65.sign(base, sk, { extraEntropy: false }),
    };
  });
  return assembleMultisigWitness(3, pubkeys, signatures);
}

describe("multisig address derivation (Rust parity)", () => {
  it("derives the pinned monom bech32m address", () => {
    const pubkeys = memberPubkeys(5);
    expect(deriveMultisigAddress(3, pubkeys)).toBe(GROUND_TRUTH.address);
    expect(hex(deriveMultisigAddressBytes(3, pubkeys))).toBe(
      "290e9a161402887183bb98a7b205ddb051bc0bbb",
    );
  });

  it("is order-insensitive and threshold-bound", () => {
    const pubkeys = memberPubkeys(5);
    const reversed = [...pubkeys].reverse();
    expect(deriveMultisigAddress(3, reversed)).toBe(deriveMultisigAddress(3, pubkeys));
    expect(deriveMultisigAddress(2, pubkeys)).not.toBe(deriveMultisigAddress(3, pubkeys));
  });

  it("returns 20-byte payloads", () => {
    expect(deriveMultisigAddressBytes(3, memberPubkeys(5))).toHaveLength(20);
  });
});

describe("multisigBaseSighash (Rust parity)", () => {
  it("matches the pinned base sighash for the fixture tx", () => {
    expect(hex(multisigBaseSighash(FIXTURE_TX))).toBe(GROUND_TRUTH.baseSighash);
  });

  it("equals the ordinary sighash when no witness extension is present", () => {
    const sighash = keccakHex(encodeTransactionForHash(FIXTURE_TX, 0x01));
    expect(hex(multisigBaseSighash(FIXTURE_TX))).toBe(sighash);
  });

  it("strips the witness extension before hashing (append does not change base)", () => {
    const witness = buildFixtureWitness();
    const withWitness = assembleMultisigSigned(FIXTURE_TX, witness);
    expect(hex(multisigBaseSighash(withWitness))).toBe(GROUND_TRUTH.baseSighash);
  });

  it("changes with any committed field", () => {
    const base = hex(multisigBaseSighash(FIXTURE_TX));
    expect(hex(multisigBaseSighash({ ...FIXTURE_TX, nonce: 8n }))).not.toBe(base);
    expect(hex(multisigBaseSighash({ ...FIXTURE_TX, value: 43n }))).not.toBe(base);
  });
});

describe("multisig witness body (Rust parity)", () => {
  it("encodes byte-identically to the pinned Rust witness body", () => {
    const body = encodeMultisigWitnessBody(buildFixtureWitness());
    expect(body).toHaveLength(GROUND_TRUTH.witnessBodyLen);
    expect(keccakHex(body)).toBe(GROUND_TRUTH.witnessBodyKeccak);
  });

  it("starts with the version byte + domain tag", () => {
    const body = encodeMultisigWitnessBody(buildFixtureWitness());
    expect(body[0]).toBe(TX_EXTENSION_MULTISIG_V1);
    const domain = new TextEncoder().encode(MULTISIG_WITNESS_DOMAIN);
    expect(hex(body.slice(1, 1 + domain.length))).toBe(hex(domain));
    // bincode threshold u16 LE = 3 -> 0x03 0x00
    expect(body[1 + domain.length]).toBe(0x03);
    expect(body[2 + domain.length]).toBe(0x00);
  });
});

describe("assembleMultisigSigned (Rust parity)", () => {
  it("appends a 0x40 witness extension whose tx sighash matches Rust", () => {
    const witness = buildFixtureWitness();
    const assembled = assembleMultisigSigned(FIXTURE_TX, witness);
    expect(assembled.extensions?.at(-1)?.kind).toBe(TX_EXTENSION_KIND_MULTISIG);
    const preimage = encodeTransactionForHash(assembled, 0x01);
    expect(preimage).toHaveLength(GROUND_TRUTH.assembledSighashPreimageLen);
    expect(keccakHex(preimage)).toBe(GROUND_TRUTH.assembledSighashPreimageKeccak);
  });

  it("rejects a tx that already carries a witness", () => {
    const witness = buildFixtureWitness();
    const once = assembleMultisigSigned(FIXTURE_TX, witness);
    expect(() => assembleMultisigSigned(once, witness)).toThrow(MultisigError);
  });
});

describe("witness assembly + validation", () => {
  it("sorts the roster into canonical order", () => {
    const pubkeys = memberPubkeys(5);
    const reversed = [...pubkeys].reverse();
    const w = assembleMultisigWitness(3, reversed);
    const expected = sortMultisigMembers(pubkeys);
    expect(w.members.map((m) => hex(m.pubkey))).toEqual(expected.map(hex));
    expect(w.members.every((m) => m.algoId === STANDARD_ALGO_NUMBER_ML_DSA_65)).toBe(true);
  });

  it("locates a member's sorted index", () => {
    const pubkeys = memberPubkeys(5);
    const sorted = sortMultisigMembers(pubkeys);
    for (let i = 0; i < sorted.length; i++) {
      expect(multisigMemberIndex(pubkeys, sorted[i]!)).toBe(i);
    }
    expect(multisigMemberIndex(pubkeys, new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN))).toBe(-1);
  });

  it("rejects an out-of-range threshold", () => {
    const pubkeys = memberPubkeys(3);
    expect(() => assembleMultisigWitness(4, pubkeys)).toThrow(MultisigError);
    expect(() => assembleMultisigWitness(0, pubkeys)).toThrow(MultisigError);
  });

  it("rejects an empty or oversized roster", () => {
    expect(() => assembleMultisigWitness(1, [])).toThrow(MultisigError);
    const tooMany = Array.from(
      { length: MAX_MULTISIG_MEMBERS + 1 },
      (_, i) => memberKey(i).publicKey,
    );
    expect(() => assembleMultisigWitness(1, tooMany)).toThrow(MultisigError);
  });

  it("rejects more signatures than members", () => {
    const pubkeys = memberPubkeys(2);
    const sigs: MultisigMemberSignature[] = [0, 1, 0].map((memberIndex) => ({
      memberIndex,
      signature: new Uint8Array(ML_DSA_65_SIGNATURE_LEN),
    }));
    expect(() => assembleMultisigWitness(2, pubkeys, sigs)).toThrow(MultisigError);
  });

  it("rejects a wrong-length member pubkey", () => {
    const bad = [new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN - 1)];
    expect(() => assembleMultisigWitness(1, bad)).toThrow();
  });

  it("validateMultisigRoster rejects a non-ml-dsa member", () => {
    const w = assembleMultisigWitness(2, memberPubkeys(3));
    const tampered: MultisigWitness = {
      ...w,
      members: w.members.map((m, i) => (i === 0 ? { ...m, algoId: 7 } : m)),
    };
    expect(() => validateMultisigRoster(tampered)).toThrow(MultisigError);
  });

  it("validateMultisigRoster rejects an unsorted roster", () => {
    const w = assembleMultisigWitness(2, memberPubkeys(3));
    const unsorted: MultisigWitness = { ...w, members: [...w.members].reverse() };
    expect(() => validateMultisigRoster(unsorted)).toThrow(MultisigError);
  });
});
