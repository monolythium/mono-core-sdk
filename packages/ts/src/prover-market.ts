/**
 * GPU prover-market precompile ABI helpers + read types (MB-4).
 *
 * Mirrors `mono-core/crates/precompiles/platform/prover-market`. The six
 * ops (`createRequest` / `submitBid` / `closeRequest` / `submitProof` /
 * `settle` / `slash`) all take a single `bytes` canonical payload; their
 * selectors are `keccak256(sig)[..4]`.
 *
 * Only the `createRequest` canonical payload is finalized on the chain
 * side today (`ProofRequest::encode_canonical`). The other five op
 * bodies land at the deferred runtime-wiring wave, so their canonical
 * payload encoders carry a `TODO(monolythium-vision)` below.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

/**
 * GPU prover-market precompile address (`0x100C`).
 *
 * Final, registered slot. (The earlier first-pass guess of `0x1110`
 * assumed MB-5 took `0x1110` for a new precompile; MB-5 instead shipped
 * `attestDkgReshare` as a selector inside node-registry `0x1005`, so the
 * platform extension band's lowest free slot — `0x100C`, after the
 * operator router at `0x100B` — is where the prover market binds.) The
 * precompile is gateable + genesis-disabled per ADR-0015 §3; activation
 * is a foundation milestone flip, but the `lyth_*` read surfaces work
 * regardless.
 */
export const PROVER_MARKET_ADDRESS = PRECOMPILE_ADDRESSES.PROVER_MARKET;

/** `SERVES_GPU_PROVE` capability bit (MB-4) — bit 9 of the node-registry field. */
export const SERVES_GPU_PROVE = 0x0000_0200 as const;

export const PROVER_MARKET_SELECTORS = {
  createRequest: "0x" + selectorHex("createRequest(bytes)"),
  submitBid: "0x" + selectorHex("submitBid(bytes)"),
  closeRequest: "0x" + selectorHex("closeRequest(bytes)"),
  submitProof: "0x" + selectorHex("submitProof(bytes)"),
  settle: "0x" + selectorHex("settle(bytes)"),
  slash: "0x" + selectorHex("slash(bytes)"),
} as const;

export const PROVER_MARKET_EVENT_SIGS = {
  proofRequested: "ProofRequested(bytes32,address,bytes32,uint128,uint64)",
  bidSubmitted: "BidSubmitted(bytes32,address,uint128)",
  requestAssigned: "RequestAssigned(bytes32,address,uint128)",
  proofSettled: "ProofSettled(bytes32,address,uint128,uint128)",
  proverSlashed: "ProverSlashed(bytes32,address,uint16,bytes32)",
  requestExpired: "RequestExpired(bytes32,address,uint128)",
} as const;

/** `ProverSlashed` reason code: non-delivery past deadline. */
export const PROVER_SLASH_REASON_NON_DELIVERY = 0x0400 as const;
/** `ProverSlashed` reason code: bad proof. */
export const PROVER_SLASH_REASON_BAD_PROOF = 0x0401 as const;

export const PROVER_MARKET_REQUEST_DOMAIN = "prover_market.request.v1" as const;
export const PROVER_MARKET_BID_DOMAIN = "prover_market.bid.v1" as const;
export const PROVER_MARKET_SUBMIT_DOMAIN = "prover_market.submit.v1" as const;

/** State machine for a proof request (mirrors `ProverMarketState`). */
export type ProverMarketState =
  | "open"
  | "assigned"
  | "settled"
  | "slashed"
  | "expired";

/** Decode a `ProverMarketState` from its on-chain wire byte, or `null`. */
export function proverMarketStateFromByte(b: number): ProverMarketState | null {
  switch (b) {
    case 0:
      return "open";
    case 1:
      return "assigned";
    case 2:
      return "settled";
    case 3:
      return "slashed";
    case 4:
      return "expired";
    default:
      return null;
  }
}

/**
 * `lyth_getProofRequest` response — one proof-request record read
 * directly from the prover-market state tree (`0x100C`).
 *
 * Mirrors the chain JSON exactly (camelCase keys). Fee amounts are
 * `0x`-hex `uint256` strings; addresses are `mono` bech32m (null while
 * unset); hashes are `0x`-hex words. This is the exact-lookup shape; the
 * indexer-backed list rows ({@link ProofRequestRow}) carry a different
 * field set.
 */
