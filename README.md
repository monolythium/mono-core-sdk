# mono-core-sdk

Official Rust and TypeScript SDK for Monolythium v4.1 / LythiumDAG-BFT.

This repository is the application boundary for code that should not have to
know `mono-core` internals. It provides typed JSON-RPC clients, canonical chain
constants, address-display helpers, native MRV/RISC-V helpers, precompile
calldata builders, and a legacy ethers.js v6 compatibility shim for migration
tooling.

## Packages

| Package | Path | Status |
| --- | --- | --- |
| `monolythium-core-sdk` | `crates/core-sdk` | Rust RPC client, constants, address helpers, precompile ABI helpers |
| `@monolythium/core-sdk` | `packages/ts` | TypeScript RPC client, generated wire types, address/precompile helpers, ethers v6 shim |

The SDK tracks the live `mono-core` RPC and precompile surface. Wire types under
`packages/ts/src/bindings/` are generated from the Rust SDK with `ts-rs`.

## What Ships

- Typed `RpcClient` wrappers for current `lyth_*` native methods, passive
  `eth_*`/`net_*`/`web3_*` reads, and gated legacy compatibility/debug methods.
- Live explorer RPC helpers for decoded transactions, global transaction feeds,
  address profiles/flows, exact search, chain stats, gap records, DAG parents,
  rich lists, and CLOB markets/trades/OHLC/order books.
- Typed `ApiClient` wrappers for the explorer-facing `/api/v1` HTTP surface:
  health, capabilities, blocks, block transactions, transactions, receipts,
  address activity, clusters, operators, and upgrade status.
- Canonical precompile address constants, including recent Stage 7 additions:
  `SPENDING_POLICY` at `0x110C` and `PUBKEY_REGISTRY` at `0x110D`.
- `mono1...` bech32m display helpers for 20-byte wire addresses.
- Additive v4.1 MRV/RISC-V helpers for typed bech32m HRPs, artifact metadata
  validation, MRV v1 transaction extension descriptors, and native deploy/call
  request and receipt models using lythoshi and execution-unit terminology.
- Spending-policy calldata helpers for `claimPolicyByAddress`,
  `setPolicyClaim`, `setPolicy`, `enable`, and `disable`.
- Pubkey-registry calldata helpers for `registerPubkey`, `lookupPubkey`, and
  `hasPubkey`, plus return decoders for the view calls.
- Bridge route disclosure helpers for deterministic route selection plus an
  explicit quote/submit readiness boundary. Live bridge quote and submit remain
  blocked until `mono-core` exposes API/runtime primitives for them.
- Legacy TypeScript ethers v6 provider/signer adapters for migration tooling;
  v4.1 app paths should prefer the native MRV/RISC-V and `lyth_*` helpers.
- TypeScript PQM-1 + ML-DSA-65 helpers for mnemonic payloads, deterministic
  seed derivation, address derivation, and signing backends.

## Install

Rust:

```bash
cargo add monolythium-core-sdk
```

TypeScript:

```bash
pnpm add @monolythium/core-sdk
```

For legacy ethers compatibility:

```bash
pnpm add @monolythium/core-sdk ethers
```

## JSON-RPC Client

Rust:

```rust
use monolythium_core_sdk::{types::BlockSelector, RpcClient};

#[tokio::main]
async fn main() -> Result<(), monolythium_core_sdk::SdkError> {
    let client = RpcClient::new("https://rpc.testnet.monolythium.com")?;

    let chain_id = client.eth_chain_id().await?;
    let height = client.eth_block_number().await?;
    let block = client.eth_get_block_by_number(BlockSelector::LATEST).await?;

    println!("chain {chain_id} height {height}");
    if let Some(block) = block {
        println!("latest hash: {}", block.hash);
    }

    Ok(())
}
```

TypeScript:

```ts
import { RpcClient } from "@monolythium/core-sdk";

const client = new RpcClient("https://rpc.testnet.monolythium.com");

const chainId = await client.ethChainId();
const height = await client.ethBlockNumber();
const clusters = await client.lythClusterDirectory(0, 100);
const txs = await client.lythTxFeed(25);
const stats = await client.lythChainStats();

console.log({ chainId, height, clusterCount: clusters.totalClusters, txs: txs.transactions.length, peers: stats.peerCount });
```

