/**
 * Address display helpers.
 *
 * Monolythium keeps 20-byte account identifiers on the wire, but
 * user-facing surfaces display them as `mono1...` bech32m strings.
 */

export const ADDRESS_HRP = "mono" as const;
export const ADDRESS_KIND_HRPS = {
  user: "mono",
  smartAccount: "monos",
  contract: "monoc",
  cluster: "monok",
  multisig: "monom",
  systemModule: "monox",
} as const;
export const RESERVED_ADDRESS_HRPS = ["monor", "monop", "monoi", "monoa"] as const;

export type AddressKind = keyof typeof ADDRESS_KIND_HRPS;

export interface TypedAddress {
  kind: AddressKind;
  address: string;
  bytes: Uint8Array;
  hex: string;
}

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CHARSET_MAP = new Map([...CHARSET].map((c, i) => [c, i]));
const BECH32M_CONST = 0x2bc830a3;
const HEX_20_BYTE_RE = /^0x[0-9a-fA-F]{40}$/;

export class AddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddressError";
  }
}

export function hexToAddressBytes(address: string): Uint8Array {
  if (!HEX_20_BYTE_RE.test(address)) {
    throw new AddressError("expected 0x-prefixed 20-byte hex address");
  }
  const out = new Uint8Array(20);
  const body = address.slice(2);
  for (let i = 0; i < 20; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function addressBytesToHex(address: Uint8Array | readonly number[]): string {
  const bytes = expectLength(address, 20, "address");
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function addressToBech32(address: string | Uint8Array | readonly number[]): string {
  return addressToTypedBech32("user", address);
}

export function addressToTypedBech32(
  kind: AddressKind,
  address: string | Uint8Array | readonly number[],
): string {
  const bytes = typeof address === "string" ? hexToAddressBytes(address) : expectLength(address, 20, "address");
  return encodeBech32m(ADDRESS_KIND_HRPS[kind], bytes);
}

function encodeBech32m(hrp: string, bytes: Uint8Array): string {
  const words = convertBits([...bytes], 8, 5, true);
  const checksum = createChecksum(hrp, words);
  return `${hrp}1${[...words, ...checksum].map((v) => CHARSET[v]).join("")}`;
}

export function bech32ToAddressBytes(address: string): Uint8Array {
  return typedBech32ToAddress(address, "user").bytes;
}

export function bech32ToAddress(address: string): string {
  return addressBytesToHex(bech32ToAddressBytes(address));
}

export function typedBech32ToAddress(address: string, expectedKind?: AddressKind): TypedAddress {
  const parsed = decodeBech32m(address);
  if ((RESERVED_ADDRESS_HRPS as readonly string[]).includes(parsed.hrp)) {
    throw new AddressError(`reserved address hrp '${parsed.hrp}'`);
  }
  const kind = addressKindFromHrp(parsed.hrp);
  if (kind === undefined) {
    throw new AddressError(`unknown address hrp '${parsed.hrp}'`);
  }
  if (expectedKind !== undefined && kind !== expectedKind) {
    throw new AddressError(`unexpected hrp '${parsed.hrp}', expected '${ADDRESS_KIND_HRPS[expectedKind]}'`);
  }
  const bytes = convertBits(parsed.data, 5, 8, false);
  if (bytes.length !== 20) {
    throw new AddressError(`expected 20-byte payload, got ${bytes.length} bytes`);
  }
  const out = Uint8Array.from(bytes);
  return { kind, address: address.toLowerCase(), bytes: out, hex: addressBytesToHex(out) };
}

export function requireTypedAddress(
  address: string,
  expectedKind: AddressKind,
  label = "address",
): string {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    throw new AddressError(
      `${label} raw 0x addresses are retired; use typed ${ADDRESS_KIND_HRPS[expectedKind]} bech32m addresses`,
    );
  }
  try {
    return typedBech32ToAddress(address, expectedKind).address;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AddressError(
      `${label} must be typed ${ADDRESS_KIND_HRPS[expectedKind]} bech32m address: ${message}`,
    );
  }
}

export function parseAddress(address: string): Uint8Array {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    return hexToAddressBytes(address);
  }
  return bech32ToAddressBytes(address);
}

export function normalizeAddressHex(address: string): string {
  return addressBytesToHex(parseAddress(address));
}

function decodeBech32m(input: string): { hrp: string; data: number[] } {
  if (input.length < 8) {
    throw new AddressError("bech32m address is too short");
  }
  const hasLower = input !== input.toUpperCase();
  const hasUpper = input !== input.toLowerCase();
  if (hasLower && hasUpper) {
    throw new AddressError("bech32m address cannot mix upper and lower case");
  }
  const s = input.toLowerCase();
  const sep = s.lastIndexOf("1");
  if (sep <= 0 || sep + 7 > s.length) {
    throw new AddressError("bech32m separator/checksum shape is invalid");
  }
  const hrp = s.slice(0, sep);
  const values: number[] = [];
  for (const c of s.slice(sep + 1)) {
    const v = CHARSET_MAP.get(c);
    if (v === undefined) {
      throw new AddressError(`invalid bech32m character '${c}'`);
    }
    values.push(v);
  }
  if (!verifyChecksum(hrp, values)) {
    throw new AddressError("bech32m checksum mismatch");
  }
  return { hrp, data: values.slice(0, -6) };
}

function addressKindFromHrp(hrp: string): AddressKind | undefined {
  for (const [kind, kindHrp] of Object.entries(ADDRESS_KIND_HRPS) as Array<[AddressKind, string]>) {
    if (kindHrp === hrp) return kind;
  }
  return undefined;
}

function hrpExpand(hrp: string): number[] {
  const high = [...hrp].map((c) => c.charCodeAt(0) >> 5);
  const low = [...hrp].map((c) => c.charCodeAt(0) & 31);
  return [...high, 0, ...low];
}

function polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if (((top >> i) & 1) === 1) {
        chk ^= generators[i];
      }
    }
  }
  return chk >>> 0;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = polymod(values) ^ BECH32M_CONST;
  const out: number[] = [];
  for (let p = 0; p < 6; p++) {
    out.push((mod >> (5 * (5 - p))) & 31);
  }
  return out;
}

function verifyChecksum(hrp: string, values: number[]): boolean {
  return polymod([...hrpExpand(hrp), ...values]) === BECH32M_CONST;
}

function convertBits(data: readonly number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1;
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) {
      throw new AddressError("invalid address payload value");
    }
    acc = ((acc << fromBits) | value) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    throw new AddressError("invalid bech32m padding");
  }
  return ret;
}

function expectLength(value: Uint8Array | readonly number[], len: number, name: string): Uint8Array {
  if (value.length !== len) {
    throw new AddressError(`${name} must be ${len} bytes`);
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}
