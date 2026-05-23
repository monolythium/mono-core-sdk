import { describe, expect, it } from "vitest";
import {
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

const RECEIPTS = [
  new Uint8Array([0x01, 0x02, 0x03]),
  new Uint8Array([0x04, 0x05, 0x06, 0x07]),
  new Uint8Array([]),
];

function noEvmProof(): NoEvmReceiptProof {
  return {
    schema: NO_EVM_RECEIPT_PROOF_SCHEMA,
    proofType: NO_EVM_RECEIPT_PROOF_TYPE,
    rootAlgorithm: NO_EVM_RECEIPT_ROOT_ALGORITHM,
    receiptCodec: NO_EVM_RECEIPT_CODEC,
    blockHash: `0x${"22".repeat(32)}`,
    txHash: `0x${"11".repeat(32)}`,
    receiptsRoot: "0xd889f488b3fe1ea852730deb17971b3618abd21e15a2b0824525151e8d14950a",
    targetReceiptHash: "0xf53a5554601329f91c1b8baec5d7270102bd621873e3b119aff9c83c1d73d86c",
    blockHeight: 100,
    txIndex: 1,
    receiptCount: RECEIPTS.length,
    receiptTranscript: RECEIPTS.map(bytesToHex),
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
});

function bytesToHex(bytes: Uint8Array): string {
  let out = "0x";
  for (let index = 0; index < bytes.length; index++) {
    out += bytes[index]!.toString(16).padStart(2, "0");
  }
  return out;
}
