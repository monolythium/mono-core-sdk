import { keccak_256 } from "@noble/hashes/sha3.js";
import { describe, expect, it } from "vitest";
import {
  WalletAuthError,
  addressToBech32,
  canonicalWalletAuthChallengeJsonV1,
  createWalletAuthProofV1,
  decodeWalletAuthChallengeV1,
  decodeWalletAuthProofV1,
  encodeWalletAuthNonceV1,
  encodeWalletAuthProofV1,
  isValidWalletAuthProofV1,
  parseWalletAuthChallengeV1,
  verifyWalletAuthProofV1,
  walletAuthChallengeDigestV1,
  type WalletAuthChallengeV1,
  type WalletAuthProofV1,
} from "../src/index.js";
import { bytesToHex, hexToBytes, MlDsa65Backend } from "../src/crypto/index.js";

const GOLDEN_JSON =
  '{"version":"1","domain":"stele.example:8443","origin":"https://stele.example:8443","uri":"https://stele.example:8443/","address":"mono1dytvzzug96qtr0k09em5qm95hqn83cdyag8k3u","chainId":"1337","genesisHash":"0xabababababababababababababababababababababababababababababababab","nonce":"WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlo","issuedAt":"2030-01-02T03:04:05.006Z","expirationTime":"2030-01-02T03:07:05.006Z","scopes":["booking:write","services:read","stele:web:session"]}';
const GOLDEN_DIGEST = "0x3f303dca413a7aadee6fb77d06b7aa69727fc602e77ee1b63247ddf5429ec934";
const GOLDEN_PUBLIC_KEY_HASH = "0xbe210bfd8691cea81a1f3960179ba192743fa6b40eb9052fce6038472d762282";
const GOLDEN_SIGNATURE_HASH = "0x688fd39a62a5bb1613bf12bf34a2497ef42cee8732bdeaf163401b7a5aadc924";
const VERIFY_AT = "2030-01-02T03:05:00.000Z";

function backend(): MlDsa65Backend {
  return MlDsa65Backend.fromSeed(new Uint8Array(32).fill(7));
}

function challenge(signer = backend()): WalletAuthChallengeV1 {
  return {
    version: "1",
    domain: "stele.example:8443",
    origin: "https://stele.example:8443",
    uri: "https://stele.example:8443/",
    address: addressToBech32(signer.addressBytes()),
    chainId: "1337",
    genesisHash: `0x${"ab".repeat(32)}`,
    nonce: encodeWalletAuthNonceV1(new Uint8Array(32).fill(0x5a)),
    issuedAt: "2030-01-02T03:04:05.006Z",
    expirationTime: "2030-01-02T03:07:05.006Z",
    scopes: ["booking:write", "services:read", "stele:web:session"],
  };
}

function expectCode(fn: () => unknown, code: WalletAuthError["code"]): void {
  try {
    fn();
    throw new Error("expected wallet auth error");
  } catch (error) {
    expect(error).toBeInstanceOf(WalletAuthError);
    expect((error as WalletAuthError).code).toBe(code);
  }
}

