'use strict';

var mlDsa_js = require('@noble/post-quantum/ml-dsa.js');
var sha3_js = require('@noble/hashes/sha3.js');
var bip39 = require('@scure/bip39');
var english_js = require('@scure/bip39/wordlists/english.js');
var mlKem_js = require('@noble/post-quantum/ml-kem.js');
var chacha_js = require('@noble/ciphers/chacha.js');
var utils_js = require('@noble/hashes/utils.js');

// src/crypto/bincode.ts
var BincodeWriter = class {
  #chunks = [];
  u8(value) {
    this.#int(value, 1);
  }
  u16(value) {
    this.#int(value, 2);
  }
  u32(value) {
    this.#int(value, 4);
  }
  u64(value) {
    this.#big(value, 8);
  }
  u128(value) {
    this.#big(value, 16);
  }
  enumVariant(value) {
    this.u32(value);
  }
  rawBytes(bytes) {
    for (const b of bytes) this.#chunks.push(b);
  }
  bytes(bytes) {
    this.u64(BigInt(bytes.length));
    this.rawBytes(bytes);
  }
  optionBytes(bytes) {
    if (bytes === null) {
      this.u8(0);
      return;
    }
    this.u8(1);
    this.rawBytes(bytes);
  }
  toBytes() {
    return Uint8Array.from(this.#chunks);
  }
  #int(value, bytes) {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** (bytes * 8)) {
      throw new Error(`integer out of u${bytes * 8} range`);
    }
    for (let i = 0; i < bytes; i++) {
      this.#chunks.push(value >> 8 * i & 255);
    }
  }
  #big(value, bytes) {
    let v = typeof value === "bigint" ? value : BigInt(value);
    if (v < 0n || v >= 1n << BigInt(bytes * 8)) {
      throw new Error(`integer out of u${bytes * 8} range`);
    }
    for (let i = 0; i < bytes; i++) {
      this.#chunks.push(Number(v & 0xffn));
      v >>= 8n;
    }
  }
};

