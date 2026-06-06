import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
  DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT,
  NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
  NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES,
  NODE_REGISTRY_SELECTORS,
  RpcClient,
  buildPublishOperatorSealKeyTxFields,
  buildRequestClusterJoinTxFields,
  buildVoteClusterAdmitTxFields,
  clusterJoinRequestExists,
  deriveClusterJoinOperatorId,
  readClusterJoinRequest,
  resolveClusterJoinExecutionFee,
  submitPublishOperatorSealKey,
  submitRequestClusterJoin,
  submitVoteClusterAdmit,
  type OperatorOnboardingPreview,
} from "../src/index.js";
import {
  assemblePqm1Payload,
  MempoolClass,
  buildEncryptedSubmission,
  buildPlaintextSubmission,
  pqm1MnemonicToMlDsa65Backend,
  pqm1PayloadToMnemonic,
  type ClusterSealKeysSource,
} from "../src/crypto/index.js";

interface CapturedCall {
  method: string;
  params: unknown;
}

const mnemonic = pqm1PayloadToMnemonic(assemblePqm1Payload(new Uint8Array(30).fill(0x31)));
const operatorPubkey = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x44);
const voterPubkey = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x55);
const sealEk = new Uint8Array(NODE_REGISTRY_OPERATOR_SEAL_EK_BYTES).fill(0x66);
const operatorId = deriveClusterJoinOperatorId(operatorPubkey);
const quote = {
  executionUnitPriceLythoshi: "800",
  basePricePerExecutionUnitLythoshi: "800",
  priorityTipLythoshi: "950",
  blockNumber: 1,
  source: "test",
};

interface LythiumSealVector {
  cluster_id: number;
  epoch: number;
  t: number;
  n: number;
  roster_hash_hex: string;
  roster_eks_hex: string[];
}

const vectorsPath = fileURLToPath(new URL("./lythiumseal-vectors.json", import.meta.url));
const sealVectors = JSON.parse(readFileSync(vectorsPath, "utf8")) as LythiumSealVector[];