Explorer and wallet surfaces can use the same client for the live aggregate
views exposed by the node:

```ts
import { addressToTypedBech32 } from "@monolythium/core-sdk";

const account = addressToTypedBech32("user", "0x123456789abcdef0112233445566778899aabbcc");
const profile = await client.lythAddressProfile(account);
const flow = await client.lythAddressFlow(profile.address, 100);
const search = await client.lythSearch(profile.address);
const markets = await client.lythClobMarkets(25);

if (markets.markets[0]) {
  const marketId = markets.markets[0].marketId;
  const trades = await client.lythClobTrades(marketId, 50);
  const candles = await client.lythClobOhlc(marketId, 0, undefined, 100);
  const book = await client.lythClobOrderBook(marketId, 20);
  console.log({ flow: flow.totals, search: search.hits.length, trades: trades.trades.length, candles: candles.candles.length, book });
}
```

## Native MRC-4626 Vaults

MRC-4626 vault shares are indexed as token-balance rows. The row's top-level
`tokenId` is the vault id, and the attached `mrc` identity uses
`standard: "mrc4626"`, `assetId: <vaultId>`, and `tokenId: null`.

Holder lookups are asset/vault scoped:

```ts
const vaultHolders = await client.lythMrc4626Holders("0x...", 25);
const restVaultHolders = await api.mrc4626Holders("0x...", 25);
```

Smart/policy account lookup is available on both JSON-RPC and REST. The
optional limit bounds `policySpends` rows:

```ts
const mrcAccount = await client.lythMrcAccount("monos1effvdw0d05a35j69wwxplhmctpcclx382n60yf", 10);
const restAccount = await api.mrcAccount(mrcAccount.account, 10);

console.log(mrcAccount.smartAccount?.controller, mrcAccount.policySpends.length, restAccount.data.spendLimit);
```

The lower-level helpers are `lythMrcAssetHolders("mrc4626", vaultId, limit)`
and `mrcAssetHolders("mrc4626", vaultId, limit)`. Native decoded MRC events
use `family: "mrc"`; `mrc4626.deposit` and `mrc4626.withdraw` may include
`share_amount` while `amount` remains the underlying asset amount. The vault id
is carried as `primary_id`, alongside the existing `account` and `counterparty`
fields.

## Node API Client

`ApiClient` targets the REST-shaped `/api/v1` routes served by `mono-core`.
Pass the same node URL used for JSON-RPC; the SDK derives `/api/v1`
automatically.

TypeScript:

```ts
import { ApiClient, addressToTypedBech32 } from "@monolythium/core-sdk";

const api = new ApiClient("https://rpc.testnet.monolythium.com");

const health = await api.health();
const latest = await api.block("latest");
const account = addressToTypedBech32("user", "0x123456789abcdef0112233445566778899aabbcc");
const activity = await api.addressActivity(account);

console.log({ status: health.status, txs: latest.data.transactionCount, rows: activity.data.entries.length });
```

Rust:

```rust
use monolythium_core_sdk::{types::BlockSelector, ApiClient};

# async fn run() -> Result<(), monolythium_core_sdk::SdkError> {
let api = ApiClient::new("https://rpc.testnet.monolythium.com")?;
let latest = api.block(BlockSelector::LATEST).await?;
println!("latest block {}", latest.data.block.height);
# Ok(())
# }
```

## Address Display

Monolythium accounts are 20-byte payloads wrapped in typed ADR-0038 bech32m
strings at public SDK, wallet, explorer, REST, and JSON-RPC boundaries. User
accounts use `mono1...`; contract calls use `monoc1...`; smart-account MRC
lookups use `monos1...`. Raw `0x` address strings remain only for low-level
compatibility helpers and byte conversion utilities.

TypeScript:

```ts
import { addressToBech32, bech32ToAddress } from "@monolythium/core-sdk";

const display = addressToBech32("0x123456789abcdef0112233445566778899aabbcc");
const hex = bech32ToAddress(display);
```

