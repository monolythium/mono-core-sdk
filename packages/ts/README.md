# @monolythium/core-sdk

Official TypeScript SDK for [Monolythium v4.0](https://monolythium.com) (LythiumDAG-BFT).

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

The client wraps every JSON-RPC method served by a Monolythium node — the
EVM-compatible `eth_*` / `net_*` / `web3_*` surface and the chain-native
`lyth_*` and `debug_*` namespaces, including live explorer helpers such as
`lyth_decodeTx`, `lyth_gapRecords`, `lyth_dagParents`, `lyth_richList`,
`lyth_txFeed`, `lyth_addressProfile`, `lyth_addressFlow`, `lyth_search`,
`lyth_chainStats`, `lyth_clobMarkets`, `lyth_clobTrades`, `lyth_clobOhlc`,
`lyth_clobOrderBook`, and `lyth_addressActivityKind`. Wire types are generated
from the Rust SDK via `ts-rs` where possible, with SDK-local convenience types
for newer explorer envelopes.

Quantities surface as `bigint` to preserve full precision. Use
`parseQuantity` only when you know the value fits in `Number.MAX_SAFE_INTEGER`.

### Node API client

The SDK also exports `ApiClient` for the node's REST-shaped `/api/v1` surface.
Pass the JSON-RPC endpoint; the client derives `/api/v1` automatically.

```ts
import { ApiClient } from "@monolythium/core-sdk";

const api = new ApiClient("https://rpc.testnet.monolythium.com");

const latest = await api.block("latest");
const txs = await api.blockTransactions("latest", 0, 25);
const activity = await api.addressActivity("0x123456789abcdef0112233445566778899aabbcc");

console.log(latest.data.block.blockHash, txs.data.totalTransactions, activity.data.entries.length);
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

User-facing surfaces should display Monolythium addresses as `mono1...`
bech32m, while JSON-RPC still uses 20-byte `0x...` hex.

```ts
import { addressToBech32, bech32ToAddress } from "@monolythium/core-sdk";

const display = addressToBech32("0x123456789abcdef0112233445566778899aabbcc");
const wire = bech32ToAddress(display);
```

### Spending-policy helpers

Fresh sub-account policy claims must use `claimPolicyByAddress` or
`setPolicyClaim`, both of which bind the policy to a sub-account ML-DSA-65
signature. Prefer `claimPolicyByAddress` after the pubkey is registered in
pubkey-registry; it avoids carrying the 1952-byte pubkey in calldata.

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
  encodeRegisterPubkeyCalldata,
  encodeLookupPubkeyCalldata,
  decodeLookupPubkeyReturn,
} from "@monolythium/core-sdk";

const calldata = encodeRegisterPubkeyCalldata(mlDsa65Pubkey);
const lookup = encodeLookupPubkeyCalldata("0x123456789abcdef0112233445566778899aabbcc");
const decoded = decodeLookupPubkeyReturn(returnData);
```

### PQM-1 + ML-DSA-65 helpers

Wallets and faucets can derive deterministic ML-DSA-65 backends directly in
TypeScript from PQM-1 mnemonics.

```ts
import {
  generatePqm1Mnemonic,
  pqm1MnemonicToAddress,
  pqm1MnemonicToMlDsa65Backend,
} from "@monolythium/core-sdk/crypto";

const mnemonic = generatePqm1Mnemonic();
const address = pqm1MnemonicToAddress(mnemonic);
const backend = pqm1MnemonicToMlDsa65Backend(mnemonic);
const signature = backend.sign(new Uint8Array([1, 2, 3]));
```

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