export interface ProofRequestView {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Prover-market precompile address (`0x100C`). */
  precompile: string;
  /** Canonical request id (`0x` 32 bytes). */
  requestId: string;
  /** Lifecycle state name. */
  state: ProverMarketState | string;
  /** Lifecycle state wire byte (`0`..=`4`). */
  stateCode: number;
  /** Buyer (`mono` bech32m); `null` when unset. */
  buyer: string | null;
  /** Verification-key hash the proof must satisfy (`0x` 32 bytes). */
  vkeyHash: string;
  /** Public-inputs commitment (`0x` 32 bytes). */
  inputsHash: string;
  /** Maximum fee escrowed (`0x`-hex `uint256`). */
  maxFee: string;
  /** Deterministic Unix-seconds deadline. */
  deadlineUnixSeconds: number;
  /** Assigned prover (`mono` bech32m); `null` while Open/Expired. */
  assignedProver: string | null;
  /** Winning fee bid (`0x`-hex `uint256`); `0x0` while Open. */
  winningFee: string;
  /** Unix seconds of the last state transition. */
  stateAtUnixSeconds: number;
  /** Delivered proof hash (`0x` 32 bytes); zero until `submitProof`. */
  proofHash: string;
  /** Number of bids recorded against the request. */
  bidCount: number;
}

/**
 * `lyth_listProofRequests` row — one indexer-projection proof-request
 * record. Distinct from {@link ProofRequestView}: fee amounts here are
 * decimal atomic-unit strings (the indexer projection's wire form), and
 * the row carries `feePaid` + `createdAtBlock` instead of the
 * state-tree-only `inputsHash` / `stateCode` / `proofHash` fields.
 */
export interface ProofRequestRow {
  /** Content-addressed request id (`0x` 32 bytes). */
  requestId: string;
  /** Requesting buyer (`mono` bech32m). */
  buyer: string;
  /** Verification-key hash bound to the request (`0x` 32 bytes). */
  vkeyHash: string;
  /** Maximum fee escrowed (decimal atomic-unit string). */
  maxFee: string;
  /** Deadline (unix seconds). */
  deadlineUnixSeconds: number;
  /** Lifecycle state name. */
  state: ProverMarketState | string;
  /** Assigned prover (`mono` bech32m); `null` until a winner is selected. */
  assignedProver: string | null;
  /** Winning fee (decimal atomic-unit string); `null` until assigned. */
  winningFee: string | null;
  /** Number of bids recorded against the request. */
  bidCount: number;
  /** Fee paid out on settlement (decimal atomic-unit string); `null` otherwise. */
  feePaid: string | null;
  /** Block height the request was first observed at. */
  createdAtBlock: number;
}

/**
 * `lyth_listProofRequests` response envelope.
 *
 * When the node runs without the prover-market indexer projection it
 * returns the graceful fallback `{ status: "indexer_unavailable", … }`
 * with an empty `requests` array — `requests` is always present so
 * callers can iterate unconditionally.
 */
export interface ListProofRequestsResponse {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** `"indexer_unavailable"` on the graceful-fallback path; absent when served. */
  status?: "indexer_unavailable";
  /** Data source — `"prover_market_indexer_projection"`. */
  source: string;
  /** Prover-market precompile address (`0x100C`). */
  precompile: string;
  /** Echo of the lifecycle-state filter, when one was supplied. */
  stateFilter?: ProverMarketState | string | null;
  /** Echo of the page cap, when served. */
  limit?: number;
  /** Matching rows, newest-first. Empty on the fallback path. */
  requests: ProofRequestRow[];
  /** Human-readable reason on the fallback path. */
  reason?: string;
}

/**
 * `lyth_getProverBids` response — every recorded bid against one request,
 * read from the prover-market bid slots (`0x100C`).
 */
export interface ProverBidsResponse {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** Data source — `"native_state_storage"`. */
  source: string;
  /** Prover-market precompile address (`0x100C`). */
  precompile: string;
  /** Request the bids target (`0x` 32 bytes). */
  requestId: string;
  /** Number of bids recorded. */
  bidCount: number;
  /** Recorded fee bids. */
  bids: ProverBidView[];
}

/** One prover fee bid in a {@link ProverBidsResponse}. */
export interface ProverBidView {
  /** Slot index of this bid within the request's bid list. */
  index: number;
  /** Bidding prover (`mono` bech32m); must hold `SERVES_GPU_PROVE`. */
  prover: string;
  /** Fee bid (`0x`-hex `uint256`); must be `<= maxFee`. */
  fee: string;
}

