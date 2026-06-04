import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
  NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES,
  NODE_REGISTRY_SELECTORS,
  RpcClient,
  buildRequestClusterJoinTxFields,
  buildVoteClusterAdmitTxFields,
  clusterJoinRequestExists,
  deriveClusterJoinOperatorId,
  readClusterJoinRequest,
  resolveClusterJoinExecutionFee,
  submitRequestClusterJoin,
  submitVoteClusterAdmit,
} from "../src/index.js";
import {
  assemblePqm1Payload,
  buildPlaintextSubmission,
  pqm1MnemonicToMlDsa65Backend,
  pqm1PayloadToMnemonic,
} from "../src/crypto/index.js";

interface CapturedCall {
  method: string;
  params: unknown;
}

const mnemonic = pqm1PayloadToMnemonic(assemblePqm1Payload(new Uint8Array(30).fill(0x31)));
const operatorPubkey = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x44);
const voterPubkey = new Uint8Array(NODE_REGISTRY_CONSENSUS_PUBKEY_BYTES).fill(0x55);
const operatorId = deriveClusterJoinOperatorId(operatorPubkey);
const quote = {
  executionUnitPriceLythoshi: "800",
  basePricePerExecutionUnitLythoshi: "800",
  priorityTipLythoshi: "950",
  blockNumber: 1,
  source: "test",
};

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

function requestView(status: number): string {
  const owner = status === 0 ? `0x${"00".repeat(20)}` : `0x${"77".repeat(20)}`;
  return `0x${[
    word(owner),
    word(9),
    word(7),
    word(10),
    word(status === 1 ? 3 : 7),
    word(status),
    word(status === 0 ? 0 : 5000),
    word(status === 2 ? 1 : 0),
  ].join("")}`;
}

function word(value: bigint | number | string): string {
  if (typeof value === "string" && value.startsWith("0x")) {
    return value.slice(2).padStart(64, "0");
  }
  return BigInt(value).toString(16).padStart(64, "0");
}

function expectedRequestTxHash(): string {
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

function expectedVoteTxHash(): string {
  const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
  const tx = buildVoteClusterAdmitTxFields({
    chainId: 69_420n,
    nonce: 18n,
    fee: resolveClusterJoinExecutionFee(quote),
    clusterId: 7,
    operatorId,
    voterPubkey,
  });
  return buildPlaintextSubmission({ backend, tx }).innerTxHashHex;
}

describe("CJ-1 cluster-admission submit helpers", () => {
  it("reads and decodes the cluster join request view", async () => {
    const { fetch, calls } = mockFetchByMethod({ eth_call: requestView(1) });
    const client = new RpcClient("http://x", { fetch });

    const view = await readClusterJoinRequest(client, { clusterId: 7, operatorId });

    expect(view.status).toBe("open");
    expect(clusterJoinRequestExists(view)).toBe(true);
    expect(calls[0]?.method).toBe("eth_call");
    expect(calls[0]?.params).toEqual([
      {
        to: "0x0000000000000000000000000000000000001005",
        data: expect.stringContaining(NODE_REGISTRY_SELECTORS.getClusterJoinRequest),
      },
      "latest",
    ]);
  });

  it("builds request and vote transactions with registry fee defaults", () => {
    const fee = resolveClusterJoinExecutionFee(quote);
    expect(fee).toEqual({
      maxFeePerGas: 6000n,
      maxPriorityFeePerGas: 6000n,
      gasLimit: DEFAULT_CLUSTER_JOIN_EXECUTION_UNIT_LIMIT,
    });

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
  });

  it("submits requestClusterJoin after preflight and before any broadcast", async () => {
    const { fetch, calls } = mockFetchByMethod({
      eth_call: requestView(0),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      mesh_submitTx: expectedRequestTxHash(),
    });
    const client = new RpcClient("http://x", { fetch });

    const res = await submitRequestClusterJoin({
      client,
      mnemonic,
      clusterId: 7,
      operatorPubkey,
      bondLythoshi: 9000n,
    });

    expect(res.txHash).toBe(expectedRequestTxHash());
    expect(res.operatorIdHex).toBe(operatorId);
    expect(res.signedTxWireBytes).toBeGreaterThan(0);
    expect(calls.map((c) => c.method)).toEqual([
      "eth_call",
      "eth_chainId",
      "lyth_getTransactionCount",
      "lyth_executionUnitPrice",
      "mesh_submitTx",
    ]);
  });

  it("submits voteClusterAdmit only when the candidate request is open", async () => {
    const { fetch, calls } = mockFetchByMethod({
      eth_call: requestView(1),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      mesh_submitTx: expectedVoteTxHash(),
    });
    const client = new RpcClient("http://x", { fetch });

    const res = await submitVoteClusterAdmit({
      client,
      mnemonic,
      clusterId: "7",
      operatorId,
      voterPubkey,
    });

    expect(res.clusterId).toBe("7");
    expect(res.txHash).toBe(expectedVoteTxHash());
    expect(calls.at(-1)?.method).toBe("mesh_submitTx");
  });

  it("fails before nonce reads, signing, or broadcast when CJ-1 is unavailable", async () => {
    const { fetch, calls } = mockFetchByMethod({
      eth_call: () => {
        throw new Error("method not found");
      },
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      mesh_submitTx: expectedRequestTxHash(),
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
    ).rejects.toThrow(/getClusterJoinRequest is not exposed/);

    expect(calls.map((c) => c.method)).toEqual(["eth_call"]);
  });

  it("does not broadcast an admit vote when no open request exists", async () => {
    const { fetch, calls } = mockFetchByMethod({
      eth_call: requestView(0),
      eth_chainId: "0x10f2c",
      lyth_getTransactionCount: 18,
      lyth_executionUnitPrice: quote,
      mesh_submitTx: expectedVoteTxHash(),
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
    ).rejects.toThrow(/not open for voting/);

    expect(calls.map((c) => c.method)).toEqual(["eth_call"]);
  });
});
