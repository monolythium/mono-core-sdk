/**
 * Oracle-precompile (`0x1009`) event decode types + read-method
 * signatures (MB-6).
 *
 * Mirrors `mono-core/crates/precompiles/platform/oracle/src/events.rs`:
 * the canonical event signatures and a pure decoder that turns one EVM
 * log (topics + data) into a typed {@link OracleEvent}. The decoder is
 * the exact inverse of the chain-side `emit_*` helpers.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

export const ORACLE_EVENT_SIGS = {
  oracleRoundFinalized: "OracleRoundFinalized(bytes32,uint64,uint256,uint64,uint32)",
  observationSubmitted: "ObservationSubmitted(bytes32,uint64,address,uint256,uint64)",
  feedAdded: "FeedAdded(bytes32,uint8,uint16,uint32,uint32)",
  feedUpdated: "FeedUpdated(bytes32,uint8,uint16,uint32,uint32)",
  oracleFraudSlashed: "OracleFraudSlashed(bytes32,uint64,address,bytes32)",
  oracleAdminUpdated: "OracleAdminUpdated(address)",
  oracleWriterAdded: "OracleWriterAdded(address,address)",
  oracleWriterRemoved: "OracleWriterRemoved(address,address)",
} as const;

export class OracleEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OracleEventError";
  }
}

/** One active oracle writer in a {@link OracleSignersResponse}. */
export interface OracleSignerRow {
  /** Writer address in the active global oracle signer roster (`mono` bech32m). */
  writer: string;
  /** Admin that last authorized this writer's membership (`mono` bech32m). */
  admin: string;
  /** Block height of the latest membership fold. */
  updatedAtBlock: number;
}

/**
 * `lyth_oracleSigners` response — the global oracle writer roster, folded
 * from `OracleWriterAdded` / `OracleWriterRemoved` by the oracle indexer
 * projection (MB-6).
 *
 * When the node runs without that projection it returns the graceful
 * fallback `{ status: "indexer_unavailable", writers: [] }` — `writers`
 * is always present so callers can iterate unconditionally; use
 * `lyth_oracleWriters(feedId)` for the per-feed writer set in that case.
 */
export interface OracleSignersResponse {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** `"indexer_unavailable"` on the graceful-fallback path; absent when served. */
  status?: "indexer_unavailable";
  /** Data source — `"oracle_indexer_projection"`. */
  source: string;
  /** Oracle precompile address (`0x1009`). */
  precompile: string;
  /** Active writers; empty on the fallback path. */
  writers: OracleSignerRow[];
  /** Human-readable reason on the fallback path. */
  reason?: string;
}

/**
 * `lyth_oracleWriters` response — the allowed-writer roster for one feed
 * (MB-6), read from the feed-config writer list (`0x1009`).
 */
export interface OracleWriters {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Oracle precompile address (`0x1009`). */
  precompile: string;
  /** Feed the writers are scoped to (`0x` 32 bytes). */
  feedId: string;
  /** Allowed writer addresses (`mono` bech32m). */
  writers: string[];
}

/**
 * `lyth_oracleLatestPrice` response — the latest finalized round's median
 * for one feed (MB-6). A registered feed with no closed round yet returns
 * `round: 0`, `median: null`, `finalized: false`.
 */
export interface OracleLatestPrice {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Oracle precompile address (`0x1009`). */
  precompile: string;
  /** Feed id (`0x` 32 bytes). */
  feedId: string;
  /** Feed decimals. */
  decimals: number;
  /** Latest round id; `0` before the first round closes. */
  round: number;
  /** `true` once the latest round is finalized. */
  finalized: boolean;
  /** Finalized median (`0x`-hex `uint256`); `null` while unfinalized. */
  median: string | null;
  /** Block the latest round finalized at; `null` while unfinalized. */
  finalizedAtBlock: number | null;
}

/**
 * `lyth_oracleFeedConfig` response — one feed's decimals / heartbeat /
 * deviation-bps (circuit breaker) / min-signers config (MB-6).
 */
