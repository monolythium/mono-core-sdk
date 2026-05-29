import { describe, expect, it } from "vitest";
import { bridgeDrainRemaining, type BridgeBreakerState } from "../src/index.js";

describe("bridge breaker state (MB-2)", () => {
  it("computes the drain-cap remaining amount, floored at zero", () => {
    expect(bridgeDrainRemaining("1000", "250")).toBe("750");
    expect(bridgeDrainRemaining("1000", "1000")).toBe("0");
    // Over-drained never goes negative.
    expect(bridgeDrainRemaining("1000", "1500")).toBe("0");
    // A disabled cap (0) returns null.
    expect(bridgeDrainRemaining("0", "0")).toBeNull();
    // Full uint256 width is handled via BigInt.
    const cap = (2n ** 200n).toString();
    expect(bridgeDrainRemaining(cap, "1")).toBe((2n ** 200n - 1n).toString());
  });

  it("models the breaker read shape (drain cap + pause + cooldown)", () => {
    const state: BridgeBreakerState = {
      bridgeId: `0x${"ab".repeat(32)}`,
      paused: true,
      pausedAt: "100",
      resumeCooldownBlocks: "300",
      routeFinalityBlocks: "64",
      adminLockedAtBlock: "50",
      drainCap: {
        capPerWindow: "1000000",
        windowBlocks: "7200",
        currentBucket: "12",
        drained: "250000",
        remaining: bridgeDrainRemaining("1000000", "250000"),
      },
    };
    expect(state.paused).toBe(true);
    expect(state.drainCap?.remaining).toBe("750000");
  });
});
