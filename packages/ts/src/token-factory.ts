/**
 * Token factory precompile (`0x1000`) calldata helpers.
 *
 * The factory uses Solidity-style 4-byte selectors with ABI v2 word
 * encoding. These helpers cover the complete current MRC20-like factory
 * surface so apps do not have to maintain their own selector table.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { PRECOMPILE_ADDRESSES } from "./consts.js";
import { bytesToHex, concatBytes, hexToBytes } from "./crypto/bytes.js";

export class TokenFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenFactoryError";
  }
}

export const TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI = 3_000_000_000_000_000n as const;
export const TOKEN_FACTORY_NAME_MAX_BYTES = 256 as const;
export const TOKEN_FACTORY_SYMBOL_MAX_BYTES = 256 as const;
export const TOKEN_FACTORY_MAX_DECIMALS = 30 as const;
export const TOKEN_FACTORY_MAX_CREATOR_FEE_BPS = 10_000 as const;
export const TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG = 0xfa as const;

export const TOKEN_FACTORY_FLAGS = {
  MINTABLE: 1 << 0,
  BURNABLE: 1 << 1,
  PAUSABLE: 1 << 2,
  FIXED_SUPPLY: 1 << 3,
  CREATOR_FEE_OPT_IN: 1 << 4,
  DESTRUCTIBLE: 1 << 5,
} as const;

export const TOKEN_FACTORY_KNOWN_FLAG_MASK =
  TOKEN_FACTORY_FLAGS.MINTABLE |
  TOKEN_FACTORY_FLAGS.BURNABLE |
  TOKEN_FACTORY_FLAGS.PAUSABLE |
  TOKEN_FACTORY_FLAGS.FIXED_SUPPLY |
  TOKEN_FACTORY_FLAGS.CREATOR_FEE_OPT_IN |
  TOKEN_FACTORY_FLAGS.DESTRUCTIBLE;

export const TOKEN_FACTORY_SIGS = {
  createToken: "createToken(string,string,uint8,uint256,uint256,uint32,uint16)",
  transfer: "transfer(bytes32,address,uint256)",
  transferFrom: "transferFrom(bytes32,address,address,uint256)",
  approve: "approve(bytes32,address,uint256)",
  increaseAllowance: "increaseAllowance(bytes32,address,uint256)",
  decreaseAllowance: "decreaseAllowance(bytes32,address,uint256)",
  balanceOf: "balanceOf(bytes32,address)",
  allowance: "allowance(bytes32,address,address)",
  totalSupply: "totalSupply(bytes32)",
  metadata: "metadata(bytes32)",
  mint: "mint(bytes32,address,uint256)",
  burn: "burn(bytes32,uint256)",
  setPaused: "setPaused(bytes32,bool)",
  transferOwnership: "transferOwnership(bytes32,address)",
  destroyToken: "destroyToken(bytes32)",
} as const;

export const TOKEN_FACTORY_SELECTORS = {
  createToken: selectorHex(TOKEN_FACTORY_SIGS.createToken),
  transfer: selectorHex(TOKEN_FACTORY_SIGS.transfer),
  transferFrom: selectorHex(TOKEN_FACTORY_SIGS.transferFrom),
  approve: selectorHex(TOKEN_FACTORY_SIGS.approve),
  increaseAllowance: selectorHex(TOKEN_FACTORY_SIGS.increaseAllowance),
  decreaseAllowance: selectorHex(TOKEN_FACTORY_SIGS.decreaseAllowance),
  balanceOf: selectorHex(TOKEN_FACTORY_SIGS.balanceOf),
  allowance: selectorHex(TOKEN_FACTORY_SIGS.allowance),
  totalSupply: selectorHex(TOKEN_FACTORY_SIGS.totalSupply),
  metadata: selectorHex(TOKEN_FACTORY_SIGS.metadata),
  mint: selectorHex(TOKEN_FACTORY_SIGS.mint),
  burn: selectorHex(TOKEN_FACTORY_SIGS.burn),
  setPaused: selectorHex(TOKEN_FACTORY_SIGS.setPaused),
  transferOwnership: selectorHex(TOKEN_FACTORY_SIGS.transferOwnership),
  destroyToken: selectorHex(TOKEN_FACTORY_SIGS.destroyToken),
} as const;

export type TokenFactoryAddressInput = string | Uint8Array | readonly number[];
export type TokenFactoryBytes32Input = string | Uint8Array | readonly number[];
export type TokenFactoryUintInput = bigint | number | string;

export interface CreateTokenCalldataArgs {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: TokenFactoryUintInput;
  /**
   * Zero means uncapped when `FIXED_SUPPLY` is not set. For fixed-supply
   * tokens, this must equal `initialSupply`.
   */
  maxSupply: TokenFactoryUintInput;
  flags?: number;
  creatorFeeBps?: number;
}

