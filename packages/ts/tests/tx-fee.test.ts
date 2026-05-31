import { describe, expect, it } from "vitest";
import { transactionFeeExposure } from "../src/index.js";
import type { NativeReceiptFee } from "../src/index.js";

function nativeFee(extra: Partial<NativeReceiptFee> = {}): NativeReceiptFee {
  return {
    total_lythoshi: "440000000000",
    cycles_used: 44,
    base_price_per_cycle_lythoshi: "10000000000",
    state_io_units: 2,
    state_io_price_per_unit_lythoshi: "0",
    priority_tip_lythoshi: "0",
    ...extra,
  };
}

describe("transactionFeeExposure", () => {
  it("surfaces total_lythoshi verbatim and sums base price + tip per unit", () => {
    const exposure = transactionFeeExposure(
      nativeFee({
        total_lythoshi: "550000000000",
        base_price_per_cycle_lythoshi: "10000000000",
        priority_tip_lythoshi: "2500000000",
      }),
    );

    expect(exposure.feeLythoshi).toBe("550000000000");
    expect(exposure.effectiveGasPricePerUnit).toBe("12500000000");
  });

  it("returns the base price when there is no priority tip", () => {
    const exposure = transactionFeeExposure(nativeFee({ priority_tip_lythoshi: "0" }));

    expect(exposure.feeLythoshi).toBe("440000000000");
    expect(exposure.effectiveGasPricePerUnit).toBe("10000000000");
  });

  it("handles large lythoshi values without precision loss", () => {
    const exposure = transactionFeeExposure(
      nativeFee({
        total_lythoshi: "123456789012345678901234567890",
        base_price_per_cycle_lythoshi: "99999999999999999999",
        priority_tip_lythoshi: "1",
      }),
    );

    expect(exposure.feeLythoshi).toBe("123456789012345678901234567890");
    expect(exposure.effectiveGasPricePerUnit).toBe("100000000000000000000");
  });

  it("rejects non-integer fee fields", () => {
    expect(() =>
      transactionFeeExposure(nativeFee({ base_price_per_cycle_lythoshi: "not-a-number" })),
    ).toThrowError(/base_price_per_cycle_lythoshi is not an integer/);
    expect(() =>
      transactionFeeExposure(nativeFee({ priority_tip_lythoshi: "1.5" })),
    ).toThrowError(/priority_tip_lythoshi is not an integer/);
    expect(() =>
      transactionFeeExposure(nativeFee({ total_lythoshi: "" })),
    ).toThrowError(/total_lythoshi is not an integer/);
  });
});
