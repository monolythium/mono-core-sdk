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

### ethers.js v6 compat

The package also ships an ethers v6 compat shim — a `MonolythiumProvider`
and `MonolythiumSigner` that drop in wherever ethers' `Provider` and
`Signer` are expected. `ethers` is a peer dependency.

```ts
import { Wallet, ContractFactory } from "ethers";
import {
  MonolythiumProvider,
  MonolythiumSigner,
} from "@monolythium/core-sdk";

const provider = new MonolythiumProvider("https://rpc.testnet.monolythium.com");
const wallet = new Wallet(process.env.PRIVATE_KEY!);
const signer = MonolythiumSigner.fromEthersWallet(wallet, provider);

const factory = new ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy();
await contract.waitForDeployment();
```

For non-secp256k1 signing sources (OS keychain, hardware wallet, future
ML-DSA-65 backends), implement `MonolythiumSignerBackend` and pass it to
`new MonolythiumSigner(backend, provider)`.

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
