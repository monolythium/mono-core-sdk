import { keccak_256 } from "@noble/hashes/sha3.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import {
  ML_DSA_65_PUBLIC_KEY_LEN,
  ML_DSA_65_SIGNATURE_LEN,
  mlDsa65AddressFromPublicKey,
} from "./crypto/ml-dsa.js";
import type {
  NoEvmArchiveProof,
  NoEvmBoundedReceiptProof,
  NoEvmCompactReceiptProof,
  NoEvmReceiptProof,
} from "./client.js";

export const NO_EVM_RECEIPT_PROOF_SCHEMA = "mono.no_evm_receipt_proof.v1";
export const NO_EVM_RECEIPT_PROOF_TYPE = "canonicalReceiptsTranscript";
export const NO_EVM_RECEIPT_INCLUSION_PROOF_TYPE = "canonicalReceiptInclusion";
export const NO_EVM_RECEIPT_ROOT_ALGORITHM =
  "keccak256(monolythium/v4.1/receipts_root_empty/1|receipt_leaf/1|receipt_node/1 binary Merkle)";
export const NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM =
  "keccak256(monolythium/v2/receipts_root/1 || len || indexed bincode receipts)";
export const NO_EVM_RECEIPT_CODEC = "bincode(protocore_evm::Receipt)";
export const NO_EVM_RECEIPTS_ROOT_DOMAIN = "monolythium/v4.1/receipts_root_empty/1";
export const NO_EVM_RECEIPT_LEAF_DOMAIN = "monolythium/v4.1/receipt_leaf/1";
export const NO_EVM_RECEIPT_NODE_DOMAIN = "monolythium/v4.1/receipt_node/1";
export const NO_EVM_COMPACT_INCLUSION_PROOF_SCHEMA =
  "mono.no_evm_receipt_compact_inclusion.v1";
export const NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM = "binary-keccak-receipt-tree";
export const NO_EVM_ARCHIVE_PROOF_SCHEMA = "mono.no_evm_receipt_archive_binding.v1";
export const NO_EVM_ARCHIVE_SIGNATURE_SCHEME = "mono.snapshot.sig.v1";
export const NO_EVM_FINALITY_EVIDENCE_SCHEMA = "mono.no_evm_receipt_finality.v1";
export const NO_EVM_FINALITY_EVIDENCE_SOURCE = "blsRoundCertificate";

const EMPTY_ROOT_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPTS_ROOT_DOMAIN);
const LEAF_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPT_LEAF_DOMAIN);
const NODE_DOMAIN_BYTES = new TextEncoder().encode(NO_EVM_RECEIPT_NODE_DOMAIN);
const UINT32_MAX = 0xffff_ffff;
const HASH_BYTE_LENGTH = 32;
const ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH = 20;
const HEX_RE = /^[0-9a-fA-F]*$/u;

export type NoEvmReceiptProofErrorCode =
  | "unsupported_schema"
  | "unsupported_proof_kind"
  | "unsupported_proof_type"
  | "unsupported_history_source"
  | "unsupported_root_algorithm"
  | "unsupported_receipt_codec"
  | "unsupported_compact_schema"
  | "unsupported_tree_algorithm"
  | "invalid_uint32"
  | "invalid_hex"
  | "invalid_hash_length"
  | "invalid_archive_signature"
  | "invalid_proof_shape"
  | "missing_target_receipt_bytes"
  | "too_many_receipts"
  | "receipt_too_large"
  | "receipt_count_mismatch"
  | "tx_index_out_of_bounds"
  | "receipts_root_mismatch"
  | "target_receipt_hash_mismatch"
  | "compact_root_mismatch"
  | "compact_leaf_hash_mismatch"
  | "compact_path_mismatch";

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
  /** Full decoded transcript for bounded proofs; compact proofs carry only the target. */
  receipts: Uint8Array[];
  receiptsRoot: string;
  targetReceiptHash: string;
  receiptCount: number;
  txIndex: number;
  targetReceipt: Uint8Array;
  proofKind: "boundedCacheTranscript" | "compactInclusion";
}

