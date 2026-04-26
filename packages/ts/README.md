# @monolythium/core-sdk

Official TypeScript SDK for [Monolythium v2](https://monolythium.com) (LythiumDAG-BFT).

## Install

```bash
pnpm add @monolythium/core-sdk
```

## Usage

```ts
import { RpcClient } from "@monolythium/core-sdk";

const client = new RpcClient("https://rpc.testnet.monolythium.com");

const chainId = await client.ethChainId();
const head = await client.ethBlockNumber();
console.log(`chain ${chainId} at height ${head}`);

const validators = await client.lythValidatorSet();
console.log(`${validators.length} validators`);
```

The client wraps every JSON-RPC method served by a Monolythium node — the
EVM-compatible `eth_*` / `net_*` / `web3_*` surface and the chain-native
`lyth_*` and `debug_*` namespaces. Wire types are generated from the Rust
SDK via `ts-rs`; see `src/bindings/`.

Quantities surface as `bigint` to preserve full precision. Use
`parseQuantity` only when you know the value fits in `Number.MAX_SAFE_INTEGER`.

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
