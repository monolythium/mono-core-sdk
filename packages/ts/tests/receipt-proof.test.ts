import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  NO_EVM_ARCHIVE_SIGNATURE_SCHEME,
  NO_EVM_RECEIPT_CODEC,
  NO_EVM_RECEIPT_PROOF_SCHEMA,
  NO_EVM_RECEIPT_PROOF_TYPE,
  NO_EVM_RECEIPT_ROOT_ALGORITHM,
  NoEvmReceiptProofError,
  computeNoEvmReceiptsRoot,
  computeNoEvmTargetReceiptHash,
  decodeNoEvmReceiptTranscript,
  verifyNoEvmReceiptProof,
} from "../src/index.js";
import type { NoEvmReceiptProof } from "../src/index.js";
import type { NoEvmCompactReceiptProof } from "../src/client.js";

const RECEIPTS = [
  new Uint8Array([0x01, 0x02, 0x03]),
  new Uint8Array([0x04, 0x05, 0x06, 0x07]),
  new Uint8Array([]),
];
const COMPACT_INCLUSION_SCHEMA = "mono.no_evm_receipt_compact_inclusion.v1";
const COMPACT_TREE_ALGORITHM = "binary-keccak-receipt-tree";
const COMPACT_PROOF_TYPE = "canonicalReceiptInclusion";
const RECEIPT_ROOT_EMPTY_DOMAIN = new TextEncoder().encode(
  "monolythium/v4.1/receipts_root_empty/1",
);
const RECEIPT_LEAF_DOMAIN = new TextEncoder().encode("monolythium/v4.1/receipt_leaf/1");
const RECEIPT_NODE_DOMAIN = new TextEncoder().encode("monolythium/v4.1/receipt_node/1");
const VALID_ARCHIVE_SIGNATURE = `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(
  20,
)}:0x${"ab".repeat(64)}`;

function noEvmProof(): NoEvmReceiptProof {
  return {
    schema: NO_EVM_RECEIPT_PROOF_SCHEMA,
    proofKind: "boundedCacheTranscript",
    proofType: NO_EVM_RECEIPT_PROOF_TYPE,
    historySource: "liveBlockCache",
    compactInclusionProof: null,
    archiveProof: null,
    rootAlgorithm: NO_EVM_RECEIPT_ROOT_ALGORITHM,
    receiptCodec: NO_EVM_RECEIPT_CODEC,
    blockHash: `0x${"22".repeat(32)}`,
    txHash: `0x${"11".repeat(32)}`,
    receiptsRoot: computeNoEvmReceiptsRoot(RECEIPTS),
    targetReceiptHash: "0xf53a5554601329f91c1b8baec5d7270102bd621873e3b119aff9c83c1d73d86c",
    blockHeight: 100,
    txIndex: 1,
    receiptCount: RECEIPTS.length,
    receiptTranscript: RECEIPTS.map(bytesToHex),
  };
}

function compactNoEvmProof(): NoEvmCompactReceiptProof {
  const material = compactInclusionMaterial(RECEIPTS, 1);
  return {
    schema: NO_EVM_RECEIPT_PROOF_SCHEMA,
    proofKind: "compactInclusion",
    proofType: COMPACT_PROOF_TYPE,
    historySource: "liveBlockCache",
    compactInclusionProof: {
      schema: COMPACT_INCLUSION_SCHEMA,
      treeAlgorithm: COMPACT_TREE_ALGORITHM,
      root: material.root,
      leafHash: material.leafHash,
      siblingHashes: material.siblingHashes,
      pathSides: material.pathSides,
    },
    archiveProof: null,
    rootAlgorithm: NO_EVM_RECEIPT_ROOT_ALGORITHM,
    receiptCodec: NO_EVM_RECEIPT_CODEC,
    blockHash: `0x${"22".repeat(32)}`,
    txHash: `0x${"11".repeat(32)}`,
    receiptsRoot: material.root,
    targetReceiptHash: computeNoEvmTargetReceiptHash(RECEIPTS[1]!),
    blockHeight: 100,
    txIndex: 1,
    receiptCount: RECEIPTS.length,
    targetReceiptBytes: bytesToHex(RECEIPTS[1]!),
  };
}

