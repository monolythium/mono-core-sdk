/**
 * Round-trip integration tests against a live `mono-core` node.
 *
 * These run only when `MONO_CORE_RPC_URL` is set in the environment.
 * Otherwise every test in this file is skipped — the SDK build can run
 * on machines without a chain handy.
 *
 * To bring a node up locally:
 *
 *   cd ../mono-core
 *   cargo run --release --features mdbx --bin protocore -- node start \
 *     --config <test config>
 *
 * then export `MONO_CORE_RPC_URL=http://localhost:8545` and re-run the
 * suite via `pnpm test`.
 */

import { describe, expect, it } from "vitest";
import { RpcClient } from "../src/index.js";

const RPC_URL = process.env.MONO_CORE_RPC_URL;
const describeIfLive = RPC_URL ? describe : describe.skip;

describeIfLive("round-trip against a live mono-core node", () => {
  const client = new RpcClient(RPC_URL ?? "http://localhost:8545");

  it("eth_chainId returns the configured chain id", async () => {
    const id = await client.ethChainId();
    // Live testnet at chain_id 69420 (Law §13.1).
    expect(typeof id).toBe("bigint");
    expect(id).toBeGreaterThan(0n);
  });

  it("eth_blockNumber returns the latest committed height", async () => {
    const h = await client.ethBlockNumber();
    expect(typeof h).toBe("bigint");
    expect(h).toBeGreaterThanOrEqual(0n);
  });

  it("eth_getBlockByNumber('latest') returns a block header", async () => {
    const header = await client.ethGetBlockByNumber("latest");
    expect(header).not.toBeNull();
    if (header) {
      expect(header.hash).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(typeof header.timestamp).toBe("bigint");
    }
  });

  it("net_version returns the chain id as a decimal string", async () => {
    const v = await client.netVersion();
    expect(v).toMatch(/^\d+$/);
  });

  it("web3_clientVersion identifies a mono-core node", async () => {
    const v = await client.web3ClientVersion();
    expect(typeof v).toBe("string");
    expect(v.length).toBeGreaterThan(0);
  });

  it("lyth_clusterDirectory returns the cluster descriptor page", async () => {
    const page = await client.lythClusterDirectory(0, 100);
    expect(Array.isArray(page.clusters)).toBe(true);
    if (page.clusters.length > 0) {
      const cluster = page.clusters[0];
      expect(typeof cluster.clusterId).toBe("number");
      expect(typeof cluster.threshold).toBe("number");
      expect(typeof cluster.active).toBe("boolean");
    }
  });

  it("lyth_currentRound returns the latest round info", async () => {
    const round = await client.lythCurrentRound();
    expect(typeof round.height).toBe("bigint");
    expect(round.height).toBeGreaterThanOrEqual(0n);
  });

  it("lyth_mempoolStatus returns an aggregate snapshot", async () => {
    const snap = await client.lythMempoolStatus();
    expect(typeof snap.count_ready).toBe("bigint");
    expect(typeof snap.count_pending).toBe("bigint");
    expect(snap.bytes_by_class.length).toBe(7);
  });
});