export interface CreateFixedSupplyMrc20CalldataArgs {
  name: string;
  symbol: string;
  decimals: number;
  supply: TokenFactoryUintInput;
  burnable?: boolean;
  pausable?: boolean;
  destructible?: boolean;
}

/** Return the token-factory precompile address (`0x1000`) as lower-case hex. */
export function tokenFactoryAddressHex(): string {
  return PRECOMPILE_ADDRESSES.TOKEN_FACTORY.toLowerCase();
}

/** Derive `tokenId = keccak256(0xFA || creator[20] || nonce_be[8])`. */
export function deriveTokenFactoryTokenId(
  creator: TokenFactoryAddressInput,
  creatorTokenNonce: TokenFactoryUintInput,
): string {
  const nonce = parseUint(creatorTokenNonce, "creatorTokenNonce", 64);
  return bytesToHex(
    keccak_256(
      concatBytes(
        new Uint8Array([TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG]),
        addressBytes(creator, "creator"),
        uint64Be(nonce),
      ),
    ),
  );
}

/** Encode `createToken(...)` calldata. Submit with value `0.003 LYTH`. */
export function encodeCreateTokenCalldata(args: CreateTokenCalldataArgs): string {
  const name = textBytes(args.name, "name", TOKEN_FACTORY_NAME_MAX_BYTES);
  const symbol = textBytes(args.symbol, "symbol", TOKEN_FACTORY_SYMBOL_MAX_BYTES);
  const decimals = parseSmallUint(args.decimals, "decimals", TOKEN_FACTORY_MAX_DECIMALS);
  const initialSupply = parseUint(args.initialSupply, "initialSupply");
  const maxSupply = parseUint(args.maxSupply, "maxSupply");
  const flags = args.flags ?? 0;
  validateTokenFactoryFlags(flags, args.creatorFeeBps ?? 0);
  const creatorFeeBps = parseSmallUint(
    args.creatorFeeBps ?? 0,
    "creatorFeeBps",
    TOKEN_FACTORY_MAX_CREATOR_FEE_BPS,
  );
  const headLen = 7 * 32;
  const nameTail = dynamicBytesTail(name);
  const symbolOffset = BigInt(headLen + nameTail.length);
  return bytesToHex(
    concatBytes(
      hexToBytes(TOKEN_FACTORY_SELECTORS.createToken, "createToken selector"),
      uint256Word(BigInt(headLen), "nameOffset"),
      uint256Word(symbolOffset, "symbolOffset"),
      uint256Word(BigInt(decimals), "decimals"),
      uint256Word(initialSupply, "initialSupply"),
      uint256Word(maxSupply, "maxSupply"),
      uint256Word(BigInt(flags), "flags"),
      uint256Word(BigInt(creatorFeeBps), "creatorFeeBps"),
      nameTail,
      dynamicBytesTail(symbol),
    ),
  );
}

/** Convenience builder for a standard fixed-supply MRC20-style token. */
export function encodeCreateFixedSupplyMrc20Calldata(args: CreateFixedSupplyMrc20CalldataArgs): string {
  let flags = TOKEN_FACTORY_FLAGS.FIXED_SUPPLY;
  if (args.burnable) flags |= TOKEN_FACTORY_FLAGS.BURNABLE;
  if (args.pausable) flags |= TOKEN_FACTORY_FLAGS.PAUSABLE;
  if (args.destructible) flags |= TOKEN_FACTORY_FLAGS.DESTRUCTIBLE;
  return encodeCreateTokenCalldata({
    name: args.name,
    symbol: args.symbol,
    decimals: args.decimals,
    initialSupply: args.supply,
    maxSupply: args.supply,
    flags,
    creatorFeeBps: 0,
  });
}

export function encodeTokenFactoryTransferCalldata(
  tokenId: TokenFactoryBytes32Input,
  to: TokenFactoryAddressInput,
  amount: TokenFactoryUintInput,
): string {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.transfer, tokenId, to, amount);
}

export function encodeTokenFactoryTransferFromCalldata(
  tokenId: TokenFactoryBytes32Input,
  from: TokenFactoryAddressInput,
  to: TokenFactoryAddressInput,
  amount: TokenFactoryUintInput,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(TOKEN_FACTORY_SELECTORS.transferFrom, "transferFrom selector"),
      bytes32(tokenId, "tokenId"),
      addressWord(from, "from"),
      addressWord(to, "to"),
      uint256Word(parseUint(amount, "amount"), "amount"),
    ),
  );
}