export interface OracleFeedConfig {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Oracle precompile address (`0x1009`). */
  precompile: string;
  /** Feed id (`0x` 32 bytes). */
  feedId: string;
  /** Feed decimals. */
  decimals: number;
  /** Minimum signers required to finalize a round. */
  minSigners: number;
  /** Max observation age (heartbeat) in seconds. */
  heartbeatSeconds: number;
  /** Circuit-breaker deviation bound in basis points. */
  deviationBps: number;
  /** Number of allowed writers configured for the feed. */
  allowedWritersLen: number;
}

/** Return the oracle precompile address (`0x1009`) as lower-case hex. */
export function oracleAddressHex(): string {
  return PRECOMPILE_ADDRESSES.ORACLE.toLowerCase();
}

/**
 * Typed view of one oracle-precompile log (MB-6). One variant per
 * chain-side emit helper. `feedId` / `evidenceHash` / address fields are
 * `0x`-prefixed hex; `computedMedian` / `value` are decimal strings of
 * their on-chain `uint256` value.
 */
export type OracleEvent =
  | {
      kind: "roundFinalized";
      feedId: string;
      roundId: bigint;
      computedMedian: string;
      finalizedAtBlock: bigint;
      observationsLen: number;
    }
  | {
      kind: "observationSubmitted";
      feedId: string;
      roundId: bigint;
      writer: string;
      value: string;
      observedAt: bigint;
    }
  | {
      kind: "fraudSlashed";
      feedId: string;
      roundId: bigint;
      writer: string;
      evidenceHash: string;
    }
  | {
      kind: "feedAdded";
      feedId: string;
      decimals: number;
      minSigners: number;
      circuitBreakerBps: number;
      allowedWritersLen: number;
    }
  | {
      kind: "feedUpdated";
      feedId: string;
      decimals: number;
      minSigners: number;
      circuitBreakerBps: number;
      allowedWritersLen: number;
    }
  | { kind: "adminUpdated"; admin: string }
  | { kind: "writerAdded"; admin: string; writer: string }
  | { kind: "writerRemoved"; admin: string; writer: string };

/**
 * Decode one EVM log emitted by the oracle precompile into a typed
 * {@link OracleEvent}. Pure + deterministic; dispatches on `topic0`,
 * then reads fixed-width 32-byte words.
 *
 * @throws {OracleEventError} on a foreign `topic0`, a topic-arity
 *   mismatch, or a data-length mismatch.
 */
