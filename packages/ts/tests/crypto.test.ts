import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SEED_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  ML_KEM_768_ENCAPSULATION_KEY_LEN,
  MempoolClass,
  MlDsa65Backend,
  Pqm1Error,
  assemblePqm1Payload,
  bincodeDecryptHint,
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
  const MRV_NATIVE_TX_VECTOR = {
    fields: {
      chainId: 69_420n,
      nonce: 7n,
      maxPriorityFeePerGas: 1n,
      maxFeePerGas: 25n,
      gasLimit: 100_000n,
      to: null,
      value: 0n,
      input: "0x13000000",
      extensions: [{ kind: 0x30, bodyHex: "0x01" }],
    },
    signingPreimage:
      "0x010000000000010f2c00000000000000070000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001900000000000186a000000000000000000000000000000000000000000000000000000000000000000000000004130000000000000000000001300000000101",
    sighash: "0xb680eb3b3e67b441d22c4ac441c9355809cac860dc2c0773ed47e49f273725c3",
    identityTxHash: "0x0f826159573ebe870876d03e9b54541fbbb652de4642552abc9a65a481781789",
    wireLen: 5_448,
    wirePrefix:
      "0x2c0f010000000000070000000000000001000000000000000000000000000000000000000000000000000000000000001900000000000000000000000000000000000000000000000000000000000000a086010000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000013000000000000000000000001000000000000003001000000000000000105",
    wireSuffix:
      "0x6666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666",
  } as const;

  const MRV_ENCRYPTED_ENVELOPE_VECTOR = {
    nonceAad:
      "0x1400000000000000111111111111111111111111111111111111111107000000000000002c0f010000000000050000001900000000000000000000000000000001000000000000000000000000000000a086010000000000",
    decryptHint: "0x09000000000000000000",
    outerSignatureDigest: "0xd84fed20413cab193ea41e1c73cf58dbba0ee4071e11a3071bdccab6ed61f9a5",
    wireLen: 6_543,
    wirePrefix:
      "0x1400000000000000111111111111111111111111111111111111111107000000000000002c0f010000000000050000001900000000000000000000000000000001000000000000000000000000000000a0860100000000006004000000000000" +
      "44".repeat(84),
    wireSuffix:
      "0x" + "55".repeat(52) + "14000000000000001111111111111111111111111111111111111111",
  } as const;

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

  it("matches the Rust MRV native transaction golden vector", () => {
    const signingPreimage = encodeTransactionForHash(MRV_NATIVE_TX_VECTOR.fields, 0x01);
    const identityPreimage = encodeTransactionForHash(MRV_NATIVE_TX_VECTOR.fields, 0x02);
    const signature = new Uint8Array(ML_DSA_65_SIGNATURE_LEN).fill(0x55);
    const publicKey = new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN).fill(0x66);
    const wire = bincodeSignedTransaction(MRV_NATIVE_TX_VECTOR.fields, signature, publicKey);
    const identityHash = keccak_256(new Uint8Array([...identityPreimage, ...signature, ...publicKey]));

    expect(bytesToHex(signingPreimage)).toBe(MRV_NATIVE_TX_VECTOR.signingPreimage);
    expect(bytesToHex(keccak_256(signingPreimage))).toBe(MRV_NATIVE_TX_VECTOR.sighash);
    expect(bytesToHex(identityHash)).toBe(MRV_NATIVE_TX_VECTOR.identityTxHash);
    expect(wire).toHaveLength(MRV_NATIVE_TX_VECTOR.wireLen);
    expect(bytesToHex(wire.slice(0, 160))).toBe(MRV_NATIVE_TX_VECTOR.wirePrefix);
    expect(bytesToHex(wire.slice(-80))).toBe(MRV_NATIVE_TX_VECTOR.wireSuffix);
  });

  it("matches the Rust encrypted MRV envelope deterministic vector", () => {
    const nonceAad = {
      sender: new Uint8Array(20).fill(0x11),
      nonce: 7n,
      chainId: 69_420n,
      class: MempoolClass.FoundationOp,
      maxFeePerGas: 25n,
      maxPriorityFeePerGas: 1n,
      gasLimit: 100_000n,
    };
    const decryptionHint = { epoch: 9n, scheme: 0 };
    const ciphertext = new Uint8Array(1_088 + 12 + 4 + 16).fill(0x44);
    const senderPubkey = new Uint8Array(ML_DSA_65_PUBLIC_KEY_LEN).fill(0x66);
    const outerSignature = new Uint8Array(ML_DSA_65_SIGNATURE_LEN).fill(0x55);
    const envelope = {
      nonceAad,
      ciphertext,
      decryptionHint,
      senderPubkey,
      outerSignature,
      sender: nonceAad.sender,
    };
    const wire = bincodeEncryptedEnvelope(envelope);

    expect(MempoolClass.FoundationOp).toBe(5);
    expect(bytesToHex(bincodeNonceAad(nonceAad))).toBe(MRV_ENCRYPTED_ENVELOPE_VECTOR.nonceAad);
    expect(bytesToHex(bincodeDecryptHint(decryptionHint))).toBe(MRV_ENCRYPTED_ENVELOPE_VECTOR.decryptHint);
    expect(bytesToHex(outerSigDigest(nonceAad, ciphertext, decryptionHint, senderPubkey))).toBe(
      MRV_ENCRYPTED_ENVELOPE_VECTOR.outerSignatureDigest,
    );
    expect(wire).toHaveLength(MRV_ENCRYPTED_ENVELOPE_VECTOR.wireLen);
    expect(bytesToHex(wire.slice(0, 180))).toBe(MRV_ENCRYPTED_ENVELOPE_VECTOR.wirePrefix);
    expect(bytesToHex(wire.slice(-80))).toBe(MRV_ENCRYPTED_ENVELOPE_VECTOR.wireSuffix);
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