export function encodeTokenFactoryApproveCalldata(
  tokenId: TokenFactoryBytes32Input,
  spender: TokenFactoryAddressInput,
  amount: TokenFactoryUintInput,
): string {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.approve, tokenId, spender, amount);
}

export function encodeTokenFactoryIncreaseAllowanceCalldata(
  tokenId: TokenFactoryBytes32Input,
  spender: TokenFactoryAddressInput,
  delta: TokenFactoryUintInput,
): string {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.increaseAllowance, tokenId, spender, delta);
}

export function encodeTokenFactoryDecreaseAllowanceCalldata(
  tokenId: TokenFactoryBytes32Input,
  spender: TokenFactoryAddressInput,
  delta: TokenFactoryUintInput,
): string {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.decreaseAllowance, tokenId, spender, delta);
}

export function encodeTokenFactoryBalanceOfCalldata(
  tokenId: TokenFactoryBytes32Input,
  holder: TokenFactoryAddressInput,
): string {
  return encodeBytes32Address(TOKEN_FACTORY_SELECTORS.balanceOf, tokenId, holder);
}

export function encodeTokenFactoryAllowanceCalldata(
  tokenId: TokenFactoryBytes32Input,
  owner: TokenFactoryAddressInput,
  spender: TokenFactoryAddressInput,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(TOKEN_FACTORY_SELECTORS.allowance, "allowance selector"),
      bytes32(tokenId, "tokenId"),
      addressWord(owner, "owner"),
      addressWord(spender, "spender"),
    ),
  );
}

export function encodeTokenFactoryTotalSupplyCalldata(tokenId: TokenFactoryBytes32Input): string {
  return encodeBytes32(TOKEN_FACTORY_SELECTORS.totalSupply, tokenId);
}

export function encodeTokenFactoryMetadataCalldata(tokenId: TokenFactoryBytes32Input): string {
  return encodeBytes32(TOKEN_FACTORY_SELECTORS.metadata, tokenId);
}

export function encodeTokenFactoryMintCalldata(
  tokenId: TokenFactoryBytes32Input,
  to: TokenFactoryAddressInput,
  amount: TokenFactoryUintInput,
): string {
  return encodeBytes32AddressUint(TOKEN_FACTORY_SELECTORS.mint, tokenId, to, amount);
}

export function encodeTokenFactoryBurnCalldata(
  tokenId: TokenFactoryBytes32Input,
  amount: TokenFactoryUintInput,
): string {
  return encodeBytes32Uint(TOKEN_FACTORY_SELECTORS.burn, tokenId, amount);
}

export function encodeTokenFactorySetPausedCalldata(
  tokenId: TokenFactoryBytes32Input,
  paused: boolean,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(TOKEN_FACTORY_SELECTORS.setPaused, "setPaused selector"),
      bytes32(tokenId, "tokenId"),
      boolWord(paused),
    ),
  );
}

export function encodeTokenFactoryTransferOwnershipCalldata(
  tokenId: TokenFactoryBytes32Input,
  newOwner: TokenFactoryAddressInput,
): string {
  return encodeBytes32Address(TOKEN_FACTORY_SELECTORS.transferOwnership, tokenId, newOwner);
}

export function encodeTokenFactoryDestroyCalldata(tokenId: TokenFactoryBytes32Input): string {
  return encodeBytes32(TOKEN_FACTORY_SELECTORS.destroyToken, tokenId);
}

/** Decode a `bytes32 tokenId` return value. */
export function decodeTokenFactoryTokenId(output: string | Uint8Array | readonly number[]): string {
  return bytesToHex(bytes32(output, "output"));
}

export function validateTokenFactoryFlags(flags: number, creatorFeeBps = 0): void {
  if (!Number.isInteger(flags) || flags < 0 || flags > 0xffff_ffff) {
    throw new TokenFactoryError("flags must be a uint32");
  }
  if ((flags & ~TOKEN_FACTORY_KNOWN_FLAG_MASK) !== 0) {
    throw new TokenFactoryError("flags contain an unknown bit");
  }
  if ((flags & TOKEN_FACTORY_FLAGS.MINTABLE) !== 0 && (flags & TOKEN_FACTORY_FLAGS.FIXED_SUPPLY) !== 0) {
    throw new TokenFactoryError("MINTABLE and FIXED_SUPPLY are mutually exclusive");
  }
  if ((flags & TOKEN_FACTORY_FLAGS.CREATOR_FEE_OPT_IN) !== 0) {
    if (creatorFeeBps <= 0) throw new TokenFactoryError("CREATOR_FEE_OPT_IN requires non-zero creatorFeeBps");
  } else if (creatorFeeBps !== 0) {
    throw new TokenFactoryError("creatorFeeBps must be 0 when CREATOR_FEE_OPT_IN is unset");
  }
}

