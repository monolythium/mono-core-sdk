# mono-core-sdk

Official Rust + TypeScript SDK for Monolythium v2 (LythiumDAG-BFT)

> Part of the [Monolythium](https://monolythium.com) ecosystem — a sovereign Layer-1 for finality-first apps.

---

## What this is

`mono-core-sdk` is the official client library for talking to Monolythium v2 nodes. It provides typed wrappers around the chain's JSON-RPC surface (both `eth_*` Ethereum-compatible methods and chain-native `protocore_*` methods) so that applications never have to hand-craft RPC payloads. The repo ships two packages: a Rust crate (`monolythium-core-sdk`) and a TypeScript package (`@monolythium/core-sdk`) generated from the same type definitions.

> **Status:** v0.0.1 — scaffold only. The public API lands in v0.1. The current build is a placeholder so dependent surfaces can wire imports without the API churning under them.

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

The v0.0.1 surface exposes a single `version()` accessor while the typed RPC client is being scaffolded:

```rust
use monolythium_core_sdk::version;

fn main() {
    println!("monolythium-core-sdk v{}", version());
}
```

```ts
import { version } from "@monolythium/core-sdk";

console.log(`monolythium-core-sdk v${version}`);
```

The full RPC surface (block/tx/account queries, validator-set + cluster introspection, signer trait + keychain-backed implementation) lands in v0.1.

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
