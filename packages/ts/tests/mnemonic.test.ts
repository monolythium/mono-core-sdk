import { describe, expect, it } from "vitest";
import {
  MLDSA65_MNEMONIC_WORDS,
  MLDSA65_SEED_DOMAIN,
  ML_DSA_65_SEED_LEN,
  MnemonicError,
  bytesToHex,
  generateMnemonic,
  mnemonicToAddress,
  mnemonicToMlDsa65Backend,
  mnemonicToMlDsa65Seed,
  validateMnemonic,
} from "../src/crypto/index.js";

/**
 * Known-answer vectors for the LOCKED BIP-39 -> ML-DSA-65 derivation:
 *
 *   seed64      = mnemonicToSeedSync(mnemonic, "")   // BIP-39 PBKDF2, 64 bytes
 *   mldsa65Seed = shake256("monolythium.mldsa65.v1" || seed64, { dkLen: 32 })
 *   backend     = MlDsa65Backend.fromSeed(mldsa65Seed)
 *   address     = backend.getAddress()
 *
 * These are FIXED so a future Rust implementation can be checked against the
 * exact same mnemonic -> seed -> address triples. Do not edit the expected
 * values without re-deriving the whole chain.
 */
const KAT_VECTORS = [
  {
    name: "canonical all-zero entropy (BIP-39 32-byte 0x00)",
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
    seedHex: "0x5837fb3536908049379e7d42d3e33e48e7f39aa024fd03583a4b30f5e885349b",
    address: "0x8105a54a9989b588c1dae8942de8d3272fd83592",
  },
  {
    name: "canonical all-ones entropy (BIP-39 32-byte 0xff)",
    mnemonic:
      "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote",
    seedHex: "0xa101c592327a8468868ee41f022697dec6fc462e8542ff3a8d87d60633a516f8",
    address: "0x1dea6e813d8e0e3a12a5700b4509cad9885f7844",
  },
  {
    name: "incrementing entropy (0x00,0x01,...,0x1f)",
    mnemonic:
      "abandon amount liar amount expire adjust cage candy arch gather drum bullet absurd math era live bid rhythm alien crouch range attend journey unaware",
    seedHex: "0x35e6560e991418f7ca24b966a9626e84bc610621556cc484927c6f1a8edd945f",
    address: "0xa3b92057ecbe3527316ee0f91539d01780416f0c",
  },
] as const;

/** A 24-word phrase with a tampered (invalid) BIP-39 checksum. */
const TAMPERED_CHECKSUM_24 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
/** A valid-checksum BUT wrong-length (12-word) phrase. */
const TWELVE_WORDS =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("BIP-39 -> ML-DSA-65 mnemonic derivation", () => {
  it("exposes the locked constants", () => {
    expect(MLDSA65_MNEMONIC_WORDS).toBe(24);
    expect(MLDSA65_SEED_DOMAIN).toBe("monolythium.mldsa65.v1");
  });

  for (const v of KAT_VECTORS) {
    it(`matches the known-answer vector: ${v.name}`, () => {
      expect(v.mnemonic.split(" ")).toHaveLength(MLDSA65_MNEMONIC_WORDS);
      expect(validateMnemonic(v.mnemonic)).toBe(true);

      const seed = mnemonicToMlDsa65Seed(v.mnemonic);
      expect(seed).toHaveLength(ML_DSA_65_SEED_LEN);
      expect(bytesToHex(seed)).toBe(v.seedHex);

      expect(mnemonicToAddress(v.mnemonic)).toBe(v.address);
      expect(mnemonicToMlDsa65Backend(v.mnemonic).getAddress()).toBe(v.address);
    });
  }

  it("derivation is deterministic and normalizes input (case/whitespace)", () => {
    const v = KAT_VECTORS[0]!;
    const messy = `  ${v.mnemonic.toUpperCase().replace(/ /g, "   ")}\n`;
    expect(validateMnemonic(messy)).toBe(true);
    expect(bytesToHex(mnemonicToMlDsa65Seed(messy))).toBe(v.seedHex);
    expect(mnemonicToAddress(messy)).toBe(v.address);
  });

  it("round-trips generate() -> validate() -> derive()", () => {
    const mnemonic = generateMnemonic((out) => out.fill(0x7a));
    expect(mnemonic.split(" ")).toHaveLength(MLDSA65_MNEMONIC_WORDS);
    expect(validateMnemonic(mnemonic)).toBe(true);

    const seedA = mnemonicToMlDsa65Seed(mnemonic);
    const seedB = mnemonicToMlDsa65Seed(mnemonic);
    expect(seedA).toHaveLength(ML_DSA_65_SEED_LEN);
    expect(bytesToHex(seedA)).toBe(bytesToHex(seedB));
    expect(mnemonicToAddress(mnemonic)).toBe(
      mnemonicToMlDsa65Backend(mnemonic).getAddress(),
    );
  });

  it("generate() with default RNG yields distinct valid 24-word mnemonics", () => {
    const a = generateMnemonic();
    const b = generateMnemonic();
    expect(validateMnemonic(a)).toBe(true);
    expect(validateMnemonic(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("validateMnemonic rejects a tampered checksum and a 12-word phrase", () => {
    expect(TAMPERED_CHECKSUM_24.split(" ")).toHaveLength(24);
    expect(validateMnemonic(TAMPERED_CHECKSUM_24)).toBe(false);

    expect(TWELVE_WORDS.split(" ")).toHaveLength(12);
    expect(validateMnemonic(TWELVE_WORDS)).toBe(false);
  });

  it("mnemonicToMlDsa65Seed throws a typed MnemonicError on a 12-word phrase", () => {
    expect(() => mnemonicToMlDsa65Seed(TWELVE_WORDS)).toThrow(MnemonicError);
    try {
      mnemonicToMlDsa65Seed(TWELVE_WORDS);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MnemonicError);
      expect((e as MnemonicError).kind).toBe("badWordCount");
    }
  });

  it("mnemonicToMlDsa65Seed throws bip39Decode on a tampered 24-word checksum", () => {
    try {
      mnemonicToMlDsa65Seed(TAMPERED_CHECKSUM_24);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MnemonicError);
      expect((e as MnemonicError).kind).toBe("bip39Decode");
    }
  });
});
