import { describe, expect, it } from "vitest";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SEED_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  ML_KEM_768_ENCAPSULATION_KEY_LEN,
  MempoolClass,
  MlDsa65Backend,
  Pqm1Error,
  assemblePqm1Payload,
  bincodeEncryptedEnvelope,
  bincodeNonceAad,
  buildEncryptedEnvelope,
  buildEncryptedSubmission,
  bytesToHex,
  bincodeSignedTransaction,
  derivePqm1MlDsa65SeedFromPayload,
  encodeTransactionForHash,
  generatePqm1Mnemonic,
  outerSigDigest,
  parsePqm1Payload,
  pqm1MnemonicToAddress,
  pqm1MnemonicToMlDsa65Backend,
  pqm1MnemonicToMlDsa65Seed,
  pqm1MnemonicToPayload,
  pqm1PayloadToMnemonic,
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

  it("signs over typed native tx extensions and serializes them in bincode wire bytes", () => {
    const base = {
      chainId: 69420n,
      nonce: 7n,
      maxPriorityFeePerGas: 1n,
      maxFeePerGas: 2n,
      gasLimit: 30_000n,
      to: null,
      value: 3n,
      input: "0x13000000",
    };
    const noExtension = encodeTransactionForHash(base, 0x01);
    const withMrvExtension = encodeTransactionForHash(
      { ...base, extensions: [{ kind: 0x30, bodyHex: "0x01" }] },
      0x01,
    );

    expect(bytesToHex(noExtension).endsWith("0000000000000000")).toBe(true);
    expect(bytesToHex(withMrvExtension).endsWith("0000000000000001300000000101")).toBe(true);
    expect(bytesToHex(withMrvExtension)).not.toBe(bytesToHex(noExtension));

    const wire = bincodeSignedTransaction(
      { ...base, extensions: [{ kind: 0x30, body: [0x01] }] },
      new Uint8Array(ML_DSA_65_SIGNATURE_LEN).fill(0x55),
      new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN).fill(0x66),
    );
    expect(bytesToHex(wire)).toContain("000000000000000001000000000000003001000000000000000105000000");
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

  it("rejects encrypted submission fee fields outside u128 before envelope build", async () => {
    const backend = MlDsa65Backend.fromSeed(new Uint8Array(ML_DSA_65_SEED_LEN).fill(0x12));
    const encryptionKey = {
      algo: "ml-kem-768",
      epoch: 1n,
      encapsulationKey: new Uint8Array(ML_KEM_768_ENCAPSULATION_KEY_LEN).fill(0x34),
    };

    await expect(
      buildEncryptedSubmission({
        backend,
        encryptionKey,
        tx: {
          chainId: 69_420n,
          nonce: 0n,
          maxPriorityFeePerGas: 0n,
          maxFeePerGas: 1n << 128n,
          gasLimit: 30_000n,
          to: null,
          value: 0n,
          input: "0x13000000",
          extensions: [{ kind: 0x30, bodyHex: "0x01" }],
        },
      }),
    ).rejects.toThrow(/maxFeePerGas must fit in u128/);
  });

  it("round-trips PQM-1 v1 ML-DSA-65 mnemonics using the Rust payload layout", () => {
    const payload = assemblePqm1Payload(new Uint8Array(30));
    const mnemonic = pqm1PayloadToMnemonic(payload);

    expect(mnemonic).toBe(
      "absurd amount abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon armor",
    );

    const parsed = pqm1MnemonicToPayload(mnemonic);
    expect(parsed.algoTag).toBe(0x01);
    expect(parsed.version).toBe(0x01);
    expect(bytesToHex(parsed.entropy)).toBe(`0x${"00".repeat(30)}`);
    expect(bytesToHex(parsed.bytes)).toBe(bytesToHex(payload));
  });

  it("derives deterministic PQM-1 ML-DSA-65 seed and address helpers", () => {
    const payload = assemblePqm1Payload(new Uint8Array(30).fill(0x22));
    const mnemonic = pqm1PayloadToMnemonic(payload);
    const seedA = derivePqm1MlDsa65SeedFromPayload(payload);
    const seedB = pqm1MnemonicToMlDsa65Seed(mnemonic);
    const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);

    expect(seedA).toHaveLength(ML_DSA_65_SEED_LEN);
    expect(bytesToHex(seedA)).toBe(bytesToHex(seedB));
    expect(pqm1MnemonicToAddress(mnemonic)).toBe(backend.getAddress());
  });

  it("matches a mono-core Rust-generated PQM-1 address vector", () => {
    const rustMnemonic =
      "absurd aspect pioneer ozone extra early cross pony aisle example deer erode cat employ that trouble able correct body battle version tag elegant kitchen";
    expect(pqm1MnemonicToAddress(rustMnemonic)).toBe("0x7200eb51936508214a15ef37b40858717aa804c4");
  });

  it("generates PQM-1 mnemonics from injected entropy", () => {
    const mnemonic = generatePqm1Mnemonic((out) => out.fill(0x7a));
    const parsed = pqm1MnemonicToPayload(mnemonic);
    expect(bytesToHex(parsed.bytes)).toBe(`0x0101${"7a".repeat(30)}`);
  });

  it("rejects unsupported PQM-1 tags and malformed word counts", () => {
    const badAlgoPayload = new Uint8Array(32);
    badAlgoPayload[0] = 0xfe;
    badAlgoPayload[1] = 0x01;
    expect(() => parsePqm1Payload(badAlgoPayload)).toThrow(Pqm1Error);
    expect(() => pqm1MnemonicToPayload("abandon abandon")).toThrow(Pqm1Error);
  });
});
