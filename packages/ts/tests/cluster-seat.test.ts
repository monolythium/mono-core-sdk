import { blake3 } from "@noble/hashes/blake3.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEAT_EXECUTION_UNIT_LIMIT,
  NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
  NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
  NODE_REGISTRY_SEAT_KIND_ACTIVE,
  NODE_REGISTRY_SEAT_KIND_STANDBY,
  NODE_REGISTRY_SELECTORS,
  NODE_REGISTRY_TAG_CLUSTER_SEAT,
  PRECOMPILE_ADDRESSES,
  SEAT_ADVERTISED_EVENT_SIG,
  SEAT_APPLIED_EVENT_SIG,
  SEAT_CLOSED_EVENT_SIG,
  SEAT_FILLED_EVENT_SIG,
  SEAT_KINDS,
  SEAT_STATUS_CODES,
  buildAdvertiseSeatTxFields,
  buildApplyForSeatTxFields,
  buildCloseSeatTxFields,
  buildVoteSeatAdmitTxFields,
  buildWithdrawSeatApplicationTxFields,
  decodeSeatAdvertisedEvent,
  decodeSeatAppliedEvent,
  decodeSeatClosedEvent,
  decodeSeatFilledEvent,
  deriveSeatApplicationKey,
  encodeAdvertiseSeatCalldata,
  encodeApplyForSeatCalldata,
  encodeCloseSeatCalldata,
  encodeVoteSeatAdmitCalldata,
  encodeWithdrawSeatApplicationCalldata,
  openSeatFromAdvertised,
  resolveSeatExecutionFee,
  seatKindFromByte,
  seatKindToByte,
  seatStatusFromByte,
} from "../src/index.js";

// --------------------------------------------------------------------
// Golden vectors. The selector and event-topic0 values are independently
// computed `keccak256(signature)` truncations of the exact canonical
// signatures in mono-core `node-registry/src/abi.rs` + `events.rs`. They
// are hard-pinned (NOT recomputed from the SDK) so a drift between the
// SDK and the on-chain ABI fails the suite.
// --------------------------------------------------------------------
const SELECTOR_GOLDEN = {
  advertiseSeat: "0x5cc18158",
  applyForSeat: "0x04ca87fe",
  voteSeatAdmit: "0x4ca33428",
  withdrawSeatApplication: "0x2f226496",
  closeSeat: "0x52aa9b9a",
} as const;

const TOPIC0_GOLDEN = {
  SeatAdvertised: "0x84318757131a1c07dd36c47510e5a2c5956e37726e956079f0753a71b75c3faa",
  SeatApplied: "0x74a8b247dda68ace7f46340b8061e3494a7055740c2fc1fd057f2b288670d4bc",
  SeatFilled: "0x6440c790006f5ba4b62fe3a752cfcb3680c8c2588e170ddf9000800f3d27720f",
  SeatClosed: "0x4ef92a1e15b65f60ce6a55aed42a9dc5c636219fdb284f06f3c028c2a90bc306",
} as const;

const PUBKEY_LEN = NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES;