export interface NoEvmArchiveTrustedSigner {
  publicKey: Uint8Array | readonly number[];
  signerId?: string;
}

export type NoEvmArchiveSignatureVerificationIssueCode =
  | "missing_signature_digest"
  | "threshold_not_met"
  | "duplicate_signer"
  | "untrusted_signer"
  | "invalid_signature"
  | "invalid_trusted_public_key";

export interface NoEvmArchiveSignatureVerificationIssue {
  code: NoEvmArchiveSignatureVerificationIssueCode;
  message: string;
  signatureIndex?: number;
  signerId?: string;
}

export interface NoEvmArchiveSignatureVerification {
  verified: boolean;
  threshold: number;
  validSigners: string[];
  checkedSignatures: number;
  issues: NoEvmArchiveSignatureVerificationIssue[];
}

export function decodeNoEvmReceiptTranscript(proof: NoEvmReceiptProof): Uint8Array[] {
  if (!Array.isArray(proof.receiptTranscript)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "boundedCacheTranscript proof requires receiptTranscript",
    );
  }

  return proof.receiptTranscript.map((hex, index) =>
    decodeHexBytes(hex, `receiptTranscript[${index}]`),
  );
}

export function computeNoEvmReceiptsRoot(receipts: readonly Uint8Array[]): string {
  return bytesToHex(computeNoEvmReceiptsRootBytes(receipts));
}

export function computeNoEvmTargetReceiptHash(receiptBytes: Uint8Array): string {
  return bytesToHex(keccak_256(receiptBytes));
}

export function verifyNoEvmReceiptProof(
  proof: NoEvmReceiptProof | null | undefined,
): NoEvmReceiptProofVerification | null {
  if (proof == null) return null;

  const proofKind = getProofKind(proof);
  switch (proofKind) {
    case "boundedCacheTranscript":
      return verifyBoundedReceiptProof(proof);
    case "compactInclusion":
      return verifyCompactReceiptProof(proof);
    default:
      throw new NoEvmReceiptProofError(
        "unsupported_proof_kind",
        `unsupported no-EVM receipt proofKind: ${proofKind}`,
      );
  }
}

export function verifyNoEvmArchiveProofSignatures(
  archiveProof: NoEvmArchiveProof,
  trustedSigners: readonly NoEvmArchiveTrustedSigner[],
  threshold: number,
): NoEvmArchiveSignatureVerification {
  if (!Number.isSafeInteger(threshold) || threshold < 1) {
    throw new NoEvmReceiptProofError("invalid_proof_shape", "threshold must be at least 1");
  }
  validateArchiveProofObject(archiveProof);

  const roster = new Map<string, Uint8Array>();
  trustedSigners.forEach((signer, index) => {
    const publicKey = expectArchivePublicKey(signer.publicKey, `trustedSigners[${index}].publicKey`);
    const signerId = mlDsa65AddressFromPublicKey(publicKey);
    if (signer.signerId !== undefined && normalizeSignerId(signer.signerId) !== signerId) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `trustedSigners[${index}].signerId does not match public key signer id ${signerId}`,
      );
    }
    if (roster.has(signerId)) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `trustedSigners contains duplicate signer id ${signerId}`,
      );
    }
    roster.set(signerId, publicKey);
  });

  const issues: NoEvmArchiveSignatureVerificationIssue[] = [];
  const digestValue = archiveProof.signatureDigest;
  if (digestValue === undefined) {
    issues.push({
      code: "missing_signature_digest",
      message: "archiveProof.signatureDigest is required for signature verification",
    });
    return {
      verified: false,
      threshold,
      validSigners: [],
      checkedSignatures: archiveProof.signatures.length,
      issues,
    };
  }
  const signatureDigest = decodeHash(digestValue, "archiveProof.signatureDigest");
  const seen = new Set<string>();
  const validSigners: string[] = [];

  archiveProof.signatures.forEach((signature, signatureIndex) => {
    const parsed = parseArchiveProofSignature(signature, signatureIndex);
    if (seen.has(parsed.signerId)) {
      issues.push({
        code: "duplicate_signer",
        message: `duplicate archive proof signer ${parsed.signerId}`,
        signatureIndex,
        signerId: parsed.signerId,
      });
      return;
    }
    seen.add(parsed.signerId);

    const publicKey = roster.get(parsed.signerId);
    if (publicKey === undefined) {
      issues.push({
        code: "untrusted_signer",
        message: `archive proof signer ${parsed.signerId} is not trusted`,
        signatureIndex,
        signerId: parsed.signerId,
      });
      return;
    }
    if (parsed.payload.length !== ML_DSA_65_SIGNATURE_LEN) {
      issues.push({
        code: "invalid_signature",
        message: `archive proof signature payload must be ${ML_DSA_65_SIGNATURE_LEN} bytes`,
        signatureIndex,
        signerId: parsed.signerId,
      });
      return;
    }
    let ok = false;
    try {
      ok = ml_dsa65.verify(parsed.payload, signatureDigest, publicKey);
    } catch {
      issues.push({
        code: "invalid_trusted_public_key",
        message: `trusted public key for ${parsed.signerId} is malformed`,
        signatureIndex,
        signerId: parsed.signerId,
      });
      return;
    }
    if (ok) {
      validSigners.push(parsed.signerId);
    } else {
      issues.push({
        code: "invalid_signature",
        message: `archive proof signature from ${parsed.signerId} is invalid`,
        signatureIndex,
        signerId: parsed.signerId,
      });
    }
  });

  if (validSigners.length < threshold) {
    issues.push({
      code: "threshold_not_met",
      message: `archive proof has ${validSigners.length} valid trusted signatures, below threshold ${threshold}`,
    });
  }

  return {
    verified: issues.length === 0,
    threshold,
    validSigners,
    checkedSignatures: archiveProof.signatures.length,
    issues,
  };
}

