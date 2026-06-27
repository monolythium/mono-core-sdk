# @monolythium/core-sdk

Official TypeScript SDK for [Monolythium v5](https://monolythium.com) (LythiumDAG-BFT).

## Install

```bash
pnpm add @monolythium/core-sdk
```

## Usage

```ts
import { RpcClient } from "@monolythium/core-sdk";

const client = await RpcClient.forNetwork("testnet-69420", { probe: true });

const chainId = await client.ethChainId();
const head = await client.ethBlockNumber();
console.log(`chain ${chainId} at height ${head}`);

const clusters = await client.lythClusterDirectory(0, 100);
console.log(`${clusters.totalClusters} cluster descriptors`);

const decoded = await client.lythDecodeTx("0x...");
const holders = await client.lythRichList("0x...", 25);
const txs = await client.lythTxFeed(25);
const markets = await client.lythClobMarkets(25);
console.log(decoded.status, holders.holders.length, txs.transactions.length, markets.markets.length);
```

The client wraps the Monolythium node JSON-RPC surface: current chain-native
`lyth_*` methods, passive compatibility `eth_*` / `net_*` / `web3_*` reads, and
server-gated debug methods. The no-EVM v5 path should use native helpers such
as
`lyth_decodeTx`, `lyth_gapRecords`, `lyth_dagParents`, `lyth_richList`,
`lyth_txFeed`, `lyth_addressProfile`, `lyth_addressFlow`, `lyth_search`,
`lyth_chainStats`, `lyth_clobMarkets`, `lyth_clobTrades`, `lyth_clobOhlc`,
`lyth_clobOrderBook`, `lyth_nativeReceipt`, and `lyth_addressActivityKind`.
Wire types are generated from the Rust SDK via `ts-rs` where possible, with
SDK-local convenience types for newer explorer envelopes.

Quantities surface as `bigint` to preserve full precision. Use
`parseQuantity` only when you know the value fits in `Number.MAX_SAFE_INTEGER`.

### MRC accounts

```ts
const mrcAccount = await client.lythMrcAccount("monos1effvdw0d05a35j69wwxplhmctpcclx382n60yf", 10);
console.log(mrcAccount.smartAccount?.controller, mrcAccount.policySpends.length);
```

### Node API client

The SDK also exports `ApiClient` for the node's REST-shaped `/api/v1` surface.
Pass the JSON-RPC endpoint; the client derives `/api/v1` automatically.

```ts
import { ApiClient, addressToTypedBech32 } from "@monolythium/core-sdk";

const api = new ApiClient("https://rpc.testnet.monolythium.com");

const latest = await api.block("latest");
const txs = await api.blockTransactions("latest", 0, 25);
const nativeReceipt = await api.transactionNativeReceipt("0x...");
const account = addressToTypedBech32("user", "0x123456789abcdef0112233445566778899aabbcc");
const activity = await api.addressActivity(account);

console.log(
  latest.data.block.blockHash,
  txs.data.totalTransactions,
  nativeReceipt.data.eventCount,
  activity.data.entries.length,
);
```

### Chain registry

The SDK vendors the official testnet bootstrap IPs from
`monolythium/chain-registry` and can optionally fetch the latest raw
registry TOML at runtime.

```ts
import {
  RpcClient,
  fetchChainInfoLatest,
  getP2pSeeds,
  getRpcEndpoints,
} from "@monolythium/core-sdk";

console.log(getRpcEndpoints("testnet-69420").map((r) => r.url));
console.log(getP2pSeeds("testnet-69420").map((p) => p.multiaddr));

const latest = await fetchChainInfoLatest("testnet-69420");
const client = await RpcClient.fromFirstReachable(latest);
```

`RpcClient.forNetwork("testnet-69420")` picks the first official endpoint in
the bundled snapshot. Pass `{ probe: true }` to walk the endpoints and choose
the first one that answers with the expected chain id.

### Address helpers

Public v5 SDK, JSON-RPC, REST, wallet, and explorer surfaces use ADR-0038
typed bech32m addresses. User accounts use `mono1...`; smart-account MRC
lookups use `monos1...`; RISC-V contracts use `monoc1...`. Raw `0x` strings
remain only for low-level byte conversion helpers and compatibility adapters.

```ts
import { addressToBech32, bech32ToAddress } from "@monolythium/core-sdk";

const display = addressToBech32("0x123456789abcdef0112233445566778899aabbcc");
const hex = bech32ToAddress(display);
```

V5 typed address helpers also encode role-specific HRPs such as `monoc` for
RISC-V contracts:

```ts
import { addressToTypedBech32, typedBech32ToAddress } from "@monolythium/core-sdk";

const contract = addressToTypedBech32("contract", "0x2222222222222222222222222222222222222222");
const decoded = typedBech32ToAddress(contract, "contract");
```

### MRV / RISC-V helpers

The package includes the first v5 MRV SDK slice: artifact metadata
validation, MRV v1 transaction extension descriptors, typed contract address
helpers, and native deploy/call request builders with lythoshi and
execution-unit fields.

```ts
import {
  MRV_FORMAT_VERSION,
  MRV_PROFILE_MONO_RV32IM_V1,
  buildMrvCallPlan,
  buildMrvDeployPlan,
  deriveMrvContractAddress,
  mrvAddressToBech32,
  mrvCodeHashHex,
  validateMrvArtifactMetadata,
} from "@monolythium/core-sdk";

const code = new Uint8Array([0x13, 0x00, 0x00, 0x00]);
const metadata = {
  formatVersion: MRV_FORMAT_VERSION,
  profile: MRV_PROFILE_MONO_RV32IM_V1,
  codeHash: mrvCodeHashHex(code),
  codeBytes: 4n,
  debugBytes: 0n,
  abi: { symbols: [{ name: "transfer", kind: "function", inputs: [], outputs: [] }] },
  imports: [{ module: "mono", name: "emit_event", id: 0x0302 }],
  memory: { initialPages: 1, maxPages: 4, stackBytes: 16384 },
  storageNamespace: { name: "contract_state", version: 1 },
  build: { toolchain: "mono-riscv", sourceDigest: `0x${"00".repeat(32)}`, profile: "release" },
};

const validated = validateMrvArtifactMetadata(metadata, code);
const deployer = mrvAddressToBech32("user", new Uint8Array(20).fill(0x11));
const deployAddress = deriveMrvContractAddress(deployer, 7n, validated.codeHash);
const deploy = buildMrvDeployPlan("0x13000000", {
  from: deployer,
  nonce: 7n,
  artifactHash: validated.codeHash,
  executionUnitLimit: 1_000_000n,
});
const call = buildMrvCallPlan(deployAddress, [0x01, 0x02]);
console.log(validated.syscalls, deploy.extension, deploy.expectedContractAddress, call.request);
```

### Spending-policy helpers

Fresh sub-account policy claims must use `claimPolicyByAddress` or
`setPolicyClaim`, both of which bind the policy to a sub-account ML-DSA-65
signature. Prefer `claimPolicyByAddress` after the pubkey is registered in
pubkey-registry; it avoids carrying the 1952-byte pubkey in calldata.
`policyArgs.subAccount` and `policyArgs.principal` must be typed `mono1...`
bech32m account addresses.

```ts
import {
  composeClaimBoundMessage,
  encodeClaimPolicyByAddressCalldata,
  encodeSetPolicyClaimCalldata,
} from "@monolythium/core-sdk";

const message = composeClaimBoundMessage(69420n, policyArgs);
// Sign `message` with the sub-account ML-DSA-65 key, then:
const calldata = encodeClaimPolicyByAddressCalldata(policyArgs, subAccountSig);
```

### Pubkey-registry helpers

The pubkey-registry precompile at `0x110D` publishes an account's
primary ML-DSA-65 pubkey once, so contracts can look it up by address.

```ts
import {
  addressToTypedBech32,
  encodeRegisterPubkeyCalldata,
  encodeLookupPubkeyCalldata,
  decodeLookupPubkeyReturn,
} from "@monolythium/core-sdk";

const account = addressToTypedBech32("user", "0x123456789abcdef0112233445566778899aabbcc");
const calldata = encodeRegisterPubkeyCalldata(mlDsa65Pubkey);
const lookup = encodeLookupPubkeyCalldata(account);
const decoded = decodeLookupPubkeyReturn(returnData);
```

### VRF / on-chain randomness

The VRF precompile at `0x1101` exposes per-round randomness. There are two
ways to read it:

- The **selectorless precompile call**: calldata is a 32-byte big-endian
  finalized block height followed by a caller-chosen domain tag (up to 256
  bytes). Successful return data is exactly 32 bytes. Calling it for a height
  that has not yet finalized reverts with `vrf: height not finalized`.
- The **historical leader seed**: `lythGetRoundCertificate(round).signature`
  is the ML-DSA-65 leader-seed digest (a BLAKE3 hash over the round's
  ML-DSA quorum certificate) that seeded that round's leader beacon.

```ts
import {
  RpcClient,
  encodeVrfEvaluateCalldata,
  decodeVrfOutput,
  vrfAddressHex,
  VRF_HEIGHT_NOT_FINALIZED_REVERT,
} from "@monolythium/core-sdk";

const client = await RpcClient.forNetwork("testnet-69420");

// (a) Read the historical leader seed for a finalized round.
const cert = await client.lythGetRoundCertificate(1_000n);
const leaderSeed = cert?.signature; // 0x-prefixed leader-seed digest

// (b) Encode + decode a 0x1101 eth_call for a finalized height. The domain
//     tag namespaces the randomness per consumer.
const height = await client.ethBlockNumber();
const data = encodeVrfEvaluateCalldata(height, "dice-roll");
try {
  const ret = await client.ethCall({ to: vrfAddressHex(), data });
  const randomness = decodeVrfOutput(ret); // 32 bytes
  console.log(leaderSeed, randomness);
} catch (err) {
  // Calling at an unfinalized height reverts with this message.
  if (String(err).includes(VRF_HEIGHT_NOT_FINALIZED_REVERT)) {
    console.warn("requested height has not finalized yet");
  }
}
```

### Node-registry lifecycle helpers

Operator tooling can build canonical node-registry calldata for Monarch
recovery, roster pending changes, cancellation, and DKG re-share attestation.

```ts
import {
  encodeRecoverOperatorNodeCalldata,
  encodeSubmitPendingChangeCalldata,
  encodeCancelPendingChangeCalldata,
  encodeAttestDkgReshareCalldata,
} from "@monolythium/core-sdk";

const recovery = encodeRecoverOperatorNodeCalldata(peerId);
const pending = encodeSubmitPendingChangeCalldata({
  kind: "rotate",
  targetPubkey,
  effectiveEpoch: 42n,
  intentId: 7n,
});
const cancel = encodeCancelPendingChangeCalldata({ epoch: 42n, targetPubkey });
const dkg = encodeAttestDkgReshareCalldata({ intentId: 7n, consensusPublicKeys, thresholdSig });
```

### Bridge route readiness

Bridge helpers assess explicit route disclosures and fail closed. The SDK can
select a route for an intent, but it cannot produce a live quote or submit
payload until `mono-core` exposes those API/runtime primitives.

```ts
import { bridgeQuoteSubmitReadiness } from "@monolythium/core-sdk";

const readiness = bridgeQuoteSubmitReadiness(intent, routeDisclosures);
console.log(readiness.routeSelectionReady, readiness.quoteReady, readiness.blockedReasons);
```

### BIP-39 + ML-DSA-65 helpers

Wallets and faucets derive deterministic ML-DSA-65 backends directly in
TypeScript from standard 24-word BIP-39 mnemonics. The signing seed is the
domain-separated SHAKE256 of the standard BIP-39 PBKDF2 seed:

```text
seed64      = mnemonicToSeedSync(mnemonic, "")            // HMAC-SHA512, 2048 rounds, 64 bytes
mldsa65Seed = shake256("monolythium.mldsa65.v1" || seed64, { dkLen: 32 })
```

```ts
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToAddress,
  mnemonicToMlDsa65Backend,
} from "@monolythium/core-sdk/crypto";

const mnemonic = generateMnemonic(); // 24 words, 256-bit BIP-39
validateMnemonic(mnemonic); // true (checksum + 24-word count)
const address = mnemonicToAddress(mnemonic);
const backend = mnemonicToMlDsa65Backend(mnemonic);
const signature = backend.sign(new Uint8Array([1, 2, 3]));
```

### LythiumSeal scheme-3 (encrypted mempool)

The SDK can seal a signed transaction to a cluster's post-quantum
threshold recipient set so that no single operator can read the body. The
scheme is cluster-ML-KEM-768 (FIPS-203) + GF(256) Shamir `t`-of-`n` +
committing ChaCha20-Poly1305 with an explicit SHAKE256 key-commitment. The
TypeScript seal is byte-exact against the chain: a cross-language known-
answer test reproduces the exact envelope bincode bytes the node accepts.

```ts
import {
  getClusterSealKeys,
  parseClusterSealKeys,
  sealTransaction,
  submitSealedTransaction,
  MempoolClass,
} from "@monolythium/core-sdk/crypto";

// Read the cluster seal roster. On nodes that disable
// `lyth_getClusterSealKeys` (the public profile), read the roster from
// genesis (`[[clusters.members]]` `seal_ek`) and pass it through
// `parseClusterSealKeys` instead - the roster hash is recomputed and
// verified against the ek set so a wallet cannot seal under a mismatched
// roster hash.
const clusterSealKeys = await getClusterSealKeys(client, 0);

// `aad` fee fields MUST mirror the signed inner tx exactly (Law §3.6).
const submission = await sealTransaction({
  signedTxBincode,          // bincode SignedTransaction wire bytes
  clusterSealKeys,
  aad: {
    sender,                 // 20-byte address
    nonce,
    chainId,
    class: MempoolClass.Transfer,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasLimit,
  },
  senderAddress: sender,
  senderPubkey,             // 1952-byte ML-DSA-65 public key
  signOuterDigest: (digest) => backend.sign(digest),
});

await submitSealedTransaction(client, submission);
```

The lower-level `sealToCluster` / `encodeSealEnvelope` / `sealRosterHash`
primitives are also exported for callers that build the envelope directly.

### ethers / viem compatibility

The SDK does not ship an ethers-style provider or signer. The chain
does not accept Ethereum-style ECDSA signatures at transaction
admission, and there is no `eth_call` / `eth_estimateGas` /
`eth_sendRawTransaction` on the dispatcher to translate to. Tooling
that wants to read EVM-shaped block, balance, receipt, or log fields
can keep using the curated `eth_*` read methods exposed by `RpcClient`
directly (`ethBlockNumber`, `ethGetBalance`, `ethGetBlockByNumber`,
`ethGetTransactionReceipt`, `ethGetLogs`, …). Submitting and signing
transactions go through the native builders (`mesh_buildUnsignedTx` +
ML-DSA-65 signer + `mesh_submitTx`, or `lyth_submitEncrypted`).

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm test                  # unit tests against a stub fetch
MONO_CORE_RPC_URL=... pnpm test   # plus live round-trip tests
pnpm run pack:smoke        # verify the published tarball layout
```

When the Rust types change, regenerate the bindings:

```bash
cd ../..
cargo test --features ts-bindings export_bindings
bash packages/ts/scripts/sync-bindings.sh
```

## License

Apache-2.0.
