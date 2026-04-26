# mono-core-sdk

Official Rust + TypeScript SDK for Monolythium v2 (LythiumDAG-BFT)

> Part of the [Monolythium](https://monolythium.com) ecosystem — a sovereign Layer-1 for finality-first apps.

---

## What this is

`mono-core-sdk` is the official client library for talking to Monolythium v2 nodes. It provides typed wrappers around the chain's JSON-RPC surface (both `eth_*` Ethereum-compatible methods and chain-native `lyth_*` methods, per Law §13.2) so that applications never have to hand-craft RPC payloads. The repo ships two packages: a Rust crate (`monolythium-core-sdk`) and a TypeScript package (`@monolythium/core-sdk`) whose wire types are generated from the same Rust definitions via `ts-rs`.

> **Status:** v0.1.0 — typed RPC client ships in both languages with `ts-rs`-generated TypeScript bindings. Higher-level features (signer trait, keychain integration, ethers-compat shim) land in v0.2.

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

Both packages expose an `RpcClient` that wraps every JSON-RPC method served by a Monolythium node — the EVM-compatible `eth_*` / `net_*` / `web3_*` surface plus the chain-native `lyth_*` and `debug_*` namespaces.

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

    let validators = client.lyth_validator_set().await?;
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

const validators = await client.lythValidatorSet();
console.log(`${validators.length} validators`);
```

### Notes

- Both clients accept any HTTP JSON-RPC endpoint exposed by a `mono-core` node.
- `debug_*` methods are gated server-side via `RpcConfig::debug_enabled` — calls return an `SdkError` carrying the node's `MethodDisabled` code when the namespace is off.
- `lyth_subscribe` / `lyth_unsubscribe` are WebSocket-only and surface the server's "not implemented" error when called over HTTP. Full WS support is on the roadmap.
- Round-trip integration tests against a live node live in `packages/ts/tests/integration.test.ts`; set `MONO_CORE_RPC_URL` to enable them. They skip cleanly when the variable is unset so CI on dev machines stays green without a chain handy.

The signer trait, keychain integration, and ethers-compat shim follow in v0.2.

## Documentation

- Project site: https://monolythium.com
- Public docs: https://docs.monolythium.com (coming with v0.1)

## Building from source

```bash
# Rust crate
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --all-features

# TypeScript package
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r build
pnpm -r test
```

Regenerate TypeScript bindings from the Rust types after a wire-type change:

```bash
cargo test --features ts-bindings export_bindings
bash packages/ts/scripts/sync-bindings.sh
```

Requirements: Rust 1.82+, Node 22+, pnpm 10+.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the guidelines.

## Security

Found a vulnerability? Please **do not open a public issue**. Email security@monolythium.com instead. See [SECURITY.md](./SECURITY.md) for the full disclosure policy.

## License

Released under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for the full text.
