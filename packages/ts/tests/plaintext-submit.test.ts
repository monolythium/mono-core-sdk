/**
 * Unit tests for the plaintext submit path + the privacy toggle, and
 * the registry/tx fee-default resolver. These mirror the Rust SDK's
 * `TxClient::submit_plaintext` / `build_sign_submit_with_privacy` and
 * the registry per-unit-price + clamp logic. No network is touched —
 * the RPC client uses a stub `fetch` that records the wire call.
 */

import { describe, expect, it } from "vitest";
import {
  REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT,
  RpcClient,
  clampPriorityTip,
  resolveExecutionFee,
  resolveMaxExecutionUnitPrice,
  resolveRegistryExecutionFee,
} from "../src/index.js";
import {
  ML_DSA_65_SEED_LEN,
  ML_KEM_768_ENCAPSULATION_KEY_LEN,
  MlDsa65Backend,
  buildPlaintextSubmission,
  submitPlaintextTransaction,
  submitTransactionWithPrivacy,
} from "../src/crypto/index.js";

interface CapturedCall {
  method: string;
  params: unknown;
}

/** Stub fetch that replies with a fixed result and records each call. */
function mockFetch(reply: unknown): { fetch: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (typeof body !== "string") throw new Error("expected string body");
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

/** Stub fetch that replies per JSON-RPC method. */
function mockFetchByMethod(replies: Record<string, unknown>): {
  fetch: typeof fetch;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (typeof body !== "string") throw new Error("expected string body");
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params });
    if (!(parsed.method in replies)) throw new Error(`no canned reply for ${parsed.method}`);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: replies[parsed.method] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

function backend(): MlDsa65Backend {
  return MlDsa65Backend.fromSeed(new Uint8Array(ML_DSA_65_SEED_LEN).fill(0x11));
}

const TX_FIELDS = {
  chainId: 69_420n,
  nonce: 3n,
  maxPriorityFeePerGas: 2_000n,
  maxFeePerGas: 6_000n,
  gasLimit: 100_000n,
  to: `0x${"22".repeat(20)}`,
  value: 1_000n,
  input: "0x",
} as const;

describe("plaintext submission", () => {
  it("builds a 0x-prefixed bincode SignedTransaction and the canonical hashes", () => {
    const b = backend();
    const built = buildPlaintextSubmission({ backend: b, tx: TX_FIELDS });
    const signed = b.signEvmTx(TX_FIELDS);

    expect(built.signedTxWireHex).toBe(`0x${signed.wireHex}`);
    expect(built.signedTxWireHex.startsWith("0x")).toBe(true);
    // wireHex is the bincode SignedTransaction without the 0x prefix.
    expect(built.innerWireBytes).toBe((built.signedTxWireHex.length - 2) / 2);
    // The submission hash is the canonical native tx hash (0x02-tagged
    // preimage + signature + pubkey), not the signing sighash.
    expect(built.innerTxHashHex).not.toBe(built.innerSighashHex);
    expect(built.innerTxHashHex.length).toBe(2 + 64);
  });

  it("submits via mesh_submitTx and accepts a matching echoed hash", async () => {
    const b = backend();
    const built = buildPlaintextSubmission({ backend: b, tx: TX_FIELDS });
    const { fetch, calls } = mockFetch(built.innerTxHashHex);
    const client = new RpcClient("http://x", { fetch });

    const hash = await submitPlaintextTransaction(
      client,
      built.signedTxWireHex,
      built.innerTxHashHex,
    );

    expect(hash).toBe(built.innerTxHashHex);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("mesh_submitTx");
    expect(calls[0]!.params).toEqual([built.signedTxWireHex]);
  });

  it("rejects a mismatched echoed canonical hash", async () => {
    const b = backend();
    const built = buildPlaintextSubmission({ backend: b, tx: TX_FIELDS });
    const wrong = `0x${"ab".repeat(32)}`;
    const { fetch } = mockFetch(wrong);
    const client = new RpcClient("http://x", { fetch });

    await expect(
      submitPlaintextTransaction(client, built.signedTxWireHex, built.innerTxHashHex),
    ).rejects.toThrow(/returned tx hash .* but the locally computed canonical hash is/);
  });

  it("rejects a non-32-byte echoed hash", async () => {
    const b = backend();
    const built = buildPlaintextSubmission({ backend: b, tx: TX_FIELDS });
    const { fetch } = mockFetch("0xdead");
    const client = new RpcClient("http://x", { fetch });

    await expect(
      submitPlaintextTransaction(client, built.signedTxWireHex, built.innerTxHashHex),
    ).rejects.toThrow(/must be 32 bytes/);
  });
});

