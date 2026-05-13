/**
 * Surface contract for canonical chain constants.
 *
 * Other surfaces (website, monoscan, wallets) import `BURN_ADDR`,
 * `PRECOMPILE_ADDRESSES`, and `MONOLYTHIUM_TESTNET_CHAIN_ID` from the
 * package root. This spec asserts:
 *
 * 1. The constants are reachable through the package's public entry
 *    (`@monolythium/core-sdk`) — not via deep paths.
 * 2. Each address is a `0x`-prefixed 20-byte hex string.
 * 3. The address values match what `mono-core/crates/runtime/src/precompiles.rs`
 *    wires at registration time.
 *
 * If a surface fails because one of these constants moved, fix the SDK
 * here, not in the consumer — the SDK is the single source of truth.
 */

import { describe, expect, it } from "vitest";
import {
  BURN_ADDR,
  MONOLYTHIUM_TESTNET_CHAIN_ID,
  PRECOMPILE_ADDRESSES,
  type PrecompileAddress,
  type PrecompileName,
} from "../src/index.js";

const HEX_20_BYTE_RE = /^0x[0-9a-fA-F]{40}$/;

describe("BURN_ADDR", () => {
  it("is exported from the package root", () => {
    expect(typeof BURN_ADDR).toBe("string");
  });

  it("is the canonical zero address per Law §5.2", () => {
    expect(BURN_ADDR).toBe("0x0000000000000000000000000000000000000000");
  });

  it("matches the 20-byte hex shape", () => {
    expect(BURN_ADDR).toMatch(HEX_20_BYTE_RE);
  });
});

describe("MONOLYTHIUM_TESTNET_CHAIN_ID", () => {
  it("is exported from the package root", () => {
    expect(typeof MONOLYTHIUM_TESTNET_CHAIN_ID).toBe("bigint");
  });

  it("is 69420 per Law §13.1", () => {
    expect(MONOLYTHIUM_TESTNET_CHAIN_ID).toBe(69420n);
  });
});

describe("PRECOMPILE_ADDRESSES", () => {
  it("is exported from the package root", () => {
    expect(typeof PRECOMPILE_ADDRESSES).toBe("object");
    expect(PRECOMPILE_ADDRESSES).not.toBeNull();
  });

  it("every entry is a 20-byte hex address", () => {
    for (const [name, addr] of Object.entries(PRECOMPILE_ADDRESSES)) {
      expect(addr, `${name} must match 20-byte hex`).toMatch(HEX_20_BYTE_RE);
    }
  });

  it("matches the canonical mono-core runtime layout (Law §5.4)", () => {
    // Hand-asserted from
    //   mono-core/crates/runtime/src/precompiles.rs (header table)
    //   mono-core/crates/runtime/tests/precompile_wiring.rs WIRED_SLOTS
    // Any drift here is a chain-vs-SDK mismatch — not a test bug.
    expect(PRECOMPILE_ADDRESSES.TOKEN_FACTORY).toBe(
      "0x0000000000000000000000000000000000001000",
    );
    expect(PRECOMPILE_ADDRESSES.CLOB).toBe(
      "0x0000000000000000000000000000000000001001",
    );
    expect(PRECOMPILE_ADDRESSES.AGENT).toBe(
      "0x0000000000000000000000000000000000001003",
    );
    expect(PRECOMPILE_ADDRESSES.PRIVACY).toBe(
      "0x0000000000000000000000000000000000001004",
    );
    expect(PRECOMPILE_ADDRESSES.NODE_REGISTRY).toBe(
      "0x0000000000000000000000000000000000001005",
    );
    expect(PRECOMPILE_ADDRESSES.IBC).toBe(
      "0x0000000000000000000000000000000000001007",
    );
    expect(PRECOMPILE_ADDRESSES.BRIDGE).toBe(
      "0x0000000000000000000000000000000000001008",
    );
    expect(PRECOMPILE_ADDRESSES.ORACLE).toBe(
      "0x0000000000000000000000000000000000001009",
    );
    expect(PRECOMPILE_ADDRESSES.DELEGATION).toBe(
      "0x000000000000000000000000000000000000100A",
    );
    expect(PRECOMPILE_ADDRESSES.EMERGENCY_KEY).toBe(
      "0x0000000000000000000000000000000000001100",
    );
    expect(PRECOMPILE_ADDRESSES.VRF).toBe(
      "0x0000000000000000000000000000000000001101",
    );
    expect(PRECOMPILE_ADDRESSES.STREAMING_PAYMENTS).toBe(
      "0x0000000000000000000000000000000000001102",
    );
    expect(PRECOMPILE_ADDRESSES.NAME_REGISTRY).toBe(
      "0x0000000000000000000000000000000000001103",
    );
    expect(PRECOMPILE_ADDRESSES.CLUSTER_NAME_REGISTRY).toBe(
      "0x0000000000000000000000000000000000001104",
    );
    expect(PRECOMPILE_ADDRESSES.ATTESTATION).toBe(
      "0x0000000000000000000000000000000000001105",
    );
    expect(PRECOMPILE_ADDRESSES.CONSENT).toBe(
      "0x0000000000000000000000000000000000001106",
    );
    expect(PRECOMPILE_ADDRESSES.ISSUER_REGISTRY).toBe(
      "0x0000000000000000000000000000000000001107",
    );
    expect(PRECOMPILE_ADDRESSES.DISCOVERY).toBe(
      "0x0000000000000000000000000000000000001108",
    );
    expect(PRECOMPILE_ADDRESSES.AVAILABILITY).toBe(
      "0x0000000000000000000000000000000000001109",
    );
    expect(PRECOMPILE_ADDRESSES.ESCROW).toBe(
      "0x000000000000000000000000000000000000110A",
    );
    expect(PRECOMPILE_ADDRESSES.ARBITER_REGISTRY).toBe(
      "0x000000000000000000000000000000000000110B",
    );
    expect(PRECOMPILE_ADDRESSES.SPENDING_POLICY).toBe(
      "0x000000000000000000000000000000000000110C",
    );
    expect(PRECOMPILE_ADDRESSES.PUBKEY_REGISTRY).toBe(
      "0x000000000000000000000000000000000000110D",
    );
  });

  it("does not expose application surfaces outside whitepaper v4.0", () => {
    const values = Object.values(PRECOMPILE_ADDRESSES) as string[];
    expect(values).not.toContain("0x0000000000000000000000000000000000001002");
    expect(values).not.toContain("0x0000000000000000000000000000000000001006");
  });

  it("typed name + address narrowing flows through the public API", () => {
    const name: PrecompileName = "CLOB";
    const addr: PrecompileAddress = PRECOMPILE_ADDRESSES[name];
    expect(addr).toBe("0x0000000000000000000000000000000000001001");
  });
});