export function decodeOracleEvent(
  topics: readonly (string | Uint8Array | readonly number[])[],
  data: string | Uint8Array | readonly number[],
): OracleEvent {
  if (topics.length === 0) {
    throw new OracleEventError("event record has no topics");
  }
  const topic0 = bytesToHex(expectLength(toBytes(topics[0]), 32, "topic0"));
  const body = toBytes(data);

  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleRoundFinalized)) {
    checkArity("OracleRoundFinalized", 3, topics.length);
    checkData("OracleRoundFinalized", 3 * 32, body.length);
    return {
      kind: "roundFinalized",
      feedId: hex32(topics[1]),
      roundId: u64FromTopic(topics[2]),
      computedMedian: u256Decimal(body.subarray(0, 32)),
      finalizedAtBlock: u64FromWord(body.subarray(32, 64)),
      observationsLen: u32FromWord(body.subarray(64, 96)),
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.observationSubmitted)) {
    checkArity("ObservationSubmitted", 4, topics.length);
    checkData("ObservationSubmitted", 2 * 32, body.length);
    return {
      kind: "observationSubmitted",
      feedId: hex32(topics[1]),
      roundId: u64FromTopic(topics[2]),
      writer: addressFromTopic(topics[3]),
      value: u256Decimal(body.subarray(0, 32)),
      observedAt: u64FromWord(body.subarray(32, 64)),
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleFraudSlashed)) {
    checkArity("OracleFraudSlashed", 4, topics.length);
    checkData("OracleFraudSlashed", 32, body.length);
    return {
      kind: "fraudSlashed",
      feedId: hex32(topics[1]),
      roundId: u64FromTopic(topics[2]),
      writer: addressFromTopic(topics[3]),
      evidenceHash: bytesToHex(body.subarray(0, 32)),
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.feedAdded)) {
    checkArity("FeedAdded", 2, topics.length);
    checkData("FeedAdded", 4 * 32, body.length);
    return { kind: "feedAdded", ...decodeFeedFields(topics[1], body) };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.feedUpdated)) {
    checkArity("FeedUpdated", 2, topics.length);
    checkData("FeedUpdated", 4 * 32, body.length);
    return { kind: "feedUpdated", ...decodeFeedFields(topics[1], body) };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleAdminUpdated)) {
    checkArity("OracleAdminUpdated", 2, topics.length);
    checkData("OracleAdminUpdated", 0, body.length);
    return { kind: "adminUpdated", admin: addressFromTopic(topics[1]) };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleWriterAdded)) {
    checkArity("OracleWriterAdded", 3, topics.length);
    checkData("OracleWriterAdded", 0, body.length);
    return {
      kind: "writerAdded",
      admin: addressFromTopic(topics[1]),
      writer: addressFromTopic(topics[2]),
    };
  }
  if (topic0 === topicHex(ORACLE_EVENT_SIGS.oracleWriterRemoved)) {
    checkArity("OracleWriterRemoved", 3, topics.length);
    checkData("OracleWriterRemoved", 0, body.length);
    return {
      kind: "writerRemoved",
      admin: addressFromTopic(topics[1]),
      writer: addressFromTopic(topics[2]),
    };
  }

  throw new OracleEventError("unknown oracle event topic0");
}

function decodeFeedFields(
  feedTopic: string | Uint8Array | readonly number[],
  body: Uint8Array,
): {
  feedId: string;
  decimals: number;
  minSigners: number;
  circuitBreakerBps: number;
  allowedWritersLen: number;
} {
  return {
    feedId: hex32(feedTopic),
    decimals: body[31],
    minSigners: (body[62] << 8) | body[63],
    circuitBreakerBps: u32FromWord(body.subarray(64, 96)),
    allowedWritersLen: u32FromWord(body.subarray(96, 128)),
  };
}

function topicHex(sig: string): string {
  return bytesToHex(keccak_256(new TextEncoder().encode(sig)));
}

function checkArity(event: string, expected: number, found: number): void {
  if (found !== expected) {
    throw new OracleEventError(`${event} expected ${expected} topics, found ${found}`);
  }
}

function checkData(event: string, expected: number, found: number): void {
  if (found !== expected) {
    throw new OracleEventError(`${event} expected ${expected} data bytes, found ${found}`);
  }
}

function hex32(topic: string | Uint8Array | readonly number[]): string {
  return bytesToHex(expectLength(toBytes(topic), 32, "feedId topic"));
}

function addressFromTopic(topic: string | Uint8Array | readonly number[]): string {
  return bytesToHex(expectLength(toBytes(topic), 32, "address topic").subarray(12, 32));
}

function u64FromTopic(topic: string | Uint8Array | readonly number[]): bigint {
  return u64FromWord(expectLength(toBytes(topic), 32, "u64 topic"));
}

function u64FromWord(word: Uint8Array): bigint {
  let v = 0n;
  for (let i = 24; i < 32; i++) v = (v << 8n) | BigInt(word[i]);
  return v;
}

function u32FromWord(word: Uint8Array): number {
  return ((word[28] << 24) | (word[29] << 16) | (word[30] << 8) | word[31]) >>> 0;
}

function u256Decimal(word: Uint8Array): string {
  let v = 0n;
  for (const b of word) v = (v << 8n) | BigInt(b);
  return v.toString(10);
}

function toBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") return hexToBytes(value);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(hex: string): Uint8Array {
  const b = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (b.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(b)) {
    throw new OracleEventError("invalid hex bytes");
  }
  const out = new Uint8Array(b.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(b.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function expectLength(value: Uint8Array, len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new OracleEventError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}
