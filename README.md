# mono-core-sdk

Official Rust + TypeScript SDK for Monolythium v2 (LythiumDAG-BFT)

> Part of the [Monolythium](https://monolythium.com) ecosystem — a sovereign Layer-1 for finality-first apps.

---

## What this is

`mono-core-sdk` is the official client library for talking to Monolythium v2 nodes. It provides typed wrappers around the chain's JSON-RPC surface (both `eth_*` Ethereum-compatible methods and chain-native `protocore_*` methods) so that applications never have to hand-craft RPC payloads. The repo ships two packages: a Rust crate (`monolythium-core-sdk`) and a TypeScript package (`@monolythium/core-sdk`) generated from the same type definitions.

> **Status:** v0.0.1 — typed RPC client now ships in both languages. Higher-level features (signer trait, keychain integration, ethers-compat shim) land in v0.1.

## Who this is for

Developers building on Monolythium v2 — wallets, explorers, dapps, agents, and any backend service that needs typed access to a Monolythium node. The TypeScript package additionally ships an ethers.js-compat Signer/Provider shim so existing Solidity tooling can target Monolythium without rewrites; this is **SDK-level compatibility only** and does not retrofit the Ethereum wire format onto the chain.

## Install

Rust:

```bash
cargo add monolythium-core-sdk
```

TypeScript:

```bash
pnpm add @monolythium/core-sdk
```

## Getting started

Both packages expose an `RpcClient` that wraps every JSON-RPC method served by a Monolythium node — the EVM-compatible `eth_*` / `net_*` / `web3_*` surface plus the chain-native `protocore_*` and `debug_*` namespaces.

### Rust

```rust
use monolythium_core_sdk::{RpcClient, types::BlockSelector};

#[tokio::main]
async fn main() -> Result<(), monolythium_core_sdk::SdkError> {
    let client = RpcClient::new("https://rpc.testnet.monolythium.com")?;

    let chain_id = client.eth_chain_id().await?;
    let head = client.eth_block_number().await?;
    println!("chain {chain_id} at height {head}");

    let block = client.eth_get_block_by_number(BlockSelector::LATEST).await?;
    if let Some(block) = block {
        println!("latest hash: {}", block.hash);
    }

    let validators = client.protocore_validator_set().await?;
    println!("{} validators", validators.len());

    Ok(())
}
```

### TypeScript

```ts
import { RpcClient } from "@monolythium/core-sdk";

const client = new RpcClient("https://rpc.testnet.monolythium.com");

const chainId = await client.ethChainId();
const head = await client.ethBlockNumber();
console.log(`chain ${chainId} at height ${head}`);

const block = await client.ethGetBlockByNumber("latest");
if (block) console.log(`latest hash: ${block.hash}`);

const validators = await client.protocoreValidatorSet();
console.log(`${validators.length} validators`);
```

### Notes

- Both clients accept any HTTP JSON-RPC endpoint exposed by a `mono-core` node.
- `debug_*` methods are gated server-side via `RpcConfig::debug_enabled` — calls return an `SdkError` carrying the node's `MethodDisabled` code when the namespace is off.
- `protocore_subscribe` / `protocore_unsubscribe` are WebSocket-only and surface the server's "not implemented" error when called over HTTP. Full WS support is on the roadmap.
- Integration tests against a live node are deferred — running them from this repo would couple SDK CI to chain infrastructure. Spin up a local node and exercise the client manually until end-to-end harnesses land.

The signer trait, keychain integration, and ethers-compat shim follow in v0.1.

## Documentation

- Project site: https://monolythium.com
- Public docs: https://docs.monolythium.com (coming with v0.1)

## Building from source

```bash
cargo test --workspace
pnpm -r typecheck
pnpm -r build
```

Requirements: Rust 1.82+, Node 22+, pnpm 9+.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the guidelines.

## Security

Found a vulnerability? Please **do not open a public issue**. Email security@monolythium.com instead. See [SECURITY.md](./SECURITY.md) for the full disclosure policy.

## License

Dual-licensed under either of:

- Apache License, Version 2.0
- MIT License

at your option.