// src/crypto/bytes.ts
function concatBytes(...chunks) {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const chunk of chunks) {
    out.set(chunk, off);
    off += chunk.length;
  }
  return out;
}
function bytesToHex(bytes) {
  let out = "0x";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
function hexToBytes(hex, label = "hex") {
  const stripped = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (stripped.length % 2 !== 0) {
    throw new Error(`${label} must have even length`);
  }
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = Number.parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(b)) {
      throw new Error(`${label} contains invalid hex`);
    }
    out[i] = b;
  }
  return out;
}
function expectBytes(value, len, label) {
  if (value.length !== len) {
    throw new Error(`${label} must be ${len} bytes, got ${value.length}`);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function bigintToBeBytes(value, bytes, label) {
  if (value < 0n || value >= 1n << BigInt(bytes * 8)) {
    throw new Error(`${label} out of ${bytes * 8}-bit range`);
  }
  const out = new Uint8Array(bytes);
  let v = value;
  for (let i = bytes - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function parseBigint(value, label) {
  if (value === void 0) throw new Error(`${label} missing`);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
    return BigInt(value);
  }
  if (value.startsWith("0x") || value.startsWith("0X")) return BigInt(value);
  return BigInt(value);
}

// src/crypto/tx.ts
function encodeTransactionForHash(fields, tag) {
  const n = normalizeTxFields(fields);
  return concatBytes(
    Uint8Array.of(tag),
    bigintToBeBytes(n.chainId, 8, "chainId"),
    bigintToBeBytes(n.nonce, 8, "nonce"),
    bigintToBeBytes(n.maxPriorityFeePerGas, 32, "maxPriorityFeePerGas"),
    bigintToBeBytes(n.maxFeePerGas, 32, "maxFeePerGas"),
    bigintToBeBytes(n.gasLimit, 8, "gasLimit"),
    n.to === null ? Uint8Array.of(0) : concatBytes(Uint8Array.of(1), n.to),
    bigintToBeBytes(n.value, 32, "value"),
    bigintToBeBytes(BigInt(n.input.length), 4, "input.length"),
    n.input,
    new Uint8Array(4),
    // access_list length
    encodeExtensionsForHash(n.extensions)
  );
}
function bincodeSignedTransaction(fields, signature, publicKey) {
  const n = normalizeTxFields(fields);
  const sig = expectBytes(signature, ML_DSA_65_SIGNATURE_LEN, "ML-DSA-65 signature");
  const pk = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key");
  const w = new BincodeWriter();
  w.u64(n.chainId);
  w.u64(n.nonce);
  w.rawBytes(uint256Le(n.maxPriorityFeePerGas, "maxPriorityFeePerGas"));
  w.rawBytes(uint256Le(n.maxFeePerGas, "maxFeePerGas"));
  w.u64(n.gasLimit);
  w.optionBytes(n.to);
  w.rawBytes(uint256Le(n.value, "value"));
  w.bytes(n.input);
  w.u64(0n);
  w.u64(BigInt(n.extensions.length));
  for (const ext of n.extensions) bincodeTypedExtensionInto(w, ext);
  bincodeMlDsa65OpaqueInto(w, sig);
  bincodeMlDsa65OpaqueInto(w, pk);
  return w.toBytes();
}
function normalizeTxFields(fields) {
  return {
    chainId: parseBigint(fields.chainId, "chainId"),
    nonce: parseBigint(fields.nonce, "nonce"),
    maxPriorityFeePerGas: parseBigint(fields.maxPriorityFeePerGas, "maxPriorityFeePerGas"),
    maxFeePerGas: parseBigint(fields.maxFeePerGas, "maxFeePerGas"),
    gasLimit: parseBigint(fields.gasLimit, "gasLimit"),
    to: normalizeTo(fields.to),
    value: parseBigint(fields.value, "value"),
    input: normalizeBytes(fields.input ?? new Uint8Array(0), "input"),
    extensions: normalizeExtensions(fields.extensions)
  };
}
function normalizeTo(value) {
  if (value === null) return null;
  const bytes = normalizeBytes(value, "to");
  return expectBytes(bytes, 20, "to");
}
function normalizeBytes(value, label) {
  if (typeof value === "string") return hexToBytes(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
function normalizeExtensions(value) {
  if (value === void 0) return [];
  return value.map((ext, index) => {
    if (!Number.isInteger(ext.kind) || ext.kind < 0 || ext.kind > 255) {
      throw new Error(`extensions[${index}].kind out of u8 range`);
    }
    const body = normalizeBytes("bodyHex" in ext ? ext.bodyHex : ext.body, `extensions[${index}].body`);
    if (body.length > 4294967295) {
      throw new Error(`extensions[${index}].body exceeds u32 length`);
    }
    return { kind: ext.kind, body };
  });
}
function encodeExtensionsForHash(extensions) {
  const chunks = [bigintToBeBytes(BigInt(extensions.length), 4, "extensions.length")];
  for (const ext of extensions) {
    chunks.push(
      Uint8Array.of(ext.kind),
      bigintToBeBytes(BigInt(ext.body.length), 4, "extension.body.length"),
      ext.body
    );
  }
  return concatBytes(...chunks);
}
function uint256Le(value, label) {
  if (value < 0n || value >= 1n << 256n) throw new Error(`${label} out of u256 range`);
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function bincodeMlDsa65OpaqueInto(w, raw) {
  w.enumVariant(ENUM_VARIANT_INDEX_ML_DSA_65);
  w.u16(STANDARD_ALGO_NUMBER_ML_DSA_65);
  w.bytes(raw);
}
function bincodeTypedExtensionInto(w, ext) {
  w.u8(ext.kind);
  w.bytes(ext.body);
}

// src/crypto/ml-dsa.ts
var ML_DSA_65_SEED_LEN = 32;
var ML_DSA_65_SIGNING_KEY_LEN = 4032;
var ML_DSA_65_PUBLIC_KEY_LEN = 1952;
var ML_DSA_65_SIGNATURE_LEN = 3309;
var STANDARD_ALGO_NUMBER_ML_DSA_65 = 1001;
var ENUM_VARIANT_INDEX_ML_DSA_65 = 5;
var MlDsa65Backend = class _MlDsa65Backend {
  #secretKey;
  #publicKey;
  #addressBytes;
  constructor(secretKey, publicKey) {
    this.#secretKey = expectBytes(secretKey, ML_DSA_65_SIGNING_KEY_LEN, "ML-DSA-65 secret key").slice();
    this.#publicKey = expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key").slice();
    this.#addressBytes = sha3_js.keccak_256(this.#publicKey).slice(12);
  }
  static fromSeed(seed) {
    const kp = mlDsa_js.ml_dsa65.keygen(expectBytes(seed, ML_DSA_65_SEED_LEN, "ML-DSA-65 seed"));
    return new _MlDsa65Backend(kp.secretKey, kp.publicKey);
  }
  publicKey() {
    return this.#publicKey.slice();
  }
  addressBytes() {
    return this.#addressBytes.slice();
  }
  getAddress() {
    return bytesToHex(this.#addressBytes);
  }
  sign(message) {
    return mlDsa_js.ml_dsa65.sign(message, this.#secretKey, { extraEntropy: false });
  }
  signPrehash(digest) {
    return this.sign(expectBytes(digest, 32, "prehash"));
  }
  verify(message, signature) {
    return mlDsa_js.ml_dsa65.verify(
      expectBytes(signature, ML_DSA_65_SIGNATURE_LEN, "ML-DSA-65 signature"),
      message,
      this.#publicKey
    );
  }
  signEvmTx(fields) {
    const txHashPreimage = encodeTransactionForHash(fields, 1);
    const sighash = sha3_js.keccak_256(txHashPreimage);
    const signature = this.sign(sighash);
    const wireBytes = bincodeSignedTransaction(fields, signature, this.#publicKey);
    const txHash = sha3_js.keccak_256(
      concatBytes(
        encodeTransactionForHash(fields, 2),
        signature,
        this.#publicKey
      )
    );
    return {
      wireHex: bytesToHex(wireBytes).slice(2),
      wireBytes,
      sighash,
      txHash
    };
  }
};
function mlDsa65AddressFromPublicKey(publicKey) {
  return bytesToHex(sha3_js.keccak_256(expectBytes(publicKey, ML_DSA_65_PUBLIC_KEY_LEN, "ML-DSA-65 public key")).slice(12));
}
function encodeMlDsa65Opaque(raw) {
  const bytes = raw instanceof Uint8Array ? raw : Uint8Array.from(raw);
  const len = bytes.length === ML_DSA_65_PUBLIC_KEY_LEN ? ML_DSA_65_PUBLIC_KEY_LEN : ML_DSA_65_SIGNATURE_LEN;
  expectBytes(bytes, len, "ML-DSA-65 opaque bytes");
  const out = new Uint8Array(4 + 2 + 8 + bytes.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, ENUM_VARIANT_INDEX_ML_DSA_65, true);
  dv.setUint16(4, STANDARD_ALGO_NUMBER_ML_DSA_65, true);
  dv.setBigUint64(6, BigInt(bytes.length), true);
  out.set(bytes, 14);
  return out;
}
var PQM1_ALGO_TAG_MLDSA65 = 1;
var PQM1_ALGO_TAG_MLDSA87_RESERVED = 2;
var PQM1_ALGO_TAG_SLHDSA128S_RESERVED = 3;
var PQM1_ALGO_TAG_FALCON512_RESERVED = 4;
var PQM1_VERSION_V1 = 1;
var PQM1_PAYLOAD_LEN = 32;
var PQM1_ENTROPY_LEN = 30;
var PQM1_V1_MNEMONIC_WORDS = 24;
var PQM1_V1_MLDSA65_DOMAIN_TAG = "monolythium.pqm1.v1.mldsa65";
var Pqm1Error = class extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
    this.name = "Pqm1Error";
  }
  kind;
};
var DOMAIN_BYTES = new TextEncoder().encode(PQM1_V1_MLDSA65_DOMAIN_TAG);
function normalizeMnemonic(mnemonic) {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}
function ensureSupportedPayload(bytes) {
  if (bytes.length !== PQM1_PAYLOAD_LEN) {
    throw new Pqm1Error("badPayloadLength", `PQM-1 payload must be ${PQM1_PAYLOAD_LEN} bytes, got ${bytes.length}`);
  }
  if (bytes[0] !== PQM1_ALGO_TAG_MLDSA65) {
    throw new Pqm1Error("unsupportedAlgorithm", `unsupported PQM-1 algorithm tag 0x${bytes[0].toString(16).padStart(2, "0")}`);
  }
  if (bytes[1] !== PQM1_VERSION_V1) {
    throw new Pqm1Error("unsupportedVersion", `unsupported PQM-1 version 0x${bytes[1].toString(16).padStart(2, "0")}`);
  }
}
function defaultRandomFill(bytes) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Pqm1Error("missingRandom", "globalThis.crypto.getRandomValues is unavailable");
  }
  cryptoObj.getRandomValues(bytes);
}
function assemblePqm1Payload(entropy) {
  const ent = expectBytes(entropy, PQM1_ENTROPY_LEN, "PQM-1 entropy");
  const payload = new Uint8Array(PQM1_PAYLOAD_LEN);
  payload[0] = PQM1_ALGO_TAG_MLDSA65;
  payload[1] = PQM1_VERSION_V1;
  payload.set(ent, 2);
  return payload;
}
function parsePqm1Payload(payload) {
  const bytes = expectBytes(payload, PQM1_PAYLOAD_LEN, "PQM-1 payload").slice();
  ensureSupportedPayload(bytes);
  return {
    algoTag: PQM1_ALGO_TAG_MLDSA65,
    version: PQM1_VERSION_V1,
    entropy: bytes.slice(2),
    bytes
  };
}
function pqm1PayloadToMnemonic(payload) {
  const parsed = parsePqm1Payload(payload);
  return bip39.entropyToMnemonic(parsed.bytes, english_js.wordlist);
}
function pqm1MnemonicToPayload(mnemonic) {
  const normalized = normalizeMnemonic(mnemonic);
  const words = normalized.length === 0 ? [] : normalized.split(" ");
  if (words.length !== PQM1_V1_MNEMONIC_WORDS) {
    throw new Pqm1Error("badWordCount", `PQM-1 mnemonic must be ${PQM1_V1_MNEMONIC_WORDS} words, got ${words.length}`);
  }
  let payload;
  try {
    payload = bip39.mnemonicToEntropy(normalized, english_js.wordlist);
  } catch (e) {
    throw new Pqm1Error("bip39Decode", `invalid PQM-1 mnemonic: ${e.message}`);
  }
  return parsePqm1Payload(payload);
}
function derivePqm1MlDsa65SeedFromPayload(payload) {
  const parsed = parsePqm1Payload(payload);
  return sha3_js.shake256(concatBytes(DOMAIN_BYTES, parsed.bytes), { dkLen: ML_DSA_65_SEED_LEN });
}
function pqm1MnemonicToMlDsa65Seed(mnemonic) {
  return derivePqm1MlDsa65SeedFromPayload(pqm1MnemonicToPayload(mnemonic).bytes);
}
function pqm1MnemonicToMlDsa65Backend(mnemonic) {
  return MlDsa65Backend.fromSeed(pqm1MnemonicToMlDsa65Seed(mnemonic));
}
function pqm1MnemonicToAddress(mnemonic) {
  return pqm1MnemonicToMlDsa65Backend(mnemonic).getAddress();
}
function generatePqm1Mnemonic(rng = defaultRandomFill) {
  const entropy = new Uint8Array(PQM1_ENTROPY_LEN);
  rng(entropy);
  return pqm1PayloadToMnemonic(assemblePqm1Payload(entropy));
}
var DKG_AEAD_DOMAIN_TAG = new TextEncoder().encode("protocore/v2/mempool/dkg-mlkem768/1");
var ML_KEM_768_CIPHERTEXT_LEN = 1088;
var ML_KEM_768_ENCAPSULATION_KEY_LEN = 1184;
var ML_KEM_768_SHARED_SECRET_LEN = 32;
var DKG_NONCE_LEN = 12;
var DKG_AEAD_TAG_LEN = 16;
var MempoolClass = {
  Transfer: 0,
  ContractCall: 1,
  PrivacyOp: 2,
  CLOBOp: 3,
  AgentOp: 4,
  GovernanceOp: 5,
  RWAOp: 6
};
function bincodeNonceAad(aad) {
  const w = new BincodeWriter();
  w.bytes(expectBytes(aad.sender, 20, "NonceAad.sender"));
  w.u64(aad.nonce);
  w.u64(aad.chainId);
  w.enumVariant(aad.class);
  w.u128(aad.maxFeePerGas);
  w.u128(aad.maxPriorityFeePerGas);
  w.u64(aad.gasLimit);
  return w.toBytes();
}
function bincodeDecryptHint(hint) {
  const w = new BincodeWriter();
  w.u64(hint.epoch);
  w.u16(hint.scheme);
  return w.toBytes();
}
function bincodeEncryptedEnvelope(env) {
  const w = new BincodeWriter();
  w.rawBytes(bincodeNonceAad(env.nonceAad));
  w.bytes(env.ciphertext);
  w.rawBytes(bincodeDecryptHint(env.decryptionHint));
  bincodeMlDsa65OpaqueInto2(w, expectBytes(env.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey"));
  bincodeMlDsa65OpaqueInto2(w, expectBytes(env.outerSignature, ML_DSA_65_SIGNATURE_LEN, "outerSignature"));
  w.bytes(expectBytes(env.sender, 20, "sender"));
  return w.toBytes();
}
function encryptInnerTx(signedInnerTxBincode, nonceAad, kemEncapsulationKey) {
  expectBytes(kemEncapsulationKey, ML_KEM_768_ENCAPSULATION_KEY_LEN, "kemEncapsulationKey");
  const { cipherText: kemCt, sharedSecret } = mlKem_js.ml_kem768.encapsulate(kemEncapsulationKey);
  const nonce = utils_js.randomBytes(DKG_NONCE_LEN);
  const cipher = chacha_js.chacha20poly1305(sharedSecret, nonce, aadFor(nonceAad));
  const aeadCt = cipher.encrypt(signedInnerTxBincode);
  sharedSecret.fill(0);
  return concatBytes(kemCt, nonce, aeadCt);
}
function outerSigDigest(nonceAad, ciphertext, decryptionHint, senderPubkey) {
  const aad = bincodeNonceAad(nonceAad);
  const hint = bincodeDecryptHint(decryptionHint);
  return sha3_js.keccak_256(concatBytes(aad, ciphertext, hint, expectBytes(senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey")));
}
async function buildEncryptedEnvelope(args) {
  const ciphertext = encryptInnerTx(args.signedInnerTxBincode, args.nonceAad, args.kemEncapsulationKey);
  const digest = outerSigDigest(args.nonceAad, ciphertext, args.decryptionHint, args.senderPubkey);
  const outerSignature = await args.signOuterDigest(digest);
  const envelope = {
    nonceAad: args.nonceAad,
    ciphertext,
    decryptionHint: args.decryptionHint,
    senderPubkey: expectBytes(args.senderPubkey, ML_DSA_65_PUBLIC_KEY_LEN, "senderPubkey"),
    outerSignature: expectBytes(outerSignature, ML_DSA_65_SIGNATURE_LEN, "outerSignature"),
    sender: expectBytes(args.senderAddress, 20, "senderAddress")
  };
  const wireBytes = bincodeEncryptedEnvelope(envelope);
  return { envelope, wireBytes, wireHex: bytesToHex(wireBytes) };
}
function aadFor(aad) {
  return concatBytes(DKG_AEAD_DOMAIN_TAG, bincodeNonceAad(aad));
}
function bincodeMlDsa65OpaqueInto2(w, raw) {
  w.enumVariant(ENUM_VARIANT_INDEX_ML_DSA_65);
  w.u16(STANDARD_ALGO_NUMBER_ML_DSA_65);
  w.bytes(raw);
}

// src/address.ts
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
new Map([...CHARSET].map((c, i) => [c, i]));
var HEX_20_BYTE_RE = /^0x[0-9a-fA-F]{40}$/;
var AddressError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AddressError";
  }
};
function hexToAddressBytes(address) {
  if (!HEX_20_BYTE_RE.test(address)) {
    throw new AddressError("expected 0x-prefixed 20-byte hex address");
  }
  const out = new Uint8Array(20);
  const body = address.slice(2);
  for (let i = 0; i < 20; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// src/crypto/submission.ts
async function fetchEncryptionKey(client) {
  const result = await client.call(
    "lyth_getEncryptionKey",
    []
  );
  return {
    algo: result.algo ?? "ml-kem-768",
    epoch: typeof result.epoch === "string" ? BigInt(result.epoch) : BigInt(result.epoch),
    encapsulationKey: hexToBytes(result.encapsulationKey, "encapsulationKey")
  };
}
async function buildEncryptedSubmission(args) {
  const signed = args.backend.signEvmTx(args.tx);
  const input = normalizeInput(args.tx.input);
  const to = normalizeTo2(args.tx.to);
  const nonceAad = {
    sender: args.backend.addressBytes(),
    nonce: parseBigint(args.tx.nonce, "nonce"),
    chainId: parseBigint(args.tx.chainId, "chainId"),
    class: args.class ?? (to !== null && input.length === 0 ? MempoolClass.Transfer : MempoolClass.ContractCall),
    maxFeePerGas: u128Saturate(parseBigint(args.tx.maxFeePerGas, "maxFeePerGas")),
    maxPriorityFeePerGas: u128Saturate(parseBigint(args.tx.maxPriorityFeePerGas, "maxPriorityFeePerGas")),
    gasLimit: parseBigint(args.tx.gasLimit, "gasLimit")
  };
  const decryptionHint = { epoch: args.encryptionKey.epoch, scheme: 0 };
  const built = await buildEncryptedEnvelope({
    signedInnerTxBincode: signed.wireBytes,
    nonceAad,
    decryptionHint,
    kemEncapsulationKey: args.encryptionKey.encapsulationKey,
    senderAddress: args.backend.addressBytes(),
    senderPubkey: args.backend.publicKey(),
    signOuterDigest: (digest) => args.backend.signPrehash(digest)
  });
  return {
    envelopeWireHex: built.wireHex,
    innerSighashHex: `0x${[...signed.sighash].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
    innerWireBytes: signed.wireBytes.length
  };
}
async function submitEncryptedEnvelope(client, envelopeWireHex) {
  return client.call("lyth_submitEncrypted", [envelopeWireHex]);
}
function u128Saturate(value) {
  const cap = (1n << 128n) - 1n;
  if (value < 0n) return 0n;
  return value > cap ? cap : value;
}
function normalizeTo2(value) {
  if (value === null) return null;
  if (typeof value === "string") return hexToAddressBytes(value);
  const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value);
  if (bytes.length !== 20) throw new Error("to must be 20 bytes");
  return bytes;
}
function normalizeInput(value) {
  if (value === void 0) return new Uint8Array(0);
  if (typeof value === "string") return hexToBytes(value, "input");
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

exports.BincodeWriter = BincodeWriter;
exports.DKG_AEAD_TAG_LEN = DKG_AEAD_TAG_LEN;
exports.DKG_NONCE_LEN = DKG_NONCE_LEN;
exports.ENUM_VARIANT_INDEX_ML_DSA_65 = ENUM_VARIANT_INDEX_ML_DSA_65;
exports.ML_DSA_65_PUBLIC_KEY_LEN = ML_DSA_65_PUBLIC_KEY_LEN;
exports.ML_DSA_65_SEED_LEN = ML_DSA_65_SEED_LEN;
exports.ML_DSA_65_SIGNATURE_LEN = ML_DSA_65_SIGNATURE_LEN;
exports.ML_DSA_65_SIGNING_KEY_LEN = ML_DSA_65_SIGNING_KEY_LEN;
exports.ML_KEM_768_CIPHERTEXT_LEN = ML_KEM_768_CIPHERTEXT_LEN;
exports.ML_KEM_768_ENCAPSULATION_KEY_LEN = ML_KEM_768_ENCAPSULATION_KEY_LEN;
exports.ML_KEM_768_SHARED_SECRET_LEN = ML_KEM_768_SHARED_SECRET_LEN;
exports.MempoolClass = MempoolClass;
exports.MlDsa65Backend = MlDsa65Backend;
exports.PQM1_ALGO_TAG_FALCON512_RESERVED = PQM1_ALGO_TAG_FALCON512_RESERVED;
exports.PQM1_ALGO_TAG_MLDSA65 = PQM1_ALGO_TAG_MLDSA65;
exports.PQM1_ALGO_TAG_MLDSA87_RESERVED = PQM1_ALGO_TAG_MLDSA87_RESERVED;
exports.PQM1_ALGO_TAG_SLHDSA128S_RESERVED = PQM1_ALGO_TAG_SLHDSA128S_RESERVED;
exports.PQM1_ENTROPY_LEN = PQM1_ENTROPY_LEN;
exports.PQM1_PAYLOAD_LEN = PQM1_PAYLOAD_LEN;
exports.PQM1_V1_MLDSA65_DOMAIN_TAG = PQM1_V1_MLDSA65_DOMAIN_TAG;
exports.PQM1_V1_MNEMONIC_WORDS = PQM1_V1_MNEMONIC_WORDS;
exports.PQM1_VERSION_V1 = PQM1_VERSION_V1;
exports.Pqm1Error = Pqm1Error;
exports.STANDARD_ALGO_NUMBER_ML_DSA_65 = STANDARD_ALGO_NUMBER_ML_DSA_65;
exports.assemblePqm1Payload = assemblePqm1Payload;
exports.bincodeDecryptHint = bincodeDecryptHint;
exports.bincodeEncryptedEnvelope = bincodeEncryptedEnvelope;
exports.bincodeNonceAad = bincodeNonceAad;
exports.bincodeSignedTransaction = bincodeSignedTransaction;
exports.buildEncryptedEnvelope = buildEncryptedEnvelope;
exports.buildEncryptedSubmission = buildEncryptedSubmission;
exports.bytesToHex = bytesToHex;
exports.concatBytes = concatBytes;
exports.derivePqm1MlDsa65SeedFromPayload = derivePqm1MlDsa65SeedFromPayload;
exports.encodeMlDsa65Opaque = encodeMlDsa65Opaque;
exports.encodeTransactionForHash = encodeTransactionForHash;
exports.encryptInnerTx = encryptInnerTx;
exports.expectBytes = expectBytes;
exports.fetchEncryptionKey = fetchEncryptionKey;
exports.generatePqm1Mnemonic = generatePqm1Mnemonic;
exports.hexToBytes = hexToBytes;
exports.mlDsa65AddressFromPublicKey = mlDsa65AddressFromPublicKey;
exports.outerSigDigest = outerSigDigest;
exports.parsePqm1Payload = parsePqm1Payload;
exports.pqm1MnemonicToAddress = pqm1MnemonicToAddress;
exports.pqm1MnemonicToMlDsa65Backend = pqm1MnemonicToMlDsa65Backend;
exports.pqm1MnemonicToMlDsa65Seed = pqm1MnemonicToMlDsa65Seed;
exports.pqm1MnemonicToPayload = pqm1MnemonicToPayload;
exports.pqm1PayloadToMnemonic = pqm1PayloadToMnemonic;
exports.submitEncryptedEnvelope = submitEncryptedEnvelope;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map