/**
 * `lyth_proverMarketStatus` response — market-wide prover-market stats.
 *
 * `feeFloor` is the on-chain genesis singleton (always present, read
 * directly from `0x100C`). The aggregate counts come from the indexer
 * projection; when the node runs without it the response carries
 * `status: "indexer_unavailable"` and the count fields are `null`.
 */
export interface ProverMarketStatusResponse {
  /** Response schema version (`1`). */
  schemaVersion: number;
  /** `"indexer_unavailable"` on the graceful-fallback path; absent when served. */
  status?: "indexer_unavailable";
  /** Data source — `"prover_market_indexer_projection"`. */
  source: string;
  /** Prover-market precompile address (`0x100C`). */
  precompile: string;
  /** Genesis-configured minimum prover fee (`0x`-hex `uint256`). */
  feeFloor: string;
  /** Requests in the `open` state; `null` on the fallback path. */
  openRequests: number | null;
  /** Requests in the `assigned` state; `null` on the fallback path. */
  assignedRequests: number | null;
  /** Requests in the `settled` state; `null` on the fallback path. */
  settledRequests: number | null;
  /** Requests in the `slashed` state; absent on the fallback path. */
  slashedRequests?: number | null;
  /** Requests in the `expired` state; absent on the fallback path. */
  expiredRequests?: number | null;
  /** Total requests observed; absent on the fallback path. */
  totalRequests?: number | null;
  /** Human-readable reason on the fallback path. */
  reason?: string;
}

export class ProverMarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProverMarketError";
  }
}

/** Compute the buyer's `request` sighash (`prover_market.request.v1`). */
export function requestSighash(
  vkeyHash: string | Uint8Array | readonly number[],
  inputsHash: string | Uint8Array | readonly number[],
  maxFee: bigint | number | string,
  deadline: bigint | number | string,
  nonce: bigint | number | string,
): string {
  return bytesToHex(
    keccak_256(
      concatBytes(
        new TextEncoder().encode(PROVER_MARKET_REQUEST_DOMAIN),
        expectLength(toBytes(vkeyHash), 32, "vkeyHash"),
        expectLength(toBytes(inputsHash), 32, "inputsHash"),
        u128Bytes(maxFee, "maxFee"),
        u64Bytes(deadline, "deadline"),
        u64Bytes(nonce, "nonce"),
      ),
    ),
  );
}

/** Compute the prover's `bid` sighash (`prover_market.bid.v1`). */
export function bidSighash(
  requestId: string | Uint8Array | readonly number[],
  fee: bigint | number | string,
): string {
  return bytesToHex(
    keccak_256(
      concatBytes(
        new TextEncoder().encode(PROVER_MARKET_BID_DOMAIN),
        expectLength(toBytes(requestId), 32, "requestId"),
        u128Bytes(fee, "fee"),
      ),
    ),
  );
}

/** Compute the assigned prover's `submit` sighash (`prover_market.submit.v1`). */
export function submitSighash(
  requestId: string | Uint8Array | readonly number[],
  proofHash: string | Uint8Array | readonly number[],
): string {
  return bytesToHex(
    keccak_256(
      concatBytes(
        new TextEncoder().encode(PROVER_MARKET_SUBMIT_DOMAIN),
        expectLength(toBytes(requestId), 32, "requestId"),
        expectLength(toBytes(proofHash), 32, "proofHash"),
      ),
    ),
  );
}

export interface CreateRequestCanonicalArgs {
  /** Buyer address (`0x` 20 bytes). */
  buyer: string | Uint8Array | readonly number[];
  /** Buyer's ML-DSA-65 pubkey bytes. */
  buyerPubkey: string | Uint8Array | readonly number[];
  /** Verification-key hash (`0x` 32 bytes). */
  vkeyHash: string | Uint8Array | readonly number[];
  /** Public-inputs commitment (`0x` 32 bytes). */
  inputsHash: string | Uint8Array | readonly number[];
  /** Maximum fee escrowed (lythoshi). */
  maxFee: bigint | number | string;
  /** Deterministic Unix-seconds deadline. */
  deadline: bigint | number | string;
  /** Buyer-supplied uniqueness nonce. */
  nonce: bigint | number | string;
  /** Buyer's ML-DSA-65 signature over {@link requestSighash}. */
  sig: string | Uint8Array | readonly number[];
}