function hexBytes(hex: string): Uint8Array {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function topic0(sig: string): string {
  return `0x${[...keccak_256(new TextEncoder().encode(sig))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function word(value: number | bigint, width = 32): Uint8Array {
  const out = new Uint8Array(32);
  let n = BigInt(value);
  for (let i = 31; i >= 32 - width; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

const ZERO_FEE = { maxFeePerGas: 1n, maxPriorityFeePerGas: 1n };

describe("open-seat marketplace — selectors match the on-chain ABI", () => {
  it("the 5 seat selectors equal the pinned keccak256 truncations", () => {
    expect(NODE_REGISTRY_SELECTORS.advertiseSeat).toBe(SELECTOR_GOLDEN.advertiseSeat);
    expect(NODE_REGISTRY_SELECTORS.applyForSeat).toBe(SELECTOR_GOLDEN.applyForSeat);
    expect(NODE_REGISTRY_SELECTORS.voteSeatAdmit).toBe(SELECTOR_GOLDEN.voteSeatAdmit);
    expect(NODE_REGISTRY_SELECTORS.withdrawSeatApplication).toBe(
      SELECTOR_GOLDEN.withdrawSeatApplication,
    );
    expect(NODE_REGISTRY_SELECTORS.closeSeat).toBe(SELECTOR_GOLDEN.closeSeat);
  });

  it("the pinned selectors are the keccak256 of the canonical signatures", () => {
    const sel = (s: string) =>
      `0x${[...keccak_256(new TextEncoder().encode(s)).slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    expect(sel("advertiseSeat(uint32,uint8,uint32,uint128,uint32,bytes32)")).toBe(
      SELECTOR_GOLDEN.advertiseSeat,
    );
    expect(sel("applyForSeat(uint32,uint32,bytes)")).toBe(SELECTOR_GOLDEN.applyForSeat);
    expect(sel("voteSeatAdmit(uint32,bytes32,bytes)")).toBe(SELECTOR_GOLDEN.voteSeatAdmit);
    expect(sel("withdrawSeatApplication(uint32,bytes32)")).toBe(
      SELECTOR_GOLDEN.withdrawSeatApplication,
    );
    expect(sel("closeSeat(uint32,uint32)")).toBe(SELECTOR_GOLDEN.closeSeat);
  });

  it("the seat selectors are distinct from each other and from CJ-1 selectors", () => {
    const all = [
      NODE_REGISTRY_SELECTORS.advertiseSeat,
      NODE_REGISTRY_SELECTORS.applyForSeat,
      NODE_REGISTRY_SELECTORS.voteSeatAdmit,
      NODE_REGISTRY_SELECTORS.withdrawSeatApplication,
      NODE_REGISTRY_SELECTORS.closeSeat,
      NODE_REGISTRY_SELECTORS.requestClusterJoin,
      NODE_REGISTRY_SELECTORS.voteClusterAdmit,
      NODE_REGISTRY_SELECTORS.cancelClusterJoin,
    ];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("open-seat marketplace — event topics match the on-chain ABI", () => {
  it("the canonical signatures match mono-core events.rs", () => {
    expect(SEAT_ADVERTISED_EVENT_SIG).toBe(
      "SeatAdvertised(uint32,uint32,bytes32,uint8,uint32,uint128,uint32,bytes32)",
    );
    expect(SEAT_APPLIED_EVENT_SIG).toBe("SeatApplied(uint32,uint32,bytes32,address,uint128)");
    expect(SEAT_FILLED_EVENT_SIG).toBe("SeatFilled(uint32,uint32,bytes32,uint16,uint16)");
    expect(SEAT_CLOSED_EVENT_SIG).toBe("SeatClosed(uint32,uint32,uint8)");
  });

  it("topic0 hashes equal the pinned values", () => {
    expect(topic0(SEAT_ADVERTISED_EVENT_SIG)).toBe(TOPIC0_GOLDEN.SeatAdvertised);
    expect(topic0(SEAT_APPLIED_EVENT_SIG)).toBe(TOPIC0_GOLDEN.SeatApplied);
    expect(topic0(SEAT_FILLED_EVENT_SIG)).toBe(TOPIC0_GOLDEN.SeatFilled);
    expect(topic0(SEAT_CLOSED_EVENT_SIG)).toBe(TOPIC0_GOLDEN.SeatClosed);
  });
});

describe("open-seat marketplace — calldata encoders", () => {
  it("advertiseSeat encodes the full 6-word head byte-for-byte", () => {
    const calldata = encodeAdvertiseSeatCalldata({
      clusterId: 7,
      kind: NODE_REGISTRY_SEAT_KIND_ACTIVE,
      seatCount: 3,
      minBondLythoshi: NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
      capabilityMask: 0x9,
      termsHash: new Uint8Array(32).fill(0x11),
    });
    const expected =
      "0x5cc18158" +
      "0000000000000000000000000000000000000000000000000000000000000007" +
      "0000000000000000000000000000000000000000000000000000000000000000" +
      "0000000000000000000000000000000000000000000000000000000000000003" +
      "00000000000000000000000000000000000000000000010f0cf064dd59200000" +
      "0000000000000000000000000000000000000000000000000000000000000009" +
      "1111111111111111111111111111111111111111111111111111111111111111";
    expect(calldata).toBe(expected);
    expect(hexBytes(calldata).length).toBe(4 + 6 * 32);
  });

  it("applyForSeat mirrors the requestClusterJoin shape with an extra seatId word", () => {
    const pubkey = new Uint8Array(PUBKEY_LEN).fill(0xab);
    const calldata = encodeApplyForSeatCalldata({ clusterId: 7, seatId: 2, operatorPubkey: pubkey });
    const bytes = hexBytes(calldata);
    // selector + clusterId + seatId + offset + length + padded pubkey.
    expect(bytes.length).toBe(4 + 3 * 32 + 32 + PUBKEY_LEN);
    expect(calldata.slice(0, 10)).toBe(SELECTOR_GOLDEN.applyForSeat);
    expect(bytes.slice(4, 36)).toEqual(word(7));
    expect(bytes.slice(36, 68)).toEqual(word(2));
    // dynamic `bytes` offset = 3 words past the head start.
    expect(bytes.slice(68, 100)).toEqual(word(3 * 32));
    expect(bytes.slice(100, 132)).toEqual(word(PUBKEY_LEN));
    expect(bytes.slice(132, 132 + PUBKEY_LEN)).toEqual(pubkey);
  });

  it("voteSeatAdmit matches the voteClusterAdmit wire layout", () => {
    const appKey = new Uint8Array(32).fill(0x22);
    const voterPubkey = new Uint8Array(PUBKEY_LEN).fill(0xcd);
    const calldata = encodeVoteSeatAdmitCalldata({ clusterId: 7, appKey, voterPubkey });
    const bytes = hexBytes(calldata);
    expect(bytes.length).toBe(4 + 3 * 32 + 32 + PUBKEY_LEN);
    expect(calldata.slice(0, 10)).toBe(SELECTOR_GOLDEN.voteSeatAdmit);
    expect(bytes.slice(4, 36)).toEqual(word(7));
    expect(bytes.slice(36, 68)).toEqual(appKey);
    expect(bytes.slice(68, 100)).toEqual(word(3 * 32));
    expect(bytes.slice(100, 132)).toEqual(word(PUBKEY_LEN));
    expect(bytes.slice(132, 132 + PUBKEY_LEN)).toEqual(voterPubkey);
  });

  it("withdrawSeatApplication encodes a flat 2-word head byte-for-byte", () => {
    const calldata = encodeWithdrawSeatApplicationCalldata({
      clusterId: 7,
      appKey: new Uint8Array(32).fill(0x22),
    });
    expect(calldata).toBe(
      "0x2f226496" +
        "0000000000000000000000000000000000000000000000000000000000000007" +
        "2222222222222222222222222222222222222222222222222222222222222222",
    );
  });

  it("closeSeat encodes a flat 2-word head byte-for-byte", () => {
    const calldata = encodeCloseSeatCalldata({ clusterId: 7, seatId: 2 });
    expect(calldata).toBe(
      "0x52aa9b9a" +
        "0000000000000000000000000000000000000000000000000000000000000007" +
        "0000000000000000000000000000000000000000000000000000000000000002",
    );
  });

  it("rejects an operator pubkey of the wrong width", () => {
    expect(() =>
      encodeApplyForSeatCalldata({ clusterId: 1, seatId: 1, operatorPubkey: new Uint8Array(10) }),
    ).toThrow(/operatorPubkey must be 1952 bytes/);
  });

  it("rejects an appKey of the wrong width", () => {
    expect(() =>
      encodeWithdrawSeatApplicationCalldata({ clusterId: 1, appKey: new Uint8Array(16) }),
    ).toThrow(/appKey must be 32 bytes/);
  });

  it("rejects a kind byte out of u8 range", () => {
    expect(() =>
      encodeAdvertiseSeatCalldata({
        clusterId: 1,
        kind: 300,
        seatCount: 1,
        minBondLythoshi: 0n,
        capabilityMask: 0,
        termsHash: new Uint8Array(32),
      }),
    ).toThrow(/kind/);
  });

  it("rejects a minBond above the uint128 range", () => {
    expect(() =>
      encodeAdvertiseSeatCalldata({
        clusterId: 1,
        kind: "active",
        seatCount: 1,
        minBondLythoshi: 1n << 128n,
        capabilityMask: 0,
        termsHash: new Uint8Array(32),
      }),
    ).toThrow(/minBondLythoshi must fit uint128/);
  });
});

describe("open-seat marketplace — constants and kind/status maps", () => {
  it("mirrors the on-chain economic constants", () => {
    expect(NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI).toBe(5_000n * 10n ** 18n);
    // 5,000 — NOT the legacy 50,000 design fiction.
    expect(NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI).not.toBe(50_000n * 10n ** 18n);
    expect(NODE_REGISTRY_TAG_CLUSTER_SEAT).toBe(0x32);
    expect(NODE_REGISTRY_SEAT_KIND_ACTIVE).toBe(0);
    expect(NODE_REGISTRY_SEAT_KIND_STANDBY).toBe(1);
    expect(SEAT_STATUS_CODES).toEqual({ none: 0, open: 1, filled: 2, closed: 3 });
    expect(SEAT_KINDS).toEqual(["active", "standby"]);
  });

  it("round-trips seat kinds and clamps unknown bytes to active", () => {
    expect(seatKindToByte("active")).toBe(0);
    expect(seatKindToByte("standby")).toBe(1);
    expect(seatKindFromByte(0)).toBe("active");
    expect(seatKindFromByte(1)).toBe("standby");
    expect(seatKindFromByte(9)).toBe("active");
  });

  it("decodes seat-status bytes and clamps unknown to none", () => {
    expect(seatStatusFromByte(1)).toBe("open");
    expect(seatStatusFromByte(2)).toBe("filled");
    expect(seatStatusFromByte(3)).toBe("closed");
    expect(seatStatusFromByte(0)).toBe("none");
    expect(seatStatusFromByte(42)).toBe("none");
  });

  it("derives the application key as BLAKE3(consensusPubkey)", () => {
    const pubkey = new Uint8Array(PUBKEY_LEN).fill(0x5a);
    const expected = `0x${[...blake3(pubkey)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    expect(deriveSeatApplicationKey(pubkey)).toBe(expected);
  });
});

describe("open-seat marketplace — event decoders", () => {
  it("decodes a SeatAdvertised log round-trip", () => {
    const advertiser = new Uint8Array(32).fill(0x3a);
    const terms = new Uint8Array(32).fill(0x7b);
    const data = new Uint8Array([
      ...advertiser,
      ...word(NODE_REGISTRY_SEAT_KIND_STANDBY),
      ...word(4),
      ...word(NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI, 16),
      ...word(0x9),
      ...terms,
    ]);
    const decoded = decodeSeatAdvertisedEvent(
      [TOPIC0_GOLDEN.SeatAdvertised, word(7), word(2)],
      data,
    );
    expect(decoded).toEqual({
      clusterId: 7,
      seatId: 2,
      advertiser: `0x${"3a".repeat(32)}`,
      kind: 1,
      seatCount: 4,
      minBondLythoshi: NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
      capabilityMask: 0x9,
      termsHash: `0x${"7b".repeat(32)}`,
    });
    expect(openSeatFromAdvertised(decoded)).toEqual({
      clusterId: 7,
      seatId: 2,
      advertiser: `0x${"3a".repeat(32)}`,
      kind: "standby",
      seatCount: 4,
      filledCount: 0,
      minBondLythoshi: NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
      capabilityMask: 0x9,
      termsHash: `0x${"7b".repeat(32)}`,
      status: "open",
    });
  });

  it("decodes a SeatApplied log (operatorId indexed, owner + bond in data)", () => {
    const operatorId = new Uint8Array(32).fill(0x44);
    const owner = new Uint8Array(20).fill(0x55);
    const ownerWord = new Uint8Array(32);
    ownerWord.set(owner, 12);
    const data = new Uint8Array([
      ...ownerWord,
      ...word(NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI, 16),
    ]);
    const decoded = decodeSeatAppliedEvent(
      [TOPIC0_GOLDEN.SeatApplied, word(7), word(2), operatorId],
      data,
    );
    expect(decoded).toEqual({
      clusterId: 7,
      seatId: 2,
      operatorId: `0x${"44".repeat(32)}`,
      owner: `0x${"55".repeat(20)}`,
      bondLythoshi: NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
    });
  });

  it("decodes a SeatFilled log (filledCount, seatCount)", () => {
    const operatorId = new Uint8Array(32).fill(0x66);
    const data = new Uint8Array([...word(3), ...word(10)]);
    const decoded = decodeSeatFilledEvent(
      [TOPIC0_GOLDEN.SeatFilled, word(7), word(2), operatorId],
      data,
    );
    expect(decoded).toEqual({
      clusterId: 7,
      seatId: 2,
      operatorId: `0x${"66".repeat(32)}`,
      filledCount: 3,
      seatCount: 10,
    });
  });

  it("decodes a SeatClosed log (status byte)", () => {
    const decoded = decodeSeatClosedEvent(
      [TOPIC0_GOLDEN.SeatClosed, word(7), word(2)],
      word(SEAT_STATUS_CODES.closed),
    );
    expect(decoded).toEqual({ clusterId: 7, seatId: 2, status: 3 });
  });

  it("rejects a log whose topic0 does not match the event signature", () => {
    expect(() =>
      decodeSeatClosedEvent([new Uint8Array(32), word(7), word(2)], word(3)),
    ).toThrow(/unexpected topic0/);
  });

  it("rejects a SeatApplied log with the wrong topic count", () => {
    expect(() =>
      decodeSeatAppliedEvent([TOPIC0_GOLDEN.SeatApplied, word(7)], new Uint8Array(64)),
    ).toThrow(/expects 4 topics/);
  });
});

describe("open-seat marketplace — transaction builders", () => {
  const NODE_REGISTRY = PRECOMPILE_ADDRESSES.NODE_REGISTRY.toLowerCase();

  it("builds an advertiseSeat tx (non-payable, registry-targeted)", () => {
    const tx = buildAdvertiseSeatTxFields({
      chainId: 69420,
      nonce: 1,
      fee: ZERO_FEE,
      clusterId: 7,
      kind: "active",
      seatCount: 3,
      minBondLythoshi: NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
      capabilityMask: 0x9,
      termsHash: new Uint8Array(32).fill(0x11),
    });
    expect(tx.to).toBe(NODE_REGISTRY);
    expect(tx.value).toBe(0n);
    expect(tx.gasLimit).toBe(DEFAULT_SEAT_EXECUTION_UNIT_LIMIT);
    expect(tx.input).toBe(
      encodeAdvertiseSeatCalldata({
        clusterId: 7,
        kind: "active",
        seatCount: 3,
        minBondLythoshi: NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI,
        capabilityMask: 0x9,
        termsHash: new Uint8Array(32).fill(0x11),
      }),
    );
  });

  it("builds an applyForSeat tx that defaults the value to the 5,000 LYTH self-bond floor", () => {
    const pubkey = new Uint8Array(PUBKEY_LEN).fill(0xab);
    const tx = buildApplyForSeatTxFields({
      chainId: 69420,
      nonce: 2,
      fee: ZERO_FEE,
      clusterId: 7,
      seatId: 2,
      operatorPubkey: pubkey,
    });
    expect(tx.to).toBe(NODE_REGISTRY);
    expect(tx.value).toBe(NODE_REGISTRY_MIN_SELF_BOND_LYTHOSHI);
    expect(tx.input).toBe(encodeApplyForSeatCalldata({ clusterId: 7, seatId: 2, operatorPubkey: pubkey }));
  });

  it("applyForSeat honors an explicit self-bond override for a seat above the floor", () => {
    const pubkey = new Uint8Array(PUBKEY_LEN).fill(0xab);
    // A seat advertising a minBond above the floor requires `max(floor, seat.minBond)`.
    const seatMinBond = 7_500n * 10n ** 18n;
    const tx = buildApplyForSeatTxFields({
      chainId: 69420,
      nonce: 2,
      fee: ZERO_FEE,
      clusterId: 7,
      seatId: 2,
      operatorPubkey: pubkey,
      selfBondLythoshi: seatMinBond,
    });
    expect(tx.value).toBe(seatMinBond);
  });

  it("builds non-payable vote/withdraw/close txs", () => {
    const voterPubkey = new Uint8Array(PUBKEY_LEN).fill(0xcd);
    const appKey = new Uint8Array(32).fill(0x22);
    const vote = buildVoteSeatAdmitTxFields({
      chainId: 1,
      nonce: 0,
      fee: ZERO_FEE,
      clusterId: 7,
      appKey,
      voterPubkey,
    });
    const withdraw = buildWithdrawSeatApplicationTxFields({
      chainId: 1,
      nonce: 0,
      fee: ZERO_FEE,
      clusterId: 7,
      appKey,
    });
    const close = buildCloseSeatTxFields({ chainId: 1, nonce: 0, fee: ZERO_FEE, clusterId: 7, seatId: 2 });
    for (const tx of [vote, withdraw, close]) {
      expect(tx.to).toBe(NODE_REGISTRY);
      expect(tx.value).toBe(0n);
    }
    expect(vote.input).toBe(encodeVoteSeatAdmitCalldata({ clusterId: 7, appKey, voterPubkey }));
    expect(withdraw.input).toBe(encodeWithdrawSeatApplicationCalldata({ clusterId: 7, appKey }));
    expect(close.input).toBe(encodeCloseSeatCalldata({ clusterId: 7, seatId: 2 }));
  });

  it("resolveSeatExecutionFee clamps to the protocol floor and applies the safety multiplier", () => {
    const fee = resolveSeatExecutionFee({
      executionUnitPriceLythoshi: "1",
      basePricePerExecutionUnitLythoshi: "1",
      priorityTipLythoshi: "0",
      blockNumber: 1,
      source: "test",
    });
    // floor 2000 * multiplier 3.
    expect(fee.maxFeePerGas).toBe(6000n);
    expect(fee.maxPriorityFeePerGas).toBe(6000n);
    expect(fee.gasLimit).toBe(DEFAULT_SEAT_EXECUTION_UNIT_LIMIT);
  });
});