function encodeBytes32(selector: string, value: TokenFactoryBytes32Input): string {
  return bytesToHex(concatBytes(hexToBytes(selector, "selector"), bytes32(value, "tokenId")));
}

function encodeBytes32Uint(
  selector: string,
  tokenId: TokenFactoryBytes32Input,
  amount: TokenFactoryUintInput,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(selector, "selector"),
      bytes32(tokenId, "tokenId"),
      uint256Word(parseUint(amount, "amount"), "amount"),
    ),
  );
}

function encodeBytes32Address(
  selector: string,
  tokenId: TokenFactoryBytes32Input,
  address: TokenFactoryAddressInput,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(selector, "selector"),
      bytes32(tokenId, "tokenId"),
      addressWord(address, "address"),
    ),
  );
}

function encodeBytes32AddressUint(
  selector: string,
  tokenId: TokenFactoryBytes32Input,
  address: TokenFactoryAddressInput,
  amount: TokenFactoryUintInput,
): string {
  return bytesToHex(
    concatBytes(
      hexToBytes(selector, "selector"),
      bytes32(tokenId, "tokenId"),
      addressWord(address, "address"),
      uint256Word(parseUint(amount, "amount"), "amount"),
    ),
  );
}

function selectorHex(signature: string): string {
  const sel = keccak_256(new TextEncoder().encode(signature)).slice(0, 4);
  return bytesToHex(sel);
}

function textBytes(value: string, label: string, maxBytes: number): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length === 0 || bytes.length > maxBytes) {
    throw new TokenFactoryError(`${label} must be 1..=${maxBytes} UTF-8 bytes`);
  }
  return bytes;
}

function dynamicBytesTail(bytes: Uint8Array): Uint8Array {
  return concatBytes(uint256Word(BigInt(bytes.length), "length"), padTo32(bytes));
}

function padTo32(bytes: Uint8Array): Uint8Array {
  const padded = Math.ceil(bytes.length / 32) * 32;
  if (padded === bytes.length) return bytes;
  const out = new Uint8Array(padded);
  out.set(bytes);
  return out;
}

function addressWord(value: TokenFactoryAddressInput, label: string): Uint8Array {
  const out = new Uint8Array(32);
  out.set(addressBytes(value, label), 12);
  return out;
}

function addressBytes(value: TokenFactoryAddressInput, label: string): Uint8Array {
  const bytes = toBytes(value, label);
  if (bytes.length !== 20) {
    throw new TokenFactoryError(`${label} must be 20 bytes, got ${bytes.length}`);
  }
  return bytes;
}

function bytes32(value: TokenFactoryBytes32Input, label: string): Uint8Array {
  const bytes = toBytes(value, label);
  if (bytes.length !== 32) {
    throw new TokenFactoryError(`${label} must be 32 bytes, got ${bytes.length}`);
  }
  return bytes;
}

function boolWord(value: boolean): Uint8Array {
  const out = new Uint8Array(32);
  out[31] = value ? 1 : 0;
  return out;
}

function uint256Word(value: bigint, label: string): Uint8Array {
  if (value < 0n || value > (1n << 256n) - 1n) {
    throw new TokenFactoryError(`${label} out of uint256 range`);
  }
  const out = new Uint8Array(32);
  let rest = value;
  for (let i = 31; i >= 0 && rest > 0n; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function uint64Be(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let rest = value;
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function parseSmallUint(value: number, label: string, max: number): number {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new TokenFactoryError(`${label} must be an integer in 0..=${max}`);
  }
  return value;
}

function parseUint(value: TokenFactoryUintInput, label: string, bits = 256): bigint {
  let parsed: bigint;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TokenFactoryError(`${label} must be a safe integer`);
    parsed = BigInt(value);
  } else if (value.startsWith("0x") || value.startsWith("0X")) {
    parsed = BigInt(value);
  } else {
    if (!/^[0-9]+$/.test(value)) throw new TokenFactoryError(`${label} must be a non-negative integer`);
    parsed = BigInt(value);
  }
  if (parsed < 0n || parsed > (1n << BigInt(bits)) - 1n) {
    throw new TokenFactoryError(`${label} out of uint${bits} range`);
  }
  return parsed;
}

function toBytes(value: string | Uint8Array | readonly number[], label: string): Uint8Array {
  if (typeof value === "string") return hexToBytes(value, label);
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