function compactNoEvmArchiveProof(signatures: string[] = []): NoEvmCompactReceiptProof {
  return {
    ...compactNoEvmProof(),
    historySource: "indexerReceiptArchive",
    archiveProof: {
      schema: "mono.no_evm_receipt_archive_binding.v1",
      source: "indexerReceiptArchiveContentDigest",
      manifestHash: `0x${"53".repeat(32)}`,
      contentHash: `0x${"54".repeat(32)}`,
      signatures,
    },
    missingProofMaterial: [
      "signed archive or snapshot manifest binding receipt bytes to blockHash and receiptsRoot",
    ],
  };
}

describe("no-EVM receipt proof helpers", () => {
  it("verifies valid transcripts and accepts null proofs", () => {
    const proof = noEvmProof();

    expect(computeNoEvmReceiptsRoot(RECEIPTS)).toBe(proof.receiptsRoot);
    expect(computeNoEvmTargetReceiptHash(RECEIPTS[1]!)).toBe(proof.targetReceiptHash);
    expect(decodeNoEvmReceiptTranscript(proof).map((receipt) => Array.from(receipt))).toEqual([
      [0x01, 0x02, 0x03],
      [0x04, 0x05, 0x06, 0x07],
      [],
    ]);

    const verified = verifyNoEvmReceiptProof(proof);
    expect(verified?.receiptsRoot).toBe(proof.receiptsRoot);
    expect(verified?.targetReceiptHash).toBe(proof.targetReceiptHash);
    expect(verified?.receiptCount).toBe(3);
    expect(verified?.txIndex).toBe(1);
    expect(verified?.proofKind).toBe("boundedCacheTranscript");
    expect(Array.from(verified?.targetReceipt ?? [])).toEqual([0x04, 0x05, 0x06, 0x07]);
    expect(verifyNoEvmReceiptProof(null)).toBeNull();
    expect(verifyNoEvmReceiptProof(undefined)).toBeNull();
  });

  it("rejects count, root, target hash, and txIndex mismatches", () => {
    expect(() => verifyNoEvmReceiptProof({ ...noEvmProof(), receiptCount: 2 })).toThrow(
      NoEvmReceiptProofError,
    );
    expect(() =>
      verifyNoEvmReceiptProof({ ...noEvmProof(), receiptsRoot: `0x${"00".repeat(32)}` }),
    ).toThrow(/receiptsRoot mismatch/u);
    expect(() => verifyNoEvmReceiptProof({ ...noEvmProof(), txIndex: 0 })).toThrow(
      /targetReceiptHash mismatch/u,
    );
    expect(() => verifyNoEvmReceiptProof({ ...noEvmProof(), txIndex: 3 })).toThrow(
      /txIndex 3 is out of bounds/u,
    );
  });

  it("rejects malformed receipt transcript and hash bytes", () => {
    expect(() =>
      decodeNoEvmReceiptTranscript({
        ...noEvmProof(),
        receiptTranscript: ["0x010203", "0xabc", "0x"],
      }),
    ).toThrow(/receiptTranscript\[1\]/u);
    expect(() =>
      verifyNoEvmReceiptProof({
        ...noEvmProof(),
        receiptTranscript: ["010203", "0x04050607", "0x"],
      }),
    ).toThrow(/receiptTranscript\[0\]/u);
    expect(() =>
      verifyNoEvmReceiptProof({ ...noEvmProof(), targetReceiptHash: "0x12" }),
    ).toThrow(/targetReceiptHash must be 32 bytes/u);
  });

  it("accepts bounded transcripts carrying the legacy root algorithm label", () => {
    const proof = {
      ...noEvmProof(),
      rootAlgorithm:
        "keccak256(monolythium/v2/receipts_root/1 || len || indexed bincode receipts)",
    };

    expect(verifyNoEvmReceiptProof(proof)?.proofKind).toBe("boundedCacheTranscript");
  });

  it("verifies compact receipt inclusion proofs", () => {
    const proof = compactNoEvmProof();

    const verified = verifyNoEvmReceiptProof(proof);

    expect(verified?.proofKind).toBe("compactInclusion");
    expect(verified?.receipts).toEqual([]);
    expect(verified?.receiptsRoot).toBe(proof.receiptsRoot);
    expect(verified?.targetReceiptHash).toBe(proof.targetReceiptHash);
    expect(verified?.receiptCount).toBe(3);
    expect(verified?.txIndex).toBe(1);
    expect(Array.from(verified?.targetReceipt ?? [])).toEqual([0x04, 0x05, 0x06, 0x07]);
  });

  it("verifies compact receipt proofs reconstructed from the indexer archive", () => {
    const proof = compactNoEvmArchiveProof();

    const verified = verifyNoEvmReceiptProof(proof);

    expect(verified?.proofKind).toBe("compactInclusion");
    expect(verified?.receiptsRoot).toBe(proof.receiptsRoot);
    expect(proof.archiveProof?.source).toBe("indexerReceiptArchiveContentDigest");
  });

  it("accepts compact archive proofs carrying snapshot signatures", () => {
    const proof = compactNoEvmArchiveProof([VALID_ARCHIVE_SIGNATURE]);

    const verified = verifyNoEvmReceiptProof(proof);

    expect(verified?.proofKind).toBe("compactInclusion");
    expect(proof.archiveProof?.signatures).toEqual([VALID_ARCHIVE_SIGNATURE]);
  });

  it("rejects malformed compact archive proof signatures", () => {
    const malformedSignatures = [
      "0x1234",
      `mono.snapshot.sig.v2:0x${"12".repeat(20)}:0xab`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(19)}:0xab`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(21)}:0xab`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0X${"12".repeat(20)}:0xab`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(20)}:0Xab`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(20)}:0x`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(20)}:0xabc`,
      `${NO_EVM_ARCHIVE_SIGNATURE_SCHEME}:0x${"12".repeat(20)}:0xab:extra`,
    ];

    for (const signature of malformedSignatures) {
      expect(() => verifyNoEvmReceiptProof(compactNoEvmArchiveProof([signature]))).toThrow(
        /archiveProof\.signatures\[0\]/u,
      );
    }

    expect(() =>
      verifyNoEvmReceiptProof({
        ...compactNoEvmArchiveProof(),
        archiveProof: {
          ...compactNoEvmArchiveProof().archiveProof!,
          signatures: [123] as unknown as string[],
        },
      }),
    ).toThrow(/archiveProof\.signatures must be an array of strings/u);
  });

  it("accepts compact proofs carrying BLS finality evidence", () => {
    const proof: NoEvmCompactReceiptProof = {
      ...compactNoEvmProof(),
      finalityEvidence: {
        schema: "mono.no_evm_receipt_finality.v1",
        source: "blsRoundCertificate",
        round: 57,
        certificate: {
          round: 57,
          signature: "0x1234",
          signersBitmap: "0xabcd",
          signerIndices: [1, 3],
          signerCount: 2,
        },
      },
      missingProofMaterial: [
        "signed archive or snapshot manifest binding receipt bytes to blockHash and receiptsRoot",
      ],
    };

    const verified = verifyNoEvmReceiptProof(proof);

    expect(verified?.proofKind).toBe("compactInclusion");
    expect(proof.finalityEvidence?.source).toBe("blsRoundCertificate");
    expect(proof.finalityEvidence?.certificate.signerIndices).toEqual([1, 3]);
  });

  it("rejects malformed BLS finality evidence", () => {
    expect(() =>
      verifyNoEvmReceiptProof({
        ...compactNoEvmProof(),
        finalityEvidence: {
          schema: "mono.no_evm_receipt_finality.v1",
          source: "blsRoundCertificate",
          round: 57,
          certificate: {
            round: 58,
            signature: "0x1234",
            signersBitmap: "0xabcd",
            signerIndices: [1, 3],
            signerCount: 2,
          },
        },
      }),
    ).toThrow(/certificate\.round must match/u);
  });

  it("rejects compact proofs with tampered target bytes", () => {
    expect(() =>
      verifyNoEvmReceiptProof({
        ...compactNoEvmProof(),
        targetReceiptBytes: "0x04050608",
      }),
    ).toThrow(/targetReceiptHash mismatch/u);
  });

  it("rejects compact proofs with tampered sibling hashes or path sides", () => {
    const proof = compactNoEvmProof();

    expect(() =>
      verifyNoEvmReceiptProof({
        ...proof,
        compactInclusionProof: {
          ...proof.compactInclusionProof!,
          siblingHashes: [
            `0x${"00".repeat(32)}`,
            ...proof.compactInclusionProof!.siblingHashes.slice(1),
          ],
        },
      }),
    ).toThrow(/compact inclusion path mismatch/u);

    expect(() =>
      verifyNoEvmReceiptProof({
        ...proof,
        compactInclusionProof: {
          ...proof.compactInclusionProof!,
          pathSides: [false, ...proof.compactInclusionProof!.pathSides.slice(1)],
        },
      }),
    ).toThrow(/compact inclusion path mismatch/u);
  });

  it("rejects compact proofs whose top-level root does not match compact root", () => {
    expect(() =>
      verifyNoEvmReceiptProof({
        ...compactNoEvmProof(),
        receiptsRoot: `0x${"00".repeat(32)}`,
      }),
    ).toThrow(/receiptsRoot must equal compactInclusionProof\.root/u);
  });

  it("rejects compact proofs missing target receipt bytes", () => {
    const proof = { ...compactNoEvmProof() } as Partial<NoEvmReceiptProof>;
    delete (proof as { targetReceiptBytes?: string }).targetReceiptBytes;

    expect(() => verifyNoEvmReceiptProof(proof as NoEvmReceiptProof)).toThrow(
      /compactInclusion proof requires targetReceiptBytes/u,
    );
  });

  it("rejects compact proofs with mismatched sibling and path side lengths", () => {
    const proof = compactNoEvmProof();

    expect(() =>
      verifyNoEvmReceiptProof({
        ...proof,
        compactInclusionProof: {
          ...proof.compactInclusionProof!,
          pathSides: proof.compactInclusionProof!.pathSides.slice(1),
        },
      }),
    ).toThrow(/siblingHashes\/pathSides length mismatch/u);
  });
});

