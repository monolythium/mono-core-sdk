/**
 * Hierarchical name-registry precompile (`0x110E`) helpers — pricing +
 * calldata encoders.
 *
 * Mirrors `mono-core/crates/precompiles/platform/name-registry-hierarchical`:
 * the U-curve registration cost (`ops.rs` / `validate.rs`) and the frozen
 * `register` / `proposeTransfer` / `acceptTransfer` ABI signatures
 * (`abi.rs`). Reads (forward `lyth_resolveName`, reverse `lyth_nameOf`,
 * availability) live on `RpcClient`; this module is the write/pricing side.
 *
 * The chain re-validates every name on submit, so the client-side
 * structural parse here is for accurate pricing + fast UX feedback, not a
 * security boundary.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";

export class NameRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NameRegistryError";
  }
}

export type NameCategory = "human" | "agent" | "cluster" | "contract" | "system";

/** Frozen 4-byte selectors, `keccak256(signature)[0..4]`. */
export const NAME_REGISTRY_SELECTORS = {
  register: selectorHex("register(string,address)"),
  proposeTransfer: selectorHex("proposeTransfer(string,address)"),
  acceptTransfer: selectorHex("acceptTransfer(string)"),
} as const;

/** Per-category base multiplier (`validate.rs` `base_multiplier`). `system` is not user-registerable. */
export const NAME_BASE_MULTIPLIER: Record<Exclude<NameCategory, "system">, number> = {
  human: 5,
  agent: 2,
  cluster: 20,
  contract: 10,
} as const;

/** Fallback fee unit when the block base fee reads zero (`ops.rs` `FALLBACK_FEE_UNIT_LYTHOSHI`); 18-decimal value per ADR-0037. */
export const NAME_FALLBACK_FEE_UNIT_LYTHOSHI = 1_000_000_000_000n;

export const NAME_MAX_LEN = 80;
export const NAME_LABEL_MIN_LEN = 1;
export const NAME_LABEL_MAX_LEN = 63;

/** Structural parse result used for pricing. */
export interface ParsedName {
  category: NameCategory;
  /** Length of the left-most (primary) label — the U-curve length input. */
  primaryLabelLen: number;
}

/** A live registration quote (see {@link RpcClient.quoteNameRegistration}). */
export interface NameRegistrationQuote {
  name: string;
  category: NameCategory;
  primaryLabelLen: number;
  /** Live fee unit (block base fee in lythoshi, or the fallback). */
  feeUnitLythoshi: bigint;
  /** Total registration cost in lythoshi; tx value must equal this exactly. */
  costLythoshi: bigint;
}

/** Return the name-registry precompile address (`0x110E`) as lower-case hex. */
export function nameRegistryAddressHex(): string {
  return PRECOMPILE_ADDRESSES.NAME_REGISTRY.toLowerCase();
}

/**
 * U-curve length multiplier ×10 (`validate.rs` `length_modifier_x10`).
 * `null` for a label length outside `1..=63`.
 */
export function nameLengthModifierX10(labelLen: number): number | null {
  if (labelLen === 1) return 1000;
  if (labelLen === 2) return 500;
  if (labelLen === 3) return 100;
  if (labelLen === 4) return 50;
  if (labelLen === 5) return 30;
  if (labelLen >= 6 && labelLen <= 12) return 10;
  if (labelLen >= 13 && labelLen <= 20) return 15;
  if (labelLen >= 21 && labelLen <= 32) return 30;
  if (labelLen >= 33 && labelLen <= 50) return 100;
  if (labelLen >= 51 && labelLen <= 63) return 500;
  return null;
}

/**
 * Structural parse of a `*.mono` name into `{ category, primaryLabelLen }`
 * (the U-curve pricing inputs). Mirrors the structural arm of the chain's
 * `parse_and_validate`: label charset `[a-z0-9-]`, no leading/trailing/
 * double hyphen, label length `1..=63`, whole name `<=80`, must end in
 * `mono`. Category is decided by structure:
 * `<x>.mono`=human, `<x>.cluster.mono`/`.contract.mono`/`.system.mono`,
 * `<x>.agent.<human>.mono`=agent. Does NOT enforce the forbidden-prefix
 * list (a submit-time visual-impersonation guard) — the chain does.
 *
 * @throws {NameRegistryError} on a structurally invalid name.
 */
export function parseNameCategory(name: string): ParsedName {
  if (name.length === 0) throw new NameRegistryError("name is empty");
  if (name.length > NAME_MAX_LEN) throw new NameRegistryError(`name exceeds ${NAME_MAX_LEN} chars`);
  const parts = name.split(".");
  if (parts.some((p) => p.length === 0)) {
    throw new NameRegistryError("name has an empty label");
  }
  for (const label of parts) validateLabel(label);
  if (parts[parts.length - 1] !== "mono") {
    throw new NameRegistryError("name must end with .mono");
  }
  const primaryLabelLen = parts[0].length;
  switch (parts.length) {
    case 2:
      if (STRUCTURAL_RESERVES.has(parts[0])) {
        throw new NameRegistryError(`"${parts[0]}.mono" is a structural reserve`);
      }
      return { category: "human", primaryLabelLen };
    case 3: {
      const anchor = parts[1];
      if (anchor === "cluster") return { category: "cluster", primaryLabelLen };
      if (anchor === "contract") return { category: "contract", primaryLabelLen };
      if (anchor === "system") return { category: "system", primaryLabelLen };
      throw new NameRegistryError(`unknown name category anchor ".${anchor}.mono"`);
    }
    case 4:
      if (parts[1] !== "agent") {
        throw new NameRegistryError("unknown 4-label name form (expected <x>.agent.<human>.mono)");
      }
      return { category: "agent", primaryLabelLen };
    default:
      throw new NameRegistryError("unrecognised name structure");
  }
}