/**
 * Encode the canonical `createRequest` payload (the `bytes` body the
 * precompile accepts). Mirrors `ProofRequest::encode_canonical`:
 *
 * ```text
 * buyer (20) || buyerPubkeyLen (be16) || buyerPubkey
 *   || vkeyHash (32) || inputsHash (32) || maxFee (be16)
 *   || deadline (be8) || nonce (be8) || sigLen (be16) || sig
 * ```
 */
export function encodeCreateRequestCanonical(args: CreateRequestCanonicalArgs): string {
  const buyer = expectLength(toBytes(args.buyer), 20, "buyer");
  const buyerPubkey = toBytes(args.buyerPubkey);
  const sig = toBytes(args.sig);
  if (buyerPubkey.length === 0 || buyerPubkey.length > 0xffff) {
    throw new ProverMarketError("buyerPubkey length out of range (1..=65535)");
  }
  if (sig.length === 0 || sig.length > 0xffff) {
    throw new ProverMarketError("sig length out of range (1..=65535)");
  }
  return bytesToHex(
    concatBytes(
      buyer,
      u16Bytes(buyerPubkey.length),
      buyerPubkey,
      expectLength(toBytes(args.vkeyHash), 32, "vkeyHash"),
      expectLength(toBytes(args.inputsHash), 32, "inputsHash"),
      u128Bytes(args.maxFee, "maxFee"),
      u64Bytes(args.deadline, "deadline"),
      u64Bytes(args.nonce, "nonce"),
      u16Bytes(sig.length),
      sig,
    ),
  );
}

/**
 * Encode full `createRequest(bytes)` calldata: the 4-byte selector
 * followed by the ABI-`bytes`-wrapped canonical payload.
 */
export function encodeCreateRequestCalldata(args: CreateRequestCanonicalArgs): string {
  const canonical = toBytes(encodeCreateRequestCanonical(args));
  const offset = new Uint8Array(32);
  offset[31] = 0x20;
  const lenWord = new Uint8Array(32);
  const len = canonical.length;
  lenWord[28] = (len >>> 24) & 0xff;
  lenWord[29] = (len >>> 16) & 0xff;
  lenWord[30] = (len >>> 8) & 0xff;
  lenWord[31] = len & 0xff;
  const pad = (32 - (len % 32)) % 32;
  return bytesToHex(
    concatBytes(hexToBytes(PROVER_MARKET_SELECTORS.createRequest), offset, lenWord, canonical, new Uint8Array(pad)),
  );
}

// TODO(monolythium-vision): mono-core-sdk missing submitBid / closeRequest /
// submitProof / settle / slash canonical-payload encoders — the chain side
// (`prover-market::precompile`) defers those op bodies to the runtime-wiring
// wave, so their canonical `bytes` layouts are not yet final. Add the encoders
// once they land. The selectors + sighash helpers above are final.

function selectorHex(sig: string): string {
  return [...keccak_256(new TextEncoder().encode(sig)).slice(0, 4)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") return hexToBytes(value);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(hex: string): Uint8Array {
  const b = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (b.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(b)) {
    throw new ProverMarketError("invalid hex bytes");
  }
  const out = new Uint8Array(b.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(b.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function expectLength(value: Uint8Array, len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new ProverMarketError(`${name} must be ${len} bytes, got ${value.length}`);
  }
  return value;
}

function toBigint(value: bigint | number | string, name: string): bigint {
  let n: bigint;
  if (typeof value === "bigint") n = value;
  else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new ProverMarketError(`${name} must be a safe integer`);
    n = BigInt(value);
  } else if (/^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/.test(value)) n = BigInt(value);
  else throw new ProverMarketError(`${name} must be a non-negative integer`);
  if (n < 0n) throw new ProverMarketError(`${name} must be non-negative`);
  return n;
}

function u16Bytes(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new ProverMarketError("u16 value out of range");
  }
  return Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
}

function u64Bytes(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n > 0xffff_ffff_ffff_ffffn) throw new ProverMarketError(`${name} exceeds uint64`);
  return bigintBytes(n, 8);
}

function u128Bytes(value: bigint | number | string, name: string): Uint8Array {
  const n = toBigint(value, name);
  if (n > (1n << 128n) - 1n) throw new ProverMarketError(`${name} exceeds uint128`);
  return bigintBytes(n, 16);
}

function bigintBytes(value: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let n = value;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}
