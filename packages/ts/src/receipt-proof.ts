import { keccak_256 } from "@noble/hashes/sha3.js";
import type { NoEvmReceiptProof } from "./client.js";

export const NO_EVM_RECEIPT_PROOF_SCHEMA = "mono.no_evm_receipt_proof.v1";
export const NO_EVM_RECEIPT_PROOF_TYPE = "canonicalReceiptsTranscript";
export const NO_EVM_RECEIPT_ROOT_ALGORITHM =
  "keccak256(monolythium/v2/receipts_root/1 || len || indexed bincode receipts)";
export const NO_EVM_RECEIPT_CODEC = "bincode(protocore_evm::Receipt)";
export const NO_EVM_RECEIPTS_ROOT_DOMAIN = "monolythium/v2/receipts_root/1";

const ROOT_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPTS_ROOT_DOMAIN);
const UINT32_MAX = 0xffff_ffff;
const HEX_RE = /^[0-9a-fA-F]*$/u;

export type NoEvmReceiptProofErrorCode =
  | "unsupported_schema"
  | "unsupported_proof_type"
  | "unsupported_root_algorithm"
  | "unsupported_receipt_codec"
  | "invalid_uint32"
  | "invalid_hex"
  | "invalid_hash_length"
  | "too_many_receipts"
  | "receipt_too_large"
  | "receipt_count_mismatch"
  | "tx_index_out_of_bounds"
  | "receipts_root_mismatch"
  | "target_receipt_hash_mismatch";

export class NoEvmReceiptProofError extends Error {
  constructor(
    public readonly code: NoEvmReceiptProofErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "NoEvmReceiptProofError";
  }
}

export interface NoEvmReceiptProofVerification {
  receipts: Uint8Array[];
  receiptsRoot: string;
  targetReceiptHash: string;
  receiptCount: number;
  txIndex: number;
  targetReceipt: Uint8Array;
}

export function decodeNoEvmReceiptTranscript(proof: NoEvmReceiptProof): Uint8Array[] {
  return proof.receiptTranscript.map((hex, index) =>
    decodeHexBytes(hex, `receiptTranscript[${index}]`),
  );
}

export function computeNoEvmReceiptsRoot(receipts: readonly Uint8Array[]): string {
  if (receipts.length > UINT32_MAX) {
    throw new NoEvmReceiptProofError(
      "too_many_receipts",
      `receiptTranscript has ${receipts.length} receipts, exceeding u32::MAX`,
    );
  }

  let totalLen = ROOT_DOMAIN_BYTES.length + 4;
  receipts.forEach((receipt, index) => {
    if (receipt.length > UINT32_MAX) {
      throw new NoEvmReceiptProofError(
        "receipt_too_large",
        `receiptTranscript[${index}] has ${receipt.length} bytes, exceeding u32::MAX`,
      );
    }
    totalLen += 8 + receipt.length;
  });

  const preimage = new Uint8Array(totalLen);
  const view = new DataView(preimage.buffer);
  let offset = 0;
  preimage.set(ROOT_DOMAIN_BYTES, offset);
  offset += ROOT_DOMAIN_BYTES.length;
  view.setUint32(offset, receipts.length, true);
  offset += 4;

  receipts.forEach((receipt, index) => {
    view.setUint32(offset, index, true);
    offset += 4;
    view.setUint32(offset, receipt.length, true);
    offset += 4;
    preimage.set(receipt, offset);
    offset += receipt.length;
  });

  return bytesToHex(keccak_256(preimage));
}

export function computeNoEvmTargetReceiptHash(receiptBytes: Uint8Array): string {
  return bytesToHex(keccak_256(receiptBytes));
}