function verifyBoundedReceiptProof(proof: NoEvmReceiptProof): NoEvmReceiptProofVerification {
  validateCommonProofMetadata(proof);
  assertSupported(
    proof.proofType,
    NO_EVM_RECEIPT_PROOF_TYPE,
    "proofType",
    "unsupported_proof_type",
  );
  validateBoundedHistorySource(proof);
  validateNoCompactOrArchiveMaterial(proof);
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
    proofKind: "boundedCacheTranscript",
  };
}

function verifyCompactReceiptProof(proof: NoEvmReceiptProof): NoEvmReceiptProofVerification {
  validateCommonProofMetadata(proof);
  assertSupported(
    proof.proofType,
    NO_EVM_RECEIPT_INCLUSION_PROOF_TYPE,
    "proofType",
    "unsupported_proof_type",
  );
  validateCompactHistorySource(proof);
  validateOptionalArchiveProof(proof);
  assertUint32(proof.receiptCount, "receiptCount");
  assertUint32(proof.txIndex, "txIndex");

  const compactProof = getCompactInclusionProof(proof);
  assertSupported(
    compactProof.schema,
    NO_EVM_COMPACT_INCLUSION_PROOF_SCHEMA,
    "compactInclusionProof.schema",
    "unsupported_compact_schema",
  );
  assertSupported(
    compactProof.treeAlgorithm,
    NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM,
    "compactInclusionProof.treeAlgorithm",
    "unsupported_tree_algorithm",
  );

  if (!Array.isArray(compactProof.siblingHashes) || !Array.isArray(compactProof.pathSides)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "compactInclusionProof siblingHashes and pathSides must be arrays",
    );
  }
  if (compactProof.siblingHashes.length !== compactProof.pathSides.length) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "compactInclusionProof siblingHashes/pathSides length mismatch",
    );
  }

  const targetReceiptBytes = getTargetReceiptBytes(proof);
  const targetReceipt = decodeHexBytes(targetReceiptBytes, "targetReceiptBytes");
  const actualTargetHash = computeNoEvmTargetReceiptHash(targetReceipt);
  const expectedTargetHash = decodeHash(proof.targetReceiptHash, "targetReceiptHash");
  if (!bytesEqual(expectedTargetHash, decodeHash(actualTargetHash, "computedTargetReceiptHash"))) {
    throw new NoEvmReceiptProofError(
      "target_receipt_hash_mismatch",
      `targetReceiptHash mismatch: expected ${proof.targetReceiptHash}, computed ${actualTargetHash}`,
    );
  }

  const actualLeafHashBytes = computeNoEvmReceiptLeafHashBytes(targetReceipt, proof.txIndex);
  const expectedLeafHashBytes = decodeHash(
    compactProof.leafHash,
    "compactInclusionProof.leafHash",
  );
  if (!bytesEqual(expectedLeafHashBytes, actualLeafHashBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_leaf_hash_mismatch",
      `compactInclusionProof.leafHash mismatch: expected ${compactProof.leafHash}, computed ${bytesToHex(
        actualLeafHashBytes,
      )}`,
    );
  }

  const compactRootBytes = decodeHash(compactProof.root, "compactInclusionProof.root");
  const receiptsRootBytes = decodeHash(proof.receiptsRoot, "receiptsRoot");
  if (!bytesEqual(receiptsRootBytes, compactRootBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_root_mismatch",
      `receiptsRoot must equal compactInclusionProof.root: receiptsRoot ${proof.receiptsRoot}, compact root ${compactProof.root}`,
    );
  }

  const siblingHashes = compactProof.siblingHashes.map((hash, index) =>
    decodeHash(hash, `compactInclusionProof.siblingHashes[${index}]`),
  );
  const pathSides = compactProof.pathSides.map((side, index) => {
    if (typeof side !== "boolean") {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `compactInclusionProof.pathSides[${index}] must be a boolean`,
      );
    }
    return side;
  });
  const actualRootBytes = computeCompactRootFromPath(
    actualLeafHashBytes,
    siblingHashes,
    pathSides,
  );
  if (!bytesEqual(actualRootBytes, compactRootBytes)) {
    throw new NoEvmReceiptProofError(
      "compact_path_mismatch",
      `compact inclusion path mismatch: expected ${compactProof.root}, computed ${bytesToHex(
        actualRootBytes,
      )}`,
    );
  }

  return {
    receipts: [],
    receiptsRoot: bytesToHex(actualRootBytes),
    targetReceiptHash: actualTargetHash,
    receiptCount: proof.receiptCount,
    txIndex: proof.txIndex,
    targetReceipt,
    proofKind: "compactInclusion",
  };
}

