import { describe, expect, it } from "vitest";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SEED_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  ML_KEM_768_ENCAPSULATION_KEY_LEN,
  MempoolClass,
  MlDsa65Backend,
  bincodeEncryptedEnvelope,
  bincodeNonceAad,
  buildEncryptedEnvelope,
  bytesToHex,
  encodeTransactionForHash,
  outerSigDigest,
} from "../src/crypto/index.js";

describe("crypto subpath", () => {
  it("derives deterministic ML-DSA-65 keys and signatures from a seed", () => {
    const seed = new Uint8Array(ML_DSA_65_SEED_LEN).fill(0x42);
    const a = MlDsa65Backend.fromSeed(seed);
    const b = MlDsa65Backend.fromSeed(seed);
    expect(a.publicKey()).toHaveLength(ML_DSA_65_PUBLIC_KEY_LEN);
    expect(a.getAddress()).toBe(b.getAddress());
    expect(bytesToHex(a.publicKey())).toBe(bytesToHex(b.publicKey()));

    const msg = new Uint8Array([1, 2, 3]);
    const sigA = a.sign(msg);
    const sigB = b.sign(msg);
    expect(sigA).toHaveLength(ML_DSA_65_SIGNATURE_LEN);
    expect(bytesToHex(sigA)).toBe(bytesToHex(sigB));
    expect(a.verify(msg, sigA)).toBe(true);
    expect(a.verify(new Uint8Array([1, 2, 4]), sigA)).toBe(false);
  });

  it("encodes native tx hash preimages with signed-over field changes", () => {
    const base = {
      chainId: 69420n,
      nonce: 7n,
      maxPriorityFeePerGas: 1n,
      maxFeePerGas: 2n,
      gasLimit: 30_000n,
      to: `0x${"11".repeat(20)}`,
      value: 3n,
      input: "0x",
    };
    const a = encodeTransactionForHash(base, 0x01);
    const b = encodeTransactionForHash({ ...base, nonce: 8n }, 0x01);
    const c = encodeTransactionForHash(base, 0x02);
    expect(a[0]).toBe(0x01);
    expect(c[0]).toBe(0x02);
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
    expect(bytesToHex(a)).not.toBe(bytesToHex(c));
  });

  it("builds an encrypted envelope around signed tx bytes", async () => {
    const backend = MlDsa65Backend.fromSeed(new Uint8Array(ML_DSA_65_SEED_LEN).fill(0x11));
    const signed = backend.signEvmTx({
      chainId: 69420n,
      nonce: 0n,
      maxPriorityFeePerGas: 1n,
      maxFeePerGas: 1n,
      gasLimit: 30_000n,
      to: `0x${"22".repeat(20)}`,
      value: 0n,
      input: "0x",
    });
    const nonceAad = {
      sender: backend.addressBytes(),
      nonce: 0n,
      chainId: 69420n,
      class: MempoolClass.Transfer,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
      gasLimit: 30_000n,
    };
    const decryptionHint = { epoch: 1n, scheme: 0 };
    const kemEncapsulationKey = new Uint8Array(ML_KEM_768_ENCAPSULATION_KEY_LEN).fill(0x33);

    const built = await buildEncryptedEnvelope({
      signedInnerTxBincode: signed.wireBytes,
      nonceAad,
      decryptionHint,
      kemEncapsulationKey,
      senderAddress: backend.addressBytes(),
      senderPubkey: backend.publicKey(),
      signOuterDigest: (digest) => backend.signPrehash(digest),
    });

    expect(built.wireHex.startsWith("0x")).toBe(true);
    expect(built.envelope.outerSignature).toHaveLength(ML_DSA_65_SIGNATURE_LEN);
    expect(built.wireBytes).toHaveLength((built.wireHex.length - 2) / 2);
    expect(bytesToHex(bincodeEncryptedEnvelope(built.envelope))).toBe(built.wireHex);
    expect(bincodeNonceAad(nonceAad).length).toBeGreaterThan(0);
    expect(outerSigDigest(nonceAad, built.envelope.ciphertext, decryptionHint, backend.publicKey())).toHaveLength(32);
  });
});