export function verifyNoEvmReceiptProof(
  proof: NoEvmReceiptProof | null | undefined,
): NoEvmReceiptProofVerification | null {
  if (proof == null) return null;

  validateProofMetadata(proof);
  assertUint32(proof.receiptCount, "receiptCount");
  assertUint32(proof.txIndex, "txIndex");

  const receipts = decodeNoEvmReceiptTranscript(proof);
  if (proof.receiptCount !== receipts.length) {
    throw new NoEvmReceiptProofError(
      "receipt_count_mismatch",
      `receiptCount declares ${proof.receiptCount} receipts but receiptTranscript has ${receipts.length}`,
    );
  }

  const targetReceipt = receipts[proof.txIndex];
  if (targetReceipt === undefined) {
    throw new NoEvmReceiptProofError(
      "tx_index_out_of_bounds",
      `txIndex ${proof.txIndex} is out of bounds for ${receipts.length} decoded receipts`,
    );
  }

  const actualRoot = computeNoEvmReceiptsRoot(receipts);
  const expectedRoot = decodeHash(proof.receiptsRoot, "receiptsRoot");
  if (!bytesEqual(expectedRoot, decodeHash(actualRoot, "computedReceiptsRoot"))) {
    throw new NoEvmReceiptProofError(
      "receipts_root_mismatch",
      `receiptsRoot mismatch: expected ${proof.receiptsRoot}, computed ${actualRoot}`,
    );
  }

  const actualTargetHash = computeNoEvmTargetReceiptHash(targetReceipt);
  const expectedTargetHash = decodeHash(proof.targetReceiptHash, "targetReceiptHash");
  if (!bytesEqual(expectedTargetHash, decodeHash(actualTargetHash, "computedTargetReceiptHash"))) {
    throw new NoEvmReceiptProofError(
      "target_receipt_hash_mismatch",
      `targetReceiptHash mismatch: expected ${proof.targetReceiptHash}, computed ${actualTargetHash}`,
    );
  }

  return {
    receipts,
    receiptsRoot: actualRoot,
    targetReceiptHash: actualTargetHash,
    receiptCount: receipts.length,
    txIndex: proof.txIndex,
    targetReceipt,
  };
}

function validateProofMetadata(proof: NoEvmReceiptProof): void {
  assertSupported(
    proof.schema,
    NO_EVM_RECEIPT_PROOF_SCHEMA,
    "schema",
    "unsupported_schema",
  );
  assertSupported(
    proof.proofType,
    NO_EVM_RECEIPT_PROOF_TYPE,
    "proofType",
    "unsupported_proof_type",
  );
  assertSupported(
    proof.rootAlgorithm,
    NO_EVM_RECEIPT_ROOT_ALGORITHM,
    "rootAlgorithm",
    "unsupported_root_algorithm",
  );
  assertSupported(
    proof.receiptCodec,
    NO_EVM_RECEIPT_CODEC,
    "receiptCodec",
    "unsupported_receipt_codec",
  );
}

function assertSupported(
  actual: string,
  expected: string,
  field: string,
  code: NoEvmReceiptProofErrorCode,
): void {
  if (actual !== expected) {
    throw new NoEvmReceiptProofError(code, `unsupported no-EVM receipt proof ${field}: ${actual}`);
  }
}

function assertUint32(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new NoEvmReceiptProofError("invalid_uint32", `${field} must be a uint32`);
  }
}

function decodeHash(value: string, field: string): Uint8Array {
  const bytes = decodeHexBytes(value, field);
  if (bytes.length !== 32) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field} must be 32 bytes, got ${bytes.length}`,
    );
  }
  return bytes;
}

function decodeHexBytes(value: string, field: string): Uint8Array {
  if (!(value.startsWith("0x") || value.startsWith("0X"))) {
    throw new NoEvmReceiptProofError("invalid_hex", `${field} must be 0x-prefixed even-length hex`);
  }
  const body = value.slice(2);
  if (body.length % 2 !== 0 || !HEX_RE.test(body)) {
    throw new NoEvmReceiptProofError("invalid_hex", `${field} must be 0x-prefixed even-length hex`);
  }

  const out = new Uint8Array(body.length / 2);
  for (let index = 0; index < out.length; index++) {
    out[index] = Number.parseInt(body.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a[index]! ^ b[index]!;
  }
  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "0x";
  for (let index = 0; index < bytes.length; index++) {
    out += bytes[index]!.toString(16).padStart(2, "0");
  }
  return out;
}
