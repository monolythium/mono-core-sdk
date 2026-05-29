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

// TODO(monolythium-vision): prover-market precompile address (tentative
// 0x1110) confirmed at chain wiring. The precompile is NOT yet registered
// (registration deferred), so the address is not pinned in consts.ts and no
// live plan builder hardcodes it.
export const PROVER_MARKET_TENTATIVE_ADDRESS =
  "0x0000000000000000000000000000000000001110" as const;

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

/** `lyth_getProofRequest` view of one proof-request record. */
export interface ProofRequestView {
  /** Canonical request id (`0x` 32 bytes). */
  id: string;
  /** Buyer address (`0x` 20 bytes). */
  buyer: string;
  /** Verification-key hash the proof must satisfy (`0x` 32 bytes). */
  vkeyHash: string;
  /** Public-inputs commitment (`0x` 32 bytes). */
  inputsHash: string;
  /** Maximum fee escrowed (lythoshi decimal string). */
  maxFee: string;
  /** Deterministic Unix-seconds deadline. */
  deadline: bigint;
  /** Buyer-supplied uniqueness nonce. */
  nonce: bigint;
  /** Current state-machine state. */
  state: ProverMarketState;
  /** Assigned prover (`0x` 20 bytes); zero-address while Open/Expired. */
  assignedProver: string;
  /** Winning fee bid (lythoshi decimal string); `"0"` while Open. */
  winningFee: string;
  /** Delivered proof hash (`0x` 32 bytes); zero until `submitProof`. */
  proofHash: string;
}

/** `lyth_getProverBids` view of one prover fee bid. */
export interface ProverBidView {
  /** Request this bid targets (`0x` 32 bytes). */
  requestId: string;
  /** Bidding prover (`0x` 20 bytes); must hold `SERVES_GPU_PROVE`. */
  prover: string;
  /** Fee bid (lythoshi decimal string); must be `<= maxFee`. */
  fee: string;
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