function validateCommonProofMetadata(proof: NoEvmReceiptProof): void {
  assertSupported(
    proof.schema,
    NO_EVM_RECEIPT_PROOF_SCHEMA,
    "schema",
    "unsupported_schema",
  );
  assertSupportedRootAlgorithm(proof.rootAlgorithm);
  assertSupported(
    proof.receiptCodec,
    NO_EVM_RECEIPT_CODEC,
    "receiptCodec",
    "unsupported_receipt_codec",
  );
  validateOptionalFinalityEvidence(proof);
}

function validateBoundedHistorySource(proof: NoEvmReceiptProof): void {
  const historySource = getOptionalHistorySource(proof);
  if (
    historySource !== undefined &&
    historySource !== "legacyUnspecified" &&
    historySource !== "liveBlockCache"
  ) {
    throw new NoEvmReceiptProofError(
      "unsupported_history_source",
      `unsupported no-EVM receipt proof historySource: ${historySource}`,
    );
  }
}

function validateCompactHistorySource(proof: NoEvmReceiptProof): void {
  const historySource = getHistorySource(proof);
  if (historySource !== "liveBlockCache" && historySource !== "indexerReceiptArchive") {
    throw new NoEvmReceiptProofError(
      "unsupported_history_source",
      `unsupported no-EVM receipt proof historySource: ${historySource}`,
    );
  }
}

function validateNoCompactOrArchiveMaterial(proof: NoEvmReceiptProof): void {
  const maybeBounded = proof as NoEvmBoundedReceiptProof & {
    archiveProof?: unknown;
    compactInclusionProof?: unknown;
  };
  if (maybeBounded.compactInclusionProof != null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "boundedCacheTranscript proof cannot carry compactInclusionProof",
    );
  }
  if (maybeBounded.archiveProof != null) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "boundedCacheTranscript proof cannot carry archiveProof",
    );
  }
}