function compactInclusionMaterial(
  receipts: readonly Uint8Array[],
  targetIndex: number,
): {
  root: string;
  leafHash: string;
  siblingHashes: string[];
  pathSides: boolean[];
} {
  if (receipts.length === 0) {
    const preimage = new Uint8Array(RECEIPT_ROOT_EMPTY_DOMAIN.length + 4);
    preimage.set(RECEIPT_ROOT_EMPTY_DOMAIN);
    return {
      root: bytesToHex(keccak_256(preimage)),
      leafHash: "0x",
      siblingHashes: [],
      pathSides: [],
    };
  }

  let level = receipts.map((receipt, index) => receiptLeafHash(receipt, index));
  let index = targetIndex;
  const siblingHashes: string[] = [];
  const pathSides: boolean[] = [];
  while (level.length > 1) {
    const siblingIndex = index % 2 === 1 ? index - 1 : Math.min(index + 1, level.length - 1);
    siblingHashes.push(bytesToHex(level[siblingIndex]!));
    pathSides.push(index % 2 === 1);

    const nextLevel: Uint8Array[] = [];
    for (let levelIndex = 0; levelIndex < level.length; levelIndex += 2) {
      const left = level[levelIndex]!;
      const right = level[levelIndex + 1] ?? left;
      nextLevel.push(receiptNodeHash(left, right));
    }
    level = nextLevel;
    index = Math.floor(index / 2);
  }

  return {
    root: bytesToHex(level[0]!),
    leafHash: bytesToHex(receiptLeafHash(receipts[targetIndex]!, targetIndex)),
    siblingHashes,
    pathSides,
  };
}

function receiptLeafHash(receipt: Uint8Array, txIndex: number): Uint8Array {
  const preimage = new Uint8Array(RECEIPT_LEAF_DOMAIN.length + 8 + receipt.length);
  const view = new DataView(preimage.buffer);
  let offset = 0;
  preimage.set(RECEIPT_LEAF_DOMAIN, offset);
  offset += RECEIPT_LEAF_DOMAIN.length;
  view.setUint32(offset, txIndex, true);
  offset += 4;
  view.setUint32(offset, receipt.length, true);
  offset += 4;
  preimage.set(receipt, offset);
  return keccak_256(preimage);
}

function receiptNodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  const preimage = new Uint8Array(RECEIPT_NODE_DOMAIN.length + 64);
  let offset = 0;
  preimage.set(RECEIPT_NODE_DOMAIN, offset);
  offset += RECEIPT_NODE_DOMAIN.length;
  preimage.set(left, offset);
  offset += 32;
  preimage.set(right, offset);
  return keccak_256(preimage);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "0x";
  for (let index = 0; index < bytes.length; index++) {
    out += bytes[index]!.toString(16).padStart(2, "0");
  }
  return out;
}