describe("privacy toggle (default plaintext)", () => {
  it("routes through mesh_submitTx when private === false", async () => {
    const b = backend();
    const expectedHash = b.signEvmTx(TX_FIELDS).txHash;
    const expectedHashHex = `0x${[...expectedHash].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    const { fetch, calls } = mockFetch(expectedHashHex);
    const client = new RpcClient("http://x", { fetch });

    const hash = await submitTransactionWithPrivacy({
      client,
      backend: b,
      tx: TX_FIELDS,
      private: false,
    });

    expect(hash).toBe(expectedHashHex);
    expect(calls.map((c) => c.method)).toEqual(["mesh_submitTx"]);
  });

  it("requires an encryption key when private === true", async () => {
    const b = backend();
    const { fetch } = mockFetch("0x");
    const client = new RpcClient("http://x", { fetch });

    await expect(
      submitTransactionWithPrivacy({ client, backend: b, tx: TX_FIELDS, private: true }),
    ).rejects.toThrow(/private submission requires an encryptionKey/);
  });

  it("gates the encrypted path off (MB-3) when private === true with a key", async () => {
    const b = backend();
    const { fetch, calls } = mockFetch("0x");
    const client = new RpcClient("http://x", { fetch });
    const encryptionKey = {
      algo: "ml-kem-768",
      epoch: 1n,
      encapsulationKey: new Uint8Array(ML_KEM_768_ENCAPSULATION_KEY_LEN).fill(0x33),
    };

    // Even with a valid key, the retired scheme-0 envelope must NOT be built
    // or submitted; the encrypted path is unavailable until MB-3.
    await expect(
      submitTransactionWithPrivacy({ client, backend: b, tx: TX_FIELDS, private: true, encryptionKey }),
    ).rejects.toThrow(/encrypted mempool submission unavailable until MB-3/);
    expect(calls.map((c) => c.method)).not.toContain("lyth_submitEncrypted");
  });
});

describe("registry/tx fee defaults", () => {
  it("raises the registry execution-unit-limit default above the ~151k PoP cost", () => {
    expect(REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT).toBeGreaterThanOrEqual(200_000n);
  });

  it("clamps a priority tip to the per-unit max price (plaintext FeeMismatch guard)", () => {
    // The legacy registry default tip 1e10 dwarfs the ~6000 per-unit cap.
    expect(clampPriorityTip(10_000_000_000n, 6_000n)).toBe(6_000n);
    expect(clampPriorityTip(1_000n, 6_000n)).toBe(1_000n);
    expect(clampPriorityTip(6_000n, 6_000n)).toBe(6_000n);
  });

  it("resolves the per-unit max price from the live quote with safety headroom", async () => {
    const { fetch } = mockFetch({
      executionUnitPriceLythoshi: "2000",
      basePricePerExecutionUnitLythoshi: "1000",
      priorityTipLythoshi: "1000",
      blockNumber: 7,
      source: "latest_block",
    });
    const client = new RpcClient("http://x", { fetch });

    // 2000 quote × 3 safety multiplier = 6000 per-unit cap.
    expect(await resolveMaxExecutionUnitPrice(client)).toBe(6_000n);
  });

  it("never lets the resolved tip exceed the resolved per-unit max price", async () => {
    const { fetch } = mockFetch({
      executionUnitPriceLythoshi: "2000",
      basePricePerExecutionUnitLythoshi: "1000",
      priorityTipLythoshi: "1000",
      source: "latest_block",
    });
    const client = new RpcClient("http://x", { fetch });

    // Pass the legacy 1e10 tip; it must clamp to the 6000 cap.
    const fee = await resolveExecutionFee(client, { priorityTipLythoshi: 10_000_000_000n });
    expect(fee.maxFeePerGas).toBe(6_000n);
    expect(fee.maxPriorityFeePerGas).toBe(6_000n);
    expect(fee.maxPriorityFeePerGas <= fee.maxFeePerGas).toBe(true);
  });

  it("defaults the registry write to the raised execution-unit limit", async () => {
    const { fetch } = mockFetchByMethod({
      lyth_executionUnitPrice: {
        executionUnitPriceLythoshi: "2000",
        basePricePerExecutionUnitLythoshi: "1000",
        priorityTipLythoshi: "1000",
        source: "latest_block",
      },
    });
    const client = new RpcClient("http://x", { fetch });

    const fee = await resolveRegistryExecutionFee(client);
    expect(fee.gasLimit).toBe(REGISTRY_DEFAULT_EXECUTION_UNIT_LIMIT);
    expect(fee.maxPriorityFeePerGas <= fee.maxFeePerGas).toBe(true);
  });
});