function validateOptionalArchiveProof(proof: NoEvmReceiptProof): void {
  const archiveProof = (proof as NoEvmCompactReceiptProof).archiveProof;
  if (archiveProof == null) return;
  validateArchiveProofObject(archiveProof);
}

function validateArchiveProofObject(archiveProof: NoEvmArchiveProof | unknown): void {
  if (!isRecord(archiveProof)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof must be an object when present",
    );
  }
  assertSupported(
    archiveProof.schema,
    NO_EVM_ARCHIVE_PROOF_SCHEMA,
    "archiveProof.schema",
    "unsupported_schema",
  );
  if (typeof archiveProof.source !== "string" || archiveProof.source.length === 0) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.source must be a non-empty string",
    );
  }
  decodeHash(archiveProof.manifestHash, "archiveProof.manifestHash");
  decodeHash(archiveProof.contentHash, "archiveProof.contentHash");
  if (archiveProof.signatureDigest !== undefined) {
    decodeHash(archiveProof.signatureDigest, "archiveProof.signatureDigest");
  }
  if (
    !Array.isArray(archiveProof.signatures) ||
    archiveProof.signatures.some((signature) => typeof signature !== "string")
  ) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "archiveProof.signatures must be an array of strings",
    );
  }
  archiveProof.signatures.forEach((signature, index) =>
    validateArchiveProofSignature(signature, index),
  );
}

function validateArchiveProofSignature(signature: string, index: number): void {
  parseArchiveProofSignature(signature, index);
}

function parseArchiveProofSignature(
  signature: string,
  index: number,
): { signerId: string; payload: Uint8Array } {
  const field = `archiveProof.signatures[${index}]`;
  const parts = signature.split(":");
  if (parts.length !== 3 || parts[0] !== NO_EVM_ARCHIVE_SIGNATURE_SCHEME) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field} must match ${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x<20-byte signer-id hex>:0x<non-empty payload hex>`,
    );
  }

  const signerIdHex = parts[1]!;
  const payloadHex = parts[2]!;
  if (!signerIdHex.startsWith("0x")) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field}.signerId must be 0x-prefixed`,
    );
  }
  if (!payloadHex.startsWith("0x")) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field}.payload must be 0x-prefixed`,
    );
  }

  const signerId = decodeHexBytes(signerIdHex, `${field}.signerId`);
  if (signerId.length !== ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field}.signerId must be ${ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH} bytes, got ${signerId.length}`,
    );
  }

  const payload = decodeHexBytes(payloadHex, `${field}.payload`);
  if (payload.length === 0) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `${field}.payload must be non-empty`,
    );
  }
  return { signerId: bytesToHex(signerId), payload };
}

function normalizeSignerId(value: string): string {
  const bytes = decodeHexBytes(value, "signerId");
  if (bytes.length !== ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_archive_signature",
      `signerId must be ${ARCHIVE_SIGNATURE_SIGNER_ID_BYTE_LENGTH} bytes, got ${bytes.length}`,
    );
  }
  return bytesToHex(bytes);
}

