import { describe, expect, it } from "vitest";
import {
  PRECOMPILE_ADDRESSES,
  PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN,
  PUBKEY_REGISTRY_SELECTORS,
  decodeHasPubkeyReturn,
  decodeLookupPubkeyReturn,
  encodeHasPubkeyCalldata,
  encodeLookupPubkeyCalldata,
  encodeRegisterPubkeyCalldata,
  pubkeyRegistryAddressHex,
} from "../src/index.js";

describe("pubkey registry ABI helpers", () => {
  it("exports selectors pinned to mono-core", () => {
    expect(PUBKEY_REGISTRY_SELECTORS).toEqual({
      registerPubkey: "0x5fe984e7",
      lookupPubkey: "0x87c42001",
      hasPubkey: "0x01c0d167",
    });
  });

  it("exports the pubkey-registry precompile address", () => {
    expect(PRECOMPILE_ADDRESSES.PUBKEY_REGISTRY).toBe(
      "0x000000000000000000000000000000000000110D",
    );
    expect(pubkeyRegistryAddressHex()).toBe("0x000000000000000000000000000000000000110d");
  });

  it("encodes registerPubkey(bytes) calldata", () => {
    const pubkey = new Uint8Array(PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN).fill(0xab);
    const calldata = encodeRegisterPubkeyCalldata(pubkey);
    expect(calldata.startsWith(PUBKEY_REGISTRY_SELECTORS.registerPubkey)).toBe(true);
    expect((calldata.length - 2) / 2).toBe(4 + 32 + 32 + PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN);
  });

  it("encodes lookup and hasPubkey one-address calls", () => {
    const addr = "0x1111111111111111111111111111111111111111";
    expect(encodeLookupPubkeyCalldata(addr).startsWith(PUBKEY_REGISTRY_SELECTORS.lookupPubkey)).toBe(true);
    expect(encodeHasPubkeyCalldata(addr).startsWith(PUBKEY_REGISTRY_SELECTORS.hasPubkey)).toBe(true);
    expect((encodeLookupPubkeyCalldata(addr).length - 2) / 2).toBe(36);
  });

  it("rejects wrong pubkey length", () => {
    expect(() => encodeRegisterPubkeyCalldata(new Uint8Array(1))).toThrow();
  });

  it("decodes lookupPubkey return data", () => {
    const pubkey = new Uint8Array(PUBKEY_REGISTRY_ML_DSA_65_PUBLIC_KEY_LEN).fill(0xab);
    const encoded = concatHex(
      word(64n),
      word(1_234_567n),
      word(BigInt(pubkey.length)),
      bytesToHex(pubkey),
    );
    const decoded = decodeLookupPubkeyReturn(encoded);
    expect(decoded.setBlock).toBe(1_234_567n);
    expect([...decoded.pubkey]).toEqual([...pubkey]);
  });

  it("decodes hasPubkey bool return data", () => {
    expect(decodeHasPubkeyReturn(word(0n))).toBe(false);
    expect(decodeHasPubkeyReturn(word(1n))).toBe(true);
    expect(() => decodeHasPubkeyReturn(word(2n))).toThrow();
  });
});

function word(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function concatHex(...parts: string[]): string {
  return `0x${parts.map((p) => p.replace(/^0x/i, "")).join("")}`;
}
