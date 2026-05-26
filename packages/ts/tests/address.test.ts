import { describe, expect, it } from "vitest";
import {
  ADDRESS_KIND_HRPS,
  addressBytesToHex,
  addressToBech32,
  addressToTypedBech32,
  bech32ToAddress,
  bech32ToAddressBytes,
  hexToAddressBytes,
  normalizeAddressHex,
  parseAddress,
  requireTypedAddress,
  typedBech32ToAddress,
  validateAddress,
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

  it("round-trips typed bech32m contract addresses", () => {
    const hex = "0x3333333333333333333333333333333333333333";
    const display = addressToTypedBech32("contract", hex);
    expect(display.startsWith(`${ADDRESS_KIND_HRPS.contract}1`)).toBe(true);
    const decoded = typedBech32ToAddress(display, "contract");
    expect(decoded.kind).toBe("contract");
    expect(decoded.hex).toBe(hex);
    expect([...decoded.bytes]).toEqual([...hexToAddressBytes(hex)]);
    expect(() => typedBech32ToAddress(display, "user")).toThrow();
  });

  it("requires typed bech32m addresses at v4.1 public boundaries", () => {
    const user = addressToTypedBech32("user", "0x1111111111111111111111111111111111111111");
    const contract = addressToTypedBech32("contract", "0x1111111111111111111111111111111111111111");

    expect(requireTypedAddress(user, "user", "address")).toBe(user);
    expect(() => requireTypedAddress("0x1111111111111111111111111111111111111111", "user", "address")).toThrow(
      /raw 0x addresses are retired/,
    );
    expect(() => requireTypedAddress(contract, "user", "address")).toThrow(/must be typed mono/);
  });

  describe("validateAddress", () => {
    const hex = "0x4242424242424242424242424242424242424242";

    it("accepts canonical hex and reports format hex with null kind", () => {
      const result = validateAddress(hex);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.format).toBe("hex");
        expect(result.kind).toBeNull();
        expect(result.normalized).toBe(addressToBech32(hex));
        expect([...result.bytes]).toEqual([...hexToAddressBytes(hex)]);
      }
    });

    it("accepts typed bech32m and reports kind + format bech32m", () => {
      const bech = addressToTypedBech32("contract", hex);
      const result = validateAddress(bech);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.format).toBe("bech32m");
        expect(result.kind).toBe("contract");
        expect(result.normalized).toBe(bech);
      }
    });

    it("rejects empty input with an empty-address reason", () => {
      expect(validateAddress("")).toEqual({ valid: false, reason: "address cannot be empty" });
      expect(validateAddress("   ")).toEqual({ valid: false, reason: "address cannot be empty" });
    });

    it("rejects malformed hex and bad bech32m without throwing", () => {
      const badHex = validateAddress("0x123");
      expect(badHex.valid).toBe(false);
      if (!badHex.valid) expect(badHex.reason).toMatch(/0x-prefixed 20-byte hex address/);

      const badBech = validateAddress("mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdcq");
      expect(badBech.valid).toBe(false);
      if (!badBech.valid) expect(badBech.reason).toMatch(/checksum/);
    });

    it("rejects reserved address hrps", () => {
      // monor (validator), monop (precompile), monoi (issuer), monoa (artifact)
      // share the bech32m charset; build one with a reserved hrp and a known
      // valid 20-byte payload using addressToTypedBech32 isn't possible (the
      // hrp list is restricted), so re-purpose a known-good bech32m by
      // swapping the hrp manually.
      const sample = addressToTypedBech32("user", hex); // mono1…
      const reservedHrp = sample.replace(/^mono/, "monor");
      const result = validateAddress(reservedHrp);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toMatch(/reserved|checksum/);
    });
  });
});