function expectArchivePublicKey(value: Uint8Array | readonly number[], field: string): Uint8Array {
  if (value.length !== ML_DSA_65_PUBLIC_KEY_LEN) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      `${field} must be ${ML_DSA_65_PUBLIC_KEY_LEN} bytes, got ${value.length}`,
    );
  }
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function validateOptionalFinalityEvidence(proof: NoEvmReceiptProof): void {
  const finalityEvidence = (proof as { finalityEvidence?: unknown }).finalityEvidence;
  if (finalityEvidence == null) return;
  if (!isRecord(finalityEvidence)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence must be an object when present",
    );
  }
  assertSupported(
    finalityEvidence["schema"],
    NO_EVM_FINALITY_EVIDENCE_SCHEMA,
    "finalityEvidence.schema",
    "unsupported_schema",
  );
  assertSupported(
    finalityEvidence["source"],
    NO_EVM_FINALITY_EVIDENCE_SOURCE,
    "finalityEvidence.source",
    "unsupported_schema",
  );
  assertUint32(finalityEvidence["round"], "finalityEvidence.round");
  const certificate = finalityEvidence["certificate"];
  if (!isRecord(certificate)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate must be an object",
    );
  }
  assertUint32(certificate["round"], "finalityEvidence.certificate.round");
  if (certificate["round"] !== finalityEvidence["round"]) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.round must match finalityEvidence.round",
    );
  }
  decodeHexBytes(certificate["signature"], "finalityEvidence.certificate.signature");
  decodeHexBytes(certificate["signersBitmap"], "finalityEvidence.certificate.signersBitmap");
  const signerIndices = certificate["signerIndices"];
  if (!Array.isArray(signerIndices)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.signerIndices must be an array",
    );
  }
  signerIndices.forEach((index, signerIndex) => {
    assertUint32(index, `finalityEvidence.certificate.signerIndices[${signerIndex}]`);
    if ((index as number) > 0xffff) {
      throw new NoEvmReceiptProofError(
        "invalid_proof_shape",
        `finalityEvidence.certificate.signerIndices[${signerIndex}] must fit u16`,
      );
    }
  });
  assertUint32(certificate["signerCount"], "finalityEvidence.certificate.signerCount");
  if ((certificate["signerCount"] as number) > 0xffff) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.signerCount must fit u16",
    );
  }
  if (certificate["signerCount"] !== signerIndices.length) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "finalityEvidence.certificate.signerCount must match signerIndices length",
    );
  }
}

function getCompactInclusionProof(
  proof: NoEvmReceiptProof,
): NoEvmCompactReceiptProof["compactInclusionProof"] {
  const compactProof = (proof as NoEvmCompactReceiptProof).compactInclusionProof;
  if (!isRecord(compactProof)) {
    throw new NoEvmReceiptProofError(
      "invalid_proof_shape",
      "compactInclusion proof requires compactInclusionProof",
    );
  }
  return compactProof as NoEvmCompactReceiptProof["compactInclusionProof"];
}

function getTargetReceiptBytes(proof: NoEvmReceiptProof): string {
  const value = (proof as NoEvmCompactReceiptProof & { targetReceiptBytes?: unknown })
    .targetReceiptBytes;
  if (typeof value !== "string") {
    throw new NoEvmReceiptProofError(
      "missing_target_receipt_bytes",
      "compactInclusion proof requires targetReceiptBytes",
    );
  }
  return value;
}

function getProofKind(proof: NoEvmReceiptProof): string {
  return (proof as { proofKind?: unknown }).proofKind === undefined
    ? "boundedCacheTranscript"
    : String((proof as { proofKind?: unknown }).proofKind);
}

function getHistorySource(proof: NoEvmReceiptProof): string {
  return getOptionalHistorySource(proof) ?? "legacyUnspecified";
}

function getOptionalHistorySource(proof: NoEvmReceiptProof): string | undefined {
  const value = (proof as { historySource?: unknown }).historySource;
  return value === undefined ? undefined : String(value);
}

function assertSupportedRootAlgorithm(actual: string): void {
  if (
    actual !== NO_EVM_RECEIPT_ROOT_ALGORITHM &&
    actual !== NO_EVM_LEGACY_RECEIPT_ROOT_ALGORITHM &&
    actual !== NO_EVM_COMPACT_INCLUSION_TREE_ALGORITHM
  ) {
    throw new NoEvmReceiptProofError(
      "unsupported_root_algorithm",
      `unsupported no-EVM receipt proof rootAlgorithm: ${actual}`,
    );
  }
}

function assertSupported(
  actual: unknown,
  expected: string,
  field: string,
  code: NoEvmReceiptProofErrorCode,
): void {
  if (actual !== expected) {
    throw new NoEvmReceiptProofError(code, `unsupported no-EVM receipt proof ${field}: ${actual}`);
  }
}