describe("wallet auth V1", () => {
  it("pins cross-language canonical JSON, digest, key, and deterministic signature vectors", () => {
    const signer = backend();
    const value = challenge(signer);
    expect(canonicalWalletAuthChallengeJsonV1(value)).toBe(GOLDEN_JSON);
    expect(bytesToHex(walletAuthChallengeDigestV1(value))).toBe(GOLDEN_DIGEST);

    const proof = createWalletAuthProofV1(value, signer);
    expect(bytesToHex(keccak_256(hexToBytes(proof.publicKey)))).toBe(GOLDEN_PUBLIC_KEY_HASH);
    expect(bytesToHex(keccak_256(hexToBytes(proof.signature)))).toBe(GOLDEN_SIGNATURE_HASH);
    expect(verifyWalletAuthProofV1(proof, { now: VERIFY_AT })).toEqual(proof);
  });

  it("round-trips only canonical challenge and proof JSON", () => {
    const signer = backend();
    const value = challenge(signer);
    expect(decodeWalletAuthChallengeV1(GOLDEN_JSON)).toEqual(value);

    const proof = createWalletAuthProofV1(value, signer);
    const encodedProof = encodeWalletAuthProofV1(proof);
    expect(decodeWalletAuthProofV1(encodedProof)).toEqual(proof);

    const reorderedChallenge = JSON.stringify({
      domain: value.domain,
      version: value.version,
      origin: value.origin,
      uri: value.uri,
      address: value.address,
      chainId: value.chainId,
      genesisHash: value.genesisHash,
      nonce: value.nonce,
      issuedAt: value.issuedAt,
      expirationTime: value.expirationTime,
      scopes: value.scopes,
    });
    expectCode(() => decodeWalletAuthChallengeV1(reorderedChallenge), "non_canonical");
    const reorderedProof = JSON.stringify({
      algorithm: proof.algorithm,
      challenge: proof.challenge,
      publicKey: proof.publicKey,
      signature: proof.signature,
    });
    expectCode(() => decodeWalletAuthProofV1(reorderedProof), "non_canonical");
  });

  it("rejects challenge tampering and signature tampering", () => {
    const proof = createWalletAuthProofV1(challenge(), backend());
    const alteredChallenge: WalletAuthProofV1 = {
      ...proof,
      challenge: { ...proof.challenge, chainId: "1338" },
    };
    expectCode(() => verifyWalletAuthProofV1(alteredChallenge, { now: VERIFY_AT }), "signature_invalid");

    const signature = hexToBytes(proof.signature);
    signature[100] ^= 0x01;
    expectCode(
      () => verifyWalletAuthProofV1({ ...proof, signature: bytesToHex(signature) }, { now: VERIFY_AT }),
      "signature_invalid",
    );
    expect(isValidWalletAuthProofV1(alteredChallenge, { now: VERIFY_AT })).toBe(false);
  });

  it("checks public-key address binding before signature verification", () => {
    const signer = backend();
    const proof = createWalletAuthProofV1(challenge(signer), signer);
    const other = MlDsa65Backend.fromSeed(new Uint8Array(32).fill(8));
    const mismatched = { ...proof, publicKey: bytesToHex(other.publicKey()) };
    expectCode(() => verifyWalletAuthProofV1(mismatched, { now: VERIFY_AT }), "address_mismatch");

    const wrongChallenge = { ...challenge(signer), address: addressToBech32(other.addressBytes()) };
    expectCode(() => createWalletAuthProofV1(wrongChallenge, signer), "address_mismatch");
  });

  it("rejects malformed and non-canonical challenge fields", () => {
    const value = challenge();
    const maxUint256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    expect(parseWalletAuthChallengeV1({ ...value, chainId: maxUint256 }).chainId).toBe(maxUint256);
    const cases: Array<[unknown, WalletAuthError["code"]]> = [
      [{ ...value, extra: true }, "invalid_object"],
      [{ ...value, version: 1 }, "invalid_field"],
      [{ ...value, domain: "STELE.example:8443" }, "non_canonical"],
      [{ ...value, origin: "https://stele.example:443" }, "non_canonical"],
      [{ ...value, uri: "https://stele.example:8443/login" }, "non_canonical"],
      [{ ...value, chainId: "01337" }, "non_canonical"],
      [
        {
          ...value,
          chainId: "115792089237316195423570985008687907853269984665640564039457584007913129639936",
        },
        "non_canonical",
      ],
      [{ ...value, chainId: "9".repeat(100_000) }, "invalid_field"],
      [{ ...value, genesisHash: `0x${"AB".repeat(32)}` }, "non_canonical"],
      [{ ...value, nonce: `${value.nonce}=` }, "invalid_field"],
      [{ ...value, nonce: `${value.nonce.slice(0, -1)}B` }, "non_canonical"],
      [{ ...value, issuedAt: "2030-01-02T03:04:05Z" }, "non_canonical"],
      [{ ...value, issuedAt: "2030-02-30T03:04:05.006Z" }, "non_canonical"],
      [{ ...value, expirationTime: "2030-01-02T03:08:05.007Z" }, "invalid_field"],
      [{ ...value, scopes: ["services:read", "booking:write"] }, "non_canonical"],
      [{ ...value, scopes: ["services:read", "services:read"] }, "non_canonical"],
      [{ ...value, scopes: ["contains space"] }, "invalid_field"],
      [{ ...value, scopes: [] }, "invalid_field"],
    ];
    for (const [input, code] of cases) expectCode(() => parseWalletAuthChallengeV1(input), code);
  });

  it("rejects malformed proof framing and enforces freshness", () => {
    const proof = createWalletAuthProofV1(challenge(), backend());
    expectCode(() => verifyWalletAuthProofV1({ ...proof, extra: true }, { now: VERIFY_AT }), "invalid_object");
    expectCode(
      () => verifyWalletAuthProofV1({ ...proof, algorithm: "ML-DSA-65" }, { now: VERIFY_AT }),
      "invalid_field",
    );
    expectCode(
      () => verifyWalletAuthProofV1({ ...proof, publicKey: proof.publicKey.toUpperCase() }, { now: VERIFY_AT }),
      "non_canonical",
    );
    expectCode(
      () => verifyWalletAuthProofV1({ ...proof, signature: proof.signature.slice(0, -2) }, { now: VERIFY_AT }),
      "non_canonical",
    );
    expectCode(() => verifyWalletAuthProofV1(proof, { now: "2030-01-02T03:04:00.000Z" }), "not_yet_valid");
    expectCode(() => verifyWalletAuthProofV1(proof, { now: "2030-01-02T03:07:06.000Z" }), "expired");
    expect(verifyWalletAuthProofV1(proof, {
      now: "2030-01-02T03:07:06.000Z",
      clockSkewSeconds: 1,
    })).toEqual(proof);
    expectCode(
      () => verifyWalletAuthProofV1(proof, { now: VERIFY_AT, clockSkewSeconds: 31 }),
      "invalid_field",
    );
  });

  it("rejects oversized input before expensive parsing", () => {
    const value = challenge();
    expectCode(
      () => parseWalletAuthChallengeV1({ ...value, origin: `https://${"a".repeat(100_000)}` }),
      "invalid_field",
    );
    expectCode(
      () => parseWalletAuthChallengeV1({ ...value, scopes: ["a".repeat(100_000)] }),
      "invalid_field",
    );
    expectCode(() => decodeWalletAuthChallengeV1(" ".repeat(8_193)), "invalid_object");
    expectCode(() => decodeWalletAuthProofV1(" ".repeat(24_577)), "invalid_object");
  });

  it("rejects stale challenges before attempting invalid signatures", () => {
    const proof = createWalletAuthProofV1(challenge(), backend());
    const signature = hexToBytes(proof.signature);
    signature[0] ^= 0x01;
    const invalidSignature = { ...proof, signature: bytesToHex(signature) };

    expectCode(
      () => verifyWalletAuthProofV1(invalidSignature, { now: "2030-01-02T03:03:00.000Z" }),
      "not_yet_valid",
    );
    expectCode(
      () => verifyWalletAuthProofV1(invalidSignature, { now: "2030-01-02T03:08:00.000Z" }),
      "expired",
    );
    expectCode(() => verifyWalletAuthProofV1(invalidSignature, { now: VERIFY_AT }), "signature_invalid");
  });
});