Rust:

```rust
use monolythium_core_sdk::{address_to_bech32, bech32_to_address};

let display = address_to_bech32([0x42; 20]);
let bytes = bech32_to_address(&display).expect("valid mono1 address");
```

Typed v4.1 surfaces use distinct bech32m HRPs for each address role:
`mono` user accounts, `monos` smart accounts, `monoc` contracts, `monok`
clusters, `monom` multisigs, and `monox` system modules.

## MRV / RISC-V Helpers

The first v4.1 SDK slice exposes MRV artifact metadata validation, the MRV v1
transaction extension descriptor, typed contract addresses, and native
deploy/call request builders. It does not encode mono-core's bincode artifact
body yet; pass artifact bytes as raw bytes or `0x` hex and validate metadata
against the code bytes.

TypeScript:

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
const contract = mrvAddressToBech32("contract", new Uint8Array(20));
const deployer = mrvAddressToBech32("user", new Uint8Array(20).fill(0x11));
const deployAddress = deriveMrvContractAddress(
  deployer,
  7n,
  validated.codeHash,
);
const deploy = buildMrvDeployPlan("0x13000000", {
  from: deployer,
  nonce: 7n,
  artifactHash: validated.codeHash,
  executionUnitLimit: 1_000_000n,
});
const call = buildMrvCallPlan(contract, [0x01, 0x02]);
console.log(validated.codeHash, deploy.extension.kind, deploy.expectedContractAddress, deployAddress, call.request);
```

Rust:

```rust
use monolythium_core_sdk::mrv::{
    build_mrv_call_plan, build_mrv_deploy_plan, derive_mrv_contract_address,
    mrv_address_to_bech32, mrv_code_hash_hex, validate_mrv_artifact_metadata,
    MrvAddressKind, MrvArtifactMetadata, MrvRequestBuildOptions, MRV_FORMAT_VERSION,
};

# fn run(metadata: MrvArtifactMetadata, code: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
assert_eq!(metadata.format_version, MRV_FORMAT_VERSION);
let hash = mrv_code_hash_hex(code);
let validated = validate_mrv_artifact_metadata(&metadata, code)?;
let deployer = mrv_address_to_bech32(MrvAddressKind::User, [0x11; 20]);
let deploy_address = derive_mrv_contract_address(&deployer, 7, &validated.code_hash)?;
let artifact_bytes = code;
let deploy = build_mrv_deploy_plan(
    artifact_bytes,
    Some(&validated.code_hash),
    MrvRequestBuildOptions::new().from(deployer).nonce(7).execution_unit_limit(1_000_000),
)?;
let call = build_mrv_call_plan(&deploy_address, &[0x01, 0x02], MrvRequestBuildOptions::new())?;
println!("{} {} {} {}", hash, validated.code_hash, deploy.extension.kind, call.request.input);
# Ok(())
# }
```

## Pubkey Registry

The pubkey-registry precompile at `0x110D` publishes an account's primary
ML-DSA-65 pubkey once. This is needed because ML-DSA signatures do not support
Ethereum-style public-key recovery; contract-context verification must look up
the pubkey by address.

TypeScript:

```ts
import {
  PRECOMPILE_ADDRESSES,
  addressToTypedBech32,
  encodeRegisterPubkeyCalldata,
  encodeLookupPubkeyCalldata,
  decodeLookupPubkeyReturn,
} from "@monolythium/core-sdk";

const account = addressToTypedBech32("user", "0x123456789abcdef0112233445566778899aabbcc");
const calldata = encodeRegisterPubkeyCalldata(mlDsa65Pubkey);
// send a transaction to PRECOMPILE_ADDRESSES.PUBKEY_REGISTRY with `calldata`

const lookup = encodeLookupPubkeyCalldata(account);
// query PUBKEY_REGISTRY through the supported read surface for your target
// network, then:
const decoded = decodeLookupPubkeyReturn(returnData);
```

The precompile is milestone-gated in `mono-core` and returns a typed revert
before activation.

## PQM-1 And ML-DSA-65

The TypeScript package exposes deterministic PQM-1 helpers for wallets and
faucets that need to import or derive testnet accounts without calling into
Rust.

```ts
import {
  MlDsa65Backend,
  generatePqm1Mnemonic,
  pqm1MnemonicToAddress,
  pqm1MnemonicToMlDsa65Backend,
} from "@monolythium/core-sdk/crypto";