function assertUint32(value: unknown, field: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > UINT32_MAX) {
    throw new NoEvmReceiptProofError("invalid_uint32", `${field} must be a uint32`);
  }
}

function computeNoEvmReceiptsRootBytes(receipts: readonly Uint8Array[]): Uint8Array {
  if (receipts.length > UINT32_MAX) {
    throw new NoEvmReceiptProofError(
      "too_many_receipts",
      `receiptTranscript has ${receipts.length} receipts, exceeding u32::MAX`,
    );
  }

  if (receipts.length === 0) {
    const preimage = new Uint8Array(EMPTY_ROOT_DOMAIN_BYTES.length + 4);
    const view = new DataView(preimage.buffer);
    preimage.set(EMPTY_ROOT_DOMAIN_BYTES, 0);
    view.setUint32(EMPTY_ROOT_DOMAIN_BYTES.length, 0, true);
    return keccak_256(preimage);
  }

  let level = receipts.map((receipt, index) => computeNoEvmReceiptLeafHashBytes(receipt, index));
  while (level.length > 1) {
    const nextLevel: Uint8Array[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]!;
      const right = level[index + 1] ?? left;
      nextLevel.push(computeNoEvmReceiptNodeHashBytes(left, right));
    }
    level = nextLevel;
  }
  return level[0]!;
}

function computeNoEvmReceiptLeafHashBytes(receiptBytes: Uint8Array, txIndex: number): Uint8Array {
  assertUint32(txIndex, "txIndex");
  if (receiptBytes.length > UINT32_MAX) {
    throw new NoEvmReceiptProofError(
      "receipt_too_large",
      `receiptTranscript[${txIndex}] has ${receiptBytes.length} bytes, exceeding u32::MAX`,
    );
  }

  const preimage = new Uint8Array(LEAF_DOMAIN_BYTES.length + 8 + receiptBytes.length);
  const view = new DataView(preimage.buffer);
  let offset = 0;
  preimage.set(LEAF_DOMAIN_BYTES, offset);
  offset += LEAF_DOMAIN_BYTES.length;
  view.setUint32(offset, txIndex, true);
  offset += 4;
  view.setUint32(offset, receiptBytes.length, true);
  offset += 4;
  preimage.set(receiptBytes, offset);
  return keccak_256(preimage);
}

function computeNoEvmReceiptNodeHashBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  assertHashBytes(left, "left receipt node hash");
  assertHashBytes(right, "right receipt node hash");

  const preimage = new Uint8Array(NODE_DOMAIN_BYTES.length + HASH_BYTE_LENGTH * 2);
  let offset = 0;
  preimage.set(NODE_DOMAIN_BYTES, offset);
  offset += NODE_DOMAIN_BYTES.length;
  preimage.set(left, offset);
  offset += HASH_BYTE_LENGTH;
  preimage.set(right, offset);
  return keccak_256(preimage);
}

function computeCompactRootFromPath(
  leafHash: Uint8Array,
  siblingHashes: readonly Uint8Array[],
  pathSides: readonly boolean[],
): Uint8Array {
  let current = leafHash;
  for (let index = 0; index < siblingHashes.length; index++) {
    const sibling = siblingHashes[index]!;
    current = pathSides[index]!
      ? computeNoEvmReceiptNodeHashBytes(sibling, current)
      : computeNoEvmReceiptNodeHashBytes(current, sibling);
  }
  return current;
}

function decodeHash(value: unknown, field: string): Uint8Array {
  const bytes = decodeHexBytes(value, field);
  if (bytes.length !== HASH_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field} must be 32 bytes, got ${bytes.length}`,
    );
  }
  return bytes;
}

function decodeHexBytes(value: unknown, field: string): Uint8Array {
  if (typeof value !== "string" || !(value.startsWith("0x") || value.startsWith("0X"))) {
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

function assertHashBytes(value: Uint8Array, field: string): void {
  if (value.length !== HASH_BYTE_LENGTH) {
    throw new NoEvmReceiptProofError(
      "invalid_hash_length",
      `${field} must be 32 bytes, got ${value.length}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
