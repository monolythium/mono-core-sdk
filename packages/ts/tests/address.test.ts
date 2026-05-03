import { describe, expect, it } from "vitest";
import {
  addressBytesToHex,
  addressToBech32,
  bech32ToAddress,
  bech32ToAddressBytes,
  hexToAddressBytes,
  normalizeAddressHex,
  parseAddress,
} from "../src/index.js";

describe("address helpers", () => {
  it("round-trips the mono-core bech32m golden vector", () => {
    const hex = "0x123456789abcdef0112233445566778899aabbcc";
    const bech32 = addressToBech32(hex);
    expect(bech32).toBe("mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4");
    expect(bech32ToAddress(bech32)).toBe(hex);
    expect(addressBytesToHex(bech32ToAddressBytes(bech32))).toBe(hex);
  });

  it("normalizes upper-case hex to lower-case hex", () => {
    expect(normalizeAddressHex("0xABABABABABABABABABABABABABABABABABABABAB")).toBe(
      "0xabababababababababababababababababababab",
    );
  });

  it("parses hex or mono1 display addresses to the same bytes", () => {
    const hex = "0x4242424242424242424242424242424242424242";
    const bech32 = addressToBech32(hex);
    expect([...parseAddress(hex)]).toEqual([...hexToAddressBytes(hex)]);
    expect([...parseAddress(bech32)]).toEqual([...hexToAddressBytes(hex)]);
  });

  it("rejects invalid checksum", () => {
    expect(() => bech32ToAddress("mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdcq")).toThrow();
  });
});