const mnemonic = generatePqm1Mnemonic();
const address = pqm1MnemonicToAddress(mnemonic);
const backend: MlDsa65Backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
const signature = backend.sign(new Uint8Array([1, 2, 3]));
```

## Spending Policy

Fresh sub-account policy claims must use `claimPolicyByAddress` or
`setPolicyClaim`, both of which bind policy fields to a sub-account ML-DSA-65
signature. `claimPolicyByAddress` is the preferred path after the sub-account
has registered its pubkey in pubkey-registry because it avoids carrying the
1952-byte pubkey in calldata. Legacy `setPolicy` is only for re-claims by an
already recorded principal.
`policyArgs.subAccount` and `policyArgs.principal` must be typed `mono1...`
bech32m account addresses.

TypeScript:

```ts
import {
  PRECOMPILE_ADDRESSES,
  composeClaimBoundMessage,
  encodeClaimPolicyByAddressCalldata,
  encodeSetPolicyClaimCalldata,
} from "@monolythium/core-sdk";

const message = composeClaimBoundMessage(69420n, policyArgs);
// sign `message` with the sub-account ML-DSA-65 key
const calldata = encodeClaimPolicyByAddressCalldata(policyArgs, subAccountSig);
// send a transaction to PRECOMPILE_ADDRESSES.SPENDING_POLICY
```

Use `encodeSetPolicyClaimCalldata(policyArgs, subAccountPubkey, subAccountSig)`
when the sub-account pubkey has not been registered yet.

The spending-policy precompile is also milestone-gated and typed-reverts before
activation.

## Legacy Ethers.js Compatibility

The TypeScript package still ships an ethers v6 shim for legacy migration
tooling. It is not the v4.1 no-EVM deployment path; current app work should use
native MRV/RISC-V builders and `lyth_*` read surfaces. The shim is SDK-level
compatibility only, and production no-EVM profiles may reject legacy simulation
or deployment RPC methods server-side.

```ts
import { Wallet } from "ethers";
import { MonolythiumProvider, MonolythiumSigner } from "@monolythium/core-sdk";

const provider = new MonolythiumProvider("https://rpc.testnet.monolythium.com");
const wallet = new Wallet(process.env.PRIVATE_KEY!);
const signer = MonolythiumSigner.fromEthersWallet(wallet, provider);

// Legacy-only adapter setup. Do not use this path for new v4.1 MRV deployments.
console.log(await signer.getAddress());
```

For non-secp256k1 signing sources, implement `MonolythiumSignerBackend` and pass
it to `new MonolythiumSigner(backend, provider)`.

## Development

Requirements:

- Rust 1.82+
- Node 22+
- pnpm 10+ via `corepack`

Useful commands:

```bash
cargo fmt --all
cargo test --workspace

corepack pnpm --dir packages/ts typecheck
corepack pnpm --dir packages/ts test
corepack pnpm --dir packages/ts build
```

Regenerate TypeScript bindings after Rust wire-type changes:

```bash
cargo test --features ts-bindings export_bindings
bash packages/ts/scripts/sync-bindings.sh
```

Live TypeScript integration tests are skipped unless `MONO_CORE_RPC_URL` is set:

```bash
MONO_CORE_RPC_URL=http://localhost:8545 corepack pnpm --dir packages/ts test
```

## Current Boundaries

- `lyth_subscribe` / `lyth_unsubscribe` are WebSocket-only on the node side;
  the HTTP clients surface the node's not-implemented error for those calls.
- Precompile helpers build calldata and decode return values. They do not decide
  milestone activation; callers should handle typed reverts from inactive
  precompiles.

## Security

Please do not open public issues for vulnerabilities. Send reports to
security@monolythium.com.

## License

Apache-2.0. See [LICENSE](./LICENSE).