function mockFetchByMethod(
  replies: Record<string, unknown | ((params: unknown) => unknown)>,
): { fetch: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (typeof body !== "string") throw new Error("expected string body");
    const parsed = JSON.parse(body) as { method: string; params: unknown };
    calls.push({ method: parsed.method, params: parsed.params });
    const reply = replies[parsed.method];
    if (reply === undefined) throw new Error(`no canned reply for ${parsed.method}`);
    const result = typeof reply === "function" ? reply(parsed.params) : reply;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

function requestView(status: number) {
  return {
    schemaVersion: 1,
    capability: "operatorOnboardingRpcV1",
    method: "getClusterJoinRequest",
    clusterId: 7,
    operatorId,
    request: {
      exists: status !== 0,
      owner: status === 0 ? null : `mono1${"7".repeat(38)}`,
      requestEpoch: "9",
      requestNonce: "2",
      snapshotThreshold: 7,
      snapshotN: 10,
      voteCount: status === 1 ? 3 : 7,
      statusCode: status,
      status: status === 0 ? "none" : status === 1 ? "open" : "admitted",
      bondLythoshi: status === 0 ? "0" : "5000",
      sealRosterPending: status === 2,
    },
  };
}

function preview(
  method: "requestClusterJoin" | "voteClusterAdmit",
  overrides: Partial<OperatorOnboardingPreview> = {},
): OperatorOnboardingPreview {
  return {
    schemaVersion: 1,
    capability: "operatorOnboardingRpcV1",
    method,
    ok: true,
    status: "ok",
    reason: null,
    message: null,
    clusterId: 7,
    operatorId,
    ...overrides,
  };
}

function clusterSealKeysSource(): ClusterSealKeysSource {
  const v = sealVectors[0]!;
  return {
    clusterId: v.cluster_id,
    epoch: v.epoch,
    rosterHash: `0x${v.roster_hash_hex}`,
    t: v.t,
    n: v.n,
    roster: v.roster_eks_hex.map((mlKemEk, i) => ({
      operatorIndex: i + 1,
      mlKemEk: `0x${mlKemEk}`,
    })),
  };
}

async function expectedRequestTxHash(): Promise<string> {
  const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
  const tx = buildRequestClusterJoinTxFields({
    chainId: 69_420n,
    nonce: 18n,
    fee: resolveClusterJoinExecutionFee(quote),
    clusterId: 7,
    operatorPubkey,
    bondLythoshi: 9000n,
  });
  return (await buildEncryptedSubmission({
    backend,
    tx,
    clusterSealKeysSource: clusterSealKeysSource(),
    class: MempoolClass.ContractCall,
  })).innerTxHashHex;
}

async function expectedVoteTxHash(): Promise<string> {
  const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
  const tx = buildVoteClusterAdmitTxFields({
    chainId: 69_420n,
    nonce: 18n,
    fee: resolveClusterJoinExecutionFee(quote),
    clusterId: 7,
    operatorId,
    voterPubkey,
  });
  return (await buildEncryptedSubmission({
    backend,
    tx,
    clusterSealKeysSource: clusterSealKeysSource(),
    class: MempoolClass.ContractCall,
  })).innerTxHashHex;
}

function expectedRequestPlaintextTxHash(): string {
  const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
  const tx = buildRequestClusterJoinTxFields({
    chainId: 69_420n,
    nonce: 18n,
    fee: resolveClusterJoinExecutionFee(quote),
    clusterId: 7,
    operatorPubkey,
    bondLythoshi: 9000n,
  });
  return buildPlaintextSubmission({ backend, tx }).innerTxHashHex;
}

function expectedPublishSealKeyPlaintextTxHash(): string {
  const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
  const tx = buildPublishOperatorSealKeyTxFields({
    chainId: 69_420n,
    nonce: 18n,
    fee: resolveClusterJoinExecutionFee(quote),
    peerId: operatorId,
    sealEk,
  });
  return buildPlaintextSubmission({ backend, tx }).innerTxHashHex;
}

describe("CJ-1 cluster-admission submit helpers", () => {
  it("reads and decodes the cluster join request view", async () => {
    const { fetch, calls } = mockFetchByMethod({ lyth_getClusterJoinRequest: requestView(1) });
    const client = new RpcClient("http://x", { fetch });

    const view = await readClusterJoinRequest(client, { clusterId: 7, operatorId });

    expect(view.status).toBe("open");
    expect(view.requestNonce).toBe(2n);
    expect(clusterJoinRequestExists(view)).toBe(true);
    expect(calls[0]?.method).toBe("lyth_getClusterJoinRequest");
    expect(calls[0]?.params).toEqual([7, operatorId]);
  });

  it("builds request and vote transactions with registry fee defaults", () => {
    const fee = resolveClusterJoinExecutionFee(quote);
    expect(fee).toEqual({
      maxFeePerGas: 6000n,
      maxPriorityFeePerGas: 6000n,
      gasLimit: DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
    });
    expect(DEFAULT_OPERATOR_SEAL_KEY_EXECUTION_UNIT_LIMIT).toBe(
      DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
    );

    const request = buildRequestClusterJoinTxFields({
      chainId: 69_420n,
      nonce: 1n,
      fee,
      clusterId: 7,
      operatorPubkey,
      bondLythoshi: 9000n,
    });
    expect(request.to).toBe("0x0000000000000000000000000000000000001005");
    expect(request.value).toBe(9000n);
    expect(String(request.input).startsWith(NODE_REGISTRY_SELECTORS.requestClusterJoin)).toBe(true);

    const vote = buildVoteClusterAdmitTxFields({
      chainId: 69_420n,
      nonce: 2n,
      fee,
      clusterId: 7,
      operatorId,
      voterPubkey,
    });
    expect(vote.value).toBe(0n);
    expect(String(vote.input).startsWith(NODE_REGISTRY_SELECTORS.voteClusterAdmit)).toBe(true);

    const publish = buildPublishOperatorSealKeyTxFields({
      chainId: 69_420n,
      nonce: 3n,
      fee,
      peerId: operatorId,
      sealEk,
    });
    expect(publish.value).toBe(0n);
    expect(String(publish.input).startsWith(NODE_REGISTRY_SELECTORS.publishOperatorSealKey)).toBe(
      true,
    );
  });

  it("submits requestClusterJoin as a sealed transaction after preflight", async () => {
    const expectedHash = await expectedRequestTxHash();
    const { fetch, calls } = mockFetchByMethod({
      lyth_previewRequestClusterJoin: preview("requestClusterJoin"),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      lyth_submitEncrypted: `0x${"44".repeat(32)}`,
    });
    const client = new RpcClient("http://x", { fetch });

    const res = await submitRequestClusterJoin({
      client,
      mnemonic,
      clusterId: 7,
      operatorPubkey,
      bondLythoshi: 9000n,
      clusterSealKeysSource: clusterSealKeysSource(),
    });

    expect(res.txHash).toBe(expectedHash);
    expect(res.operatorIdHex).toBe(operatorId);
    expect(res.signedTxWireBytes).toBeGreaterThan(0);
    expect(res.envelopeWireBytes).toBeGreaterThan(res.signedTxWireBytes);
    expect(calls.map((c) => c.method)).toEqual([
      "lyth_previewRequestClusterJoin",
      "eth_chainId",
      "lyth_getTransactionCount",
      "lyth_executionUnitPrice",
      "lyth_submitEncrypted",
    ]);
    expect((calls.at(-1)?.params as string[])[0]?.startsWith("0x")).toBe(true);
  });

  it("can opt out to plaintext submit for dev chains", async () => {
    const { fetch, calls } = mockFetchByMethod({
      lyth_previewRequestClusterJoin: preview("requestClusterJoin"),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      mesh_submitTx: expectedRequestPlaintextTxHash(),
    });
    const client = new RpcClient("http://x", { fetch });

    const res = await submitRequestClusterJoin({
      client,
      mnemonic,
      clusterId: 7,
      operatorPubkey,
      bondLythoshi: 9000n,
      private: false,
    });

    expect(res.txHash).toBe(expectedRequestPlaintextTxHash());
    expect(calls.map((c) => c.method)).toEqual([
      "lyth_previewRequestClusterJoin",
      "eth_chainId",
      "lyth_getTransactionCount",
      "lyth_executionUnitPrice",
      "mesh_submitTx",
    ]);
  });

  it("submits publishOperatorSealKey as a plaintext registry transaction", async () => {
    const expectedHash = expectedPublishSealKeyPlaintextTxHash();
    const { fetch, calls } = mockFetchByMethod({
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      mesh_submitTx: expectedHash,
    });
    const client = new RpcClient("http://x", { fetch });

    const res = await submitPublishOperatorSealKey({
      client,
      mnemonic,
      peerId: operatorId,
      sealEk,
    });

    expect(res.txHash).toBe(expectedHash);
    expect(res.operatorIdHex).toBe(operatorId);
    expect(res.signedTxWireBytes).toBeGreaterThan(0);
    expect(calls.map((c) => c.method)).toEqual([
      "eth_chainId",
      "lyth_getTransactionCount",
      "lyth_executionUnitPrice",
      "mesh_submitTx",
    ]);
  });

  it("submits voteClusterAdmit only when the candidate request is open", async () => {
    const expectedHash = await expectedVoteTxHash();
    const { fetch, calls } = mockFetchByMethod({
      lyth_previewVoteClusterAdmit: preview("voteClusterAdmit"),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      lyth_submitEncrypted: `0x${"44".repeat(32)}`,
    });
    const client = new RpcClient("http://x", { fetch });

    const res = await submitVoteClusterAdmit({
      client,
      mnemonic,
      clusterId: "7",
      operatorId,
      voterPubkey,
      clusterSealKeysSource: clusterSealKeysSource(),
    });

    expect(res.clusterId).toBe("7");
    expect(res.txHash).toBe(expectedHash);
    expect(calls.at(-1)?.method).toBe("lyth_submitEncrypted");
  });

  it("fails before nonce reads, signing, or broadcast when CJ-1 is unavailable", async () => {
    const { fetch, calls } = mockFetchByMethod({
      lyth_previewRequestClusterJoin: () => {
        throw new Error("method not found");
      },
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      lyth_submitEncrypted: `0x${"44".repeat(32)}`,
    });
    const client = new RpcClient("http://x", { fetch });

    await expect(
      submitRequestClusterJoin({
        client,
        mnemonic,
        clusterId: 7,
        operatorPubkey,
        bondLythoshi: 9000n,
      }),
    ).rejects.toThrow(/request preview is not exposed/);

    expect(calls.map((c) => c.method)).toEqual(["lyth_previewRequestClusterJoin"]);
  });

  it("does not broadcast an admit vote when no open request exists", async () => {
    const { fetch, calls } = mockFetchByMethod({
      lyth_previewVoteClusterAdmit: preview("voteClusterAdmit", {
        ok: false,
        status: "rejected",
        reason: "request_not_open",
        message: "candidate join request is not open",
      }),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      lyth_submitEncrypted: `0x${"44".repeat(32)}`,
    });
    const client = new RpcClient("http://x", { fetch });

    await expect(
      submitVoteClusterAdmit({
        client,
        mnemonic,
        clusterId: 7,
        operatorId,
        voterPubkey,
      }),
    ).rejects.toThrow(/voteClusterAdmit preview rejected: request_not_open/);

    expect(calls.map((c) => c.method)).toEqual(["lyth_previewVoteClusterAdmit"]);
  });
});
