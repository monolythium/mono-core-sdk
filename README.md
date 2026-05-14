# mono-core-sdk

Official Rust and TypeScript SDK for Monolythium v4.0 / LythiumDAG-BFT.

This repository is the application boundary for code that should not have to
know `mono-core` internals. It provides typed JSON-RPC clients, canonical chain
constants, address-display helpers, precompile calldata builders, and an
ethers.js v6 compatibility shim for existing Solidity tooling.

## Packages

| Package | Path | Status |
| --- | --- | --- |
| `monolythium-core-sdk` | `crates/core-sdk` | Rust RPC client, constants, address helpers, precompile ABI helpers |
| `@monolythium/core-sdk` | `packages/ts` | TypeScript RPC client, generated wire types, address/precompile helpers, ethers v6 shim |

The SDK tracks the live `mono-core` RPC and precompile surface. Wire types under
`packages/ts/src/bindings/` are generated from the Rust SDK with `ts-rs`.

## What Ships

- Typed `RpcClient` wrappers for `eth_*`, `net_*`, `web3_*`, `lyth_*`, and
  gated `debug_*` methods.
- Live explorer RPC helpers for decoded transactions, global transaction feeds,
  address profiles/flows, exact search, chain stats, gap records, DAG parents,
  rich lists, and CLOB markets/trades/OHLC/order books.
- Typed `ApiClient` wrappers for the explorer-facing `/api/v1` HTTP surface:
  health, capabilities, blocks, block transactions, transactions, receipts,
  address activity, clusters, operators, and upgrade status.
- Canonical precompile address constants, including recent Stage 7 additions:
  `SPENDING_POLICY` at `0x110C` and `PUBKEY_REGISTRY` at `0x110D`.
- `mono1...` bech32m display helpers for 20-byte wire addresses.
- Spending-policy calldata helpers for `claimPolicyByAddress`,
  `setPolicyClaim`, `setPolicy`, `enable`, and `disable`.
- Pubkey-registry calldata helpers for `registerPubkey`, `lookupPubkey`, and
  `hasPubkey`, plus return decoders for the view calls.
- TypeScript ethers v6 provider/signer adapters.
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

For ethers compatibility:

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
const profile = await client.lythAddressProfile("0x123456789abcdef0112233445566778899aabbcc");
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

## Node API Client

`ApiClient` targets the REST-shaped `/api/v1` routes served by `mono-core`.
Pass the same node URL used for JSON-RPC; the SDK derives `/api/v1`
automatically.

TypeScript:

```ts
import { ApiClient } from "@monolythium/core-sdk";

const api = new ApiClient("https://rpc.testnet.monolythium.com");

const health = await api.health();
const latest = await api.block("latest");
const activity = await api.addressActivity("0x123456789abcdef0112233445566778899aabbcc");

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

Monolythium addresses are 20-byte EVM-compatible values on the JSON-RPC wire.
Wallets, explorers, and user-facing apps should display them as `mono1...`
bech32m.

TypeScript:

```ts
import { addressToBech32, bech32ToAddress } from "@monolythium/core-sdk";

const display = addressToBech32("0x123456789abcdef0112233445566778899aabbcc");
const wire = bech32ToAddress(display);
```

Rust:

```rust
use monolythium_core_sdk::{address_to_bech32, bech32_to_address};

let display = address_to_bech32([0x42; 20]);
let wire = bech32_to_address(&display).expect("valid mono1 address");
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
  encodeRegisterPubkeyCalldata,
  encodeLookupPubkeyCalldata,
  decodeLookupPubkeyReturn,
} from "@monolythium/core-sdk";

const calldata = encodeRegisterPubkeyCalldata(mlDsa65Pubkey);
// send a transaction to PRECOMPILE_ADDRESSES.PUBKEY_REGISTRY with `calldata`

const lookup = encodeLookupPubkeyCalldata("0x123456789abcdef0112233445566778899aabbcc");
// eth_call to PUBKEY_REGISTRY, then:
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

## Ethers.js Compatibility

The TypeScript package ships an ethers v6 shim so existing Solidity tooling can
target Monolythium by swapping provider/signer instances. This is SDK-level
compatibility only; the chain keeps its native transaction and hash semantics.

```ts
import { Wallet, ContractFactory } from "ethers";
import { MonolythiumProvider, MonolythiumSigner } from "@monolythium/core-sdk";

const provider = new MonolythiumProvider("https://rpc.testnet.monolythium.com");
const wallet = new Wallet(process.env.PRIVATE_KEY!);
const signer = MonolythiumSigner.fromEthersWallet(wallet, provider);

const factory = new ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy();
await contract.waitForDeployment();
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
