import { describe, expect, it } from "vitest";
import { RpcClient } from "./client.js";
import {
  nodeRegistryAddressHex,
  slotClusterCharterDelegator,
  slotClusterCharterMembers,
} from "./node-registry.js";

/**
 * Regression coverage for the storage-read shape fix.
 *
 * The live Monolythium node answers `eth_getStorageAt` with a proof-wrapped
 * OBJECT `{ value, proof, stateRoot, blockNumber }`, but some builds /
 * eth-compat tooling return a BARE `0x…` hex word. The SDK's storage
 * readers must accept BOTH and extract the same word — and must not throw
 * `invalid hex bytes` on the minimal-quantity `0x0` the chain uses for a
 * zero word.
 */

type RpcResultFor = (method: string, params: unknown[]) => unknown;

/** Build a fetch double that resolves each JSON-RPC call via `resultFor`. */
function mockFetch(resultFor: RpcResultFor): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      id: number;
      method: string;
      params: unknown[];
    };
    const result = resultFor(body.method, body.params ?? []);
    return {
      ok: true,
      status: 200,
      json: async () => ({ jsonrpc: "2.0", id: body.id, result }),
    } as Response;
  }) as unknown as typeof fetch;
}

/** Object (proof-wrapped) form the live node returns, camelCase keys. */
function objectForm(value: string): unknown {
  return {
    value,
    proof: null,
    stateRoot:
      "0xdd4f3482715a9530b9c9fa077b8b326c8921730c21e86436e13b80ecdf7d5089",
    blockNumber: 2134,
  };
}

describe("eth_getStorageAt response-shape normalization", () => {
  it("ethGetStorageAt extracts the same word from a bare-hex result and the object form", async () => {
    const word =
      "0x00000000000000000000000000000000000000000000000000000000000007d0";
    const bareClient = new RpcClient("http://mock", {
      fetch: mockFetch(() => word),
    });
    const objectClient = new RpcClient("http://mock", {
      fetch: mockFetch(() => objectForm(word)),
    });

    const bare = await bareClient.ethGetStorageAt(nodeRegistryAddressHex(), "0x0");
    const wrapped = await objectClient.ethGetStorageAt(nodeRegistryAddressHex(), "0x0");

    expect(bare.value).toBe(word);
    expect(wrapped.value).toBe(word);
    expect(bare.value).toBe(wrapped.value);
    // The object form's proof/stateRoot/blockNumber stay accessible.
    expect(wrapped.proof).toBeNull();
    expect(wrapped.state_root).toBe(
      "0xdd4f3482715a9530b9c9fa077b8b326c8921730c21e86436e13b80ecdf7d5089",
    );
    expect(wrapped.block_number).toBe(2134n);
  });

  it("normalizes the minimal-quantity zero word `0x0` without throwing", async () => {
    const client = new RpcClient("http://mock", {
      fetch: mockFetch(() => objectForm("0x0")),
    });
    const proof = await client.ethGetStorageAt(nodeRegistryAddressHex(), "0x0");
    // `0x0` normalizes to an even-length, decodable word (not a hard zero-pad).
    expect(proof.value).toBe("0x00");
  });

  it("defaults a null result to the zero word", async () => {
    const client = new RpcClient("http://mock", {
      fetch: mockFetch(() => null),
    });
    const proof = await client.ethGetStorageAt(nodeRegistryAddressHex(), "0x0");
    expect(proof.value).toBe("0x0");
    expect(proof.block_number).toBe(0n);
  });

  it("lythGetClusterCharter resolves the empty/default charter for both response shapes (no `invalid hex bytes`)", async () => {
    const registry = nodeRegistryAddressHex();
    const delegatorSlot = slotClusterCharterDelegator(0).toLowerCase();
    const membersSlot = slotClusterCharterMembers(0).toLowerCase();

    // Genesis cluster: both charter words read back as the minimal zero word.
    const resultFor: RpcResultFor = (method, params) => {
      if (method !== "eth_getStorageAt") throw new Error(`unexpected method ${method}`);
      const [addr, slot] = params as [string, string];
      expect(addr.toLowerCase()).toBe(registry.toLowerCase());
      expect([delegatorSlot, membersSlot]).toContain(String(slot).toLowerCase());
      return "0x0"; // chain's minimal-quantity zero word
    };

    // Bare-hex node.
    const bareClient = new RpcClient("http://mock", { fetch: mockFetch(resultFor) });
    const bareCharter = await bareClient.lythGetClusterCharter(0);
    expect(bareCharter).toEqual({ present: false, delegatorShareBps: 0, memberShareBps: [] });

    // Object-form node returning the same zero word.
    const objectClient = new RpcClient("http://mock", {
      fetch: mockFetch((m, p) => objectForm(String(resultFor(m, p)))),
    });
    const objectCharter = await objectClient.lythGetClusterCharter(0);
    expect(objectCharter).toEqual({ present: false, delegatorShareBps: 0, memberShareBps: [] });
  });

  it("lythGetClusterCharter decodes a populated charter from the object form", async () => {
    // delegator presence word = 0x07d1 (2001) → delegatorShareBps = 2000.
    // members word packs ten BE u16 shares starting at byte offset 12; set the
    // first member share to 0x03e8 (1000).
    const delegatorWord =
      "0x00000000000000000000000000000000000000000000000000000000000007d1";
    const members = new Uint8Array(32);
    members[12] = 0x03;
    members[13] = 0xe8;
    const membersWord =
      "0x" + [...members].map((b) => b.toString(16).padStart(2, "0")).join("");

    const delegatorSlot = slotClusterCharterDelegator(7).toLowerCase();
    const client = new RpcClient("http://mock", {
      fetch: mockFetch((_method, params) => {
        const [, slot] = params as [string, string];
        const word =
          String(slot).toLowerCase() === delegatorSlot ? delegatorWord : membersWord;
        return objectForm(word);
      }),
    });

    const charter = await client.lythGetClusterCharter(7);
    expect(charter.present).toBe(true);
    expect(charter.delegatorShareBps).toBe(2000);
    expect(charter.memberShareBps[0]).toBe(1000);
    expect(charter.memberShareBps).toHaveLength(10);
  });
});
