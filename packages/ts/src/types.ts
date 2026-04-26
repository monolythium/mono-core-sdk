/**
 * Wire-shape types served by a `mono-core` node.
 *
 * Re-exports the `ts-rs`-generated definitions in `./bindings/`. Those
 * files are the authoritative source — they are written from Rust by
 * `cargo test --features ts-bindings` and copied into this package via
 * `pnpm run build:bindings` / `bash scripts/sync-bindings.sh`.
 *
 * Quantities (`u64` etc.) surface as `bigint` to preserve full
 * precision against the chain's 256-bit world. Hashes / addresses /
 * `0x`-hex byte vectors surface as `string`.
 */

export type * from "./bindings/index.js";

/** `0x`-prefixed hex byte vector. */
export type Hex = string;

/** `0x`-prefixed hex 20-byte address. */
export type Address = string;

/** `0x`-prefixed hex 32-byte hash. */
export type Hash = string;

/** `0x`-prefixed hex unsigned quantity. */
export type Quantity = string;

import type { BlockTag } from "./bindings/BlockTag.js";
export type { BlockTag };

/**
 * Block selector for `eth_getBlock*`, `eth_call`, etc. — accepts a tag,
 * a numeric height (encoded by the client as `0x`-hex), a `bigint`, or
 * a 32-byte hash where the spec allows it.
 */
export type BlockSelector = BlockTag | number | bigint | Hash;

/** Encode a `BlockSelector` for a JSON-RPC params array. */
export function encodeBlockSelector(b: BlockSelector): string {
  if (typeof b === "number") return `0x${b.toString(16)}`;
  if (typeof b === "bigint") return `0x${b.toString(16)}`;
  return b;
}