/**
 * U-curve registration cost in lythoshi (`ops.rs`
 * `registration_cost_lythoshi_with_unit`): `base × (modX10) × feeUnit / 10`
 * (integer arithmetic, multiply-before-divide to match the chain).
 *
 * @throws {NameRegistryError} for a `system` name (not user-registerable)
 *   or a primary label length outside `1..=63`.
 */
export function nameRegistrationCost(
  category: NameCategory,
  primaryLabelLen: number,
  feeUnitLythoshi: bigint,
): bigint {
  if (category === "system") {
    throw new NameRegistryError("system names are not registerable via this path");
  }
  const base = BigInt(NAME_BASE_MULTIPLIER[category]);
  const modX10 = nameLengthModifierX10(primaryLabelLen);
  if (modX10 === null) {
    throw new NameRegistryError("primary label length is outside the priceable 1..=63 range");
  }
  return (base * BigInt(modX10) * feeUnitLythoshi) / 10n;
}

/**
 * Encode `register(string,address)` calldata for `0x110E`.
 *
 * For human/agent/contract names the precompile uses the CALLER as owner,
 * so `owner` defaults to the zero address. Submit as tx data to
 * `0x110E` with `value` exactly equal to the {@link nameRegistrationCost}
 * (else the precompile reverts `IncorrectFee`).
 *
 * @param owner 20-byte owner address (raw bytes / `0x`-hex); default zero.
 */
export function encodeNameRegisterCall(
  name: string,
  owner?: string | Uint8Array | readonly number[],
): string {
  return encodeStringAddressCall(NAME_REGISTRY_SELECTORS.register, name, owner);
}

/** Encode `proposeTransfer(string,address)` calldata for `0x110E`. */
export function encodeNameProposeTransferCall(
  name: string,
  recipient: string | Uint8Array | readonly number[],
): string {
  return encodeStringAddressCall(NAME_REGISTRY_SELECTORS.proposeTransfer, name, recipient);
}

/** Encode `acceptTransfer(string)` calldata for `0x110E`. */
export function encodeNameAcceptTransferCall(name: string): string {
  const nameBytes = new TextEncoder().encode(name);
  return bytesToHex(
    concatBytes(
      hexToBytes(NAME_REGISTRY_SELECTORS.acceptTransfer),
      // Single head word → the string offset is 0x20 (one word precedes the tail).
      uint256Word(0x20n),
      uint256Word(BigInt(nameBytes.length)),
      padTo32(nameBytes),
    ),
  );
}

// --- internals -------------------------------------------------------

const STRUCTURAL_RESERVES = new Set(["agent", "cluster", "contract", "system"]);

function encodeStringAddressCall(
  selector: string,
  name: string,
  address?: string | Uint8Array | readonly number[],
): string {
  const nameBytes = new TextEncoder().encode(name);
  return bytesToHex(
    concatBytes(
      hexToBytes(selector),
      // Two head words (string offset, address) → string tail starts at 0x40.
      uint256Word(0x40n),
      addressWord(address),
      uint256Word(BigInt(nameBytes.length)),
      padTo32(nameBytes),
    ),
  );
}

function validateLabel(label: string): void {
  if (label.length < NAME_LABEL_MIN_LEN || label.length > NAME_LABEL_MAX_LEN) {
    throw new NameRegistryError(`label "${label}" must be ${NAME_LABEL_MIN_LEN}..${NAME_LABEL_MAX_LEN} chars`);
  }
  if (label.startsWith("-") || label.endsWith("-")) {
    throw new NameRegistryError(`label "${label}" may not start or end with a hyphen`);
  }
  if (label.includes("--")) {
    throw new NameRegistryError(`label "${label}" may not contain a double hyphen`);
  }
  if (!/^[a-z0-9-]+$/.test(label)) {
    throw new NameRegistryError(`label "${label}" has an invalid char (allowed: a-z 0-9 -)`);
  }
}

function selectorHex(signature: string): string {
  const sel = keccak_256(new TextEncoder().encode(signature)).slice(0, 4);
  return `0x${[...sel].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function addressWord(value?: string | Uint8Array | readonly number[]): Uint8Array {
  const out = new Uint8Array(32);
  if (value == null) return out;
  const bytes = toBytes(value);
  if (bytes.length !== 20) {
    throw new NameRegistryError(`address must be 20 bytes, got ${bytes.length}`);
  }
  out.set(bytes, 12);
  return out;
}

function uint256Word(value: bigint): Uint8Array {
  if (value < 0n || value > (1n << 256n) - 1n) {
    throw new NameRegistryError("uint256 word out of range");
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0 && rest > 0n; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function padTo32(bytes: Uint8Array): Uint8Array {
  const padded = Math.ceil(bytes.length / 32) * 32;
  if (padded === bytes.length) return bytes;
  const out = new Uint8Array(padded);
  out.set(bytes);
  return out;
}

function toBytes(value: string | Uint8Array | readonly number[]): Uint8Array {
  if (typeof value === "string") return hexToBytes(value);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function hexToBytes(hex: string): Uint8Array {
  const body = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new NameRegistryError("invalid hex bytes");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
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
