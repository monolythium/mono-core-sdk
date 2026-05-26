/**
 * Tx wire translation between ethers.js and `mono-core`.
 *
 * The chain natively accepts EIP-1559-shape EVM transactions on the
 * `Tx::Evm` (kind tag `0x01`) wire path — a `SignedTransaction` payload
 * carries the legacy EIP-1559 envelope plus the secp256k1 signature.
 * That makes the round-trip simple: ethers produces the canonical
 * EIP-1559 RLP, the client posts it via `eth_sendRawTransaction`, the
 * chain decodes it, and the receipt comes back through the same
 * `eth_getTransactionReceipt` shape ethers expects.
 *
 * Two notes for any future maintainer:
 *
 * 1. **No chain-level Ethereum retrofit.** This shim is SDK-only — see
 *    `feedback_no_ethereum_wire_retrofit.md`. The chain keeps its
 *    custom envelope and native tx hash for the protocol-native path
 *    (ML-DSA-65 signing, native tx kinds beyond EVM). The shim only
 *    spans the **EIP-1559 EVM subset** of the chain's tx surface.
 * 2. **Fields ethers does not see.** Monolythium-specific extension
 *    fields (privacy flags, native tx kinds, ML-DSA-65 signatures) are
 *    intentionally dropped by these helpers. Callers that need those
 *    surfaces use the native SDK signer trait, not the ethers shim.
 */

import type { CallRequest } from "../bindings/CallRequest.js";
import type { TransactionReceipt as MonoTransactionReceipt } from "../bindings/TransactionReceipt.js";

/**
 * The EIP-1559 subset of fields ethers' `TransactionRequest` carries
 * across the shim. We don't import ethers' type here so the shim can be
 * compiled (and its types re-exported) even when ethers isn't installed
 * — ethers is a peerDependency, not a hard dependency.
 */
export interface EthersTxRequestSubset {
  to?: string | null;
  from?: string | null;
  nonce?: number | bigint | null;
  gasLimit?: bigint | string | null;
  gasPrice?: bigint | string | null;
  maxFeePerGas?: bigint | string | null;
  maxPriorityFeePerGas?: bigint | string | null;
  value?: bigint | string | null;
  data?: string | null;
  chainId?: bigint | number | null;
  type?: number | null;
}

/** `0x`-prefixed hex helpers — kept local so this module has no import surface. */
function toHexQuantity(v: bigint | number | string | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    if (v.startsWith("0x") || v.startsWith("0X")) return v;
    // Ethers occasionally hands us decimal strings — be lenient.
    return `0x${BigInt(v).toString(16)}`;
  }
  if (typeof v === "number") return `0x${v.toString(16)}`;
  return `0x${v.toString(16)}`;
}

/**
 * Translate ethers' `TransactionRequest` into the wire shape the
 * `mono-core` JSON-RPC accepts for `eth_call` / `eth_estimateGas`.
 *
 * Returns the SDK's `CallRequest` shape (which mirrors the chain's
 * accepted `eth_call` argument). Round-trips losslessly for the
 * EIP-1559 EVM subset; Monolythium-specific extension fields are
 * intentionally not surfaced here.
 */
export function translateTxIn(req: EthersTxRequestSubset): CallRequest {
  const out: CallRequest = {};
  if (req.from !== undefined && req.from !== null) out.from = req.from;
  if (req.to !== undefined && req.to !== null) out.to = req.to;
  const gas = toHexQuantity(req.gasLimit);
  if (gas !== undefined) out.gas = gas;
  // Use `gasPrice` for legacy / non-EIP-1559 paths. EIP-1559 priority +
  // fee fields are not part of the v0.0.x server's `eth_call` shape; the
  // chain ignores them on dry-runs.
  const gasPrice = toHexQuantity(req.gasPrice);
  if (gasPrice !== undefined) out.gasPrice = gasPrice;
  const value = toHexQuantity(req.value);
  if (value !== undefined) out.value = value;
  if (req.data !== undefined && req.data !== null) out.data = req.data;
  return out;
}

/**
 * The ethers v6 wire shape for `eth_getTransactionReceipt`. We hand-roll
 * this rather than importing ethers' internal types because the shim
 * has to compile without ethers installed (peerDependency).
 *
 * Field naming and casing match what `JsonRpcApiProvider._perform` expects
 * back — the provider then normalises into ethers' rich
 * `TransactionReceipt` for callers.
 */
export interface EthersReceiptShape {
  transactionHash: string;
  blockHash: string;
  blockNumber: string; // 0x-hex
  transactionIndex: string; // 0x-hex
  status: string; // "0x0" | "0x1"
  gasUsed: string; // 0x-hex
  cumulativeGasUsed: string; // 0x-hex
  effectiveGasPrice: string; // 0x-hex
  contractAddress: string | null;
  from: string;
  to: string | null;
  type: string; // 0x-hex
  logsBloom: string; // 0x-hex 256 bytes
  logs: unknown[];
}

/**
 * Translate `mono-core`'s native `TransactionReceipt` into the wire
 * shape ethers expects. Required for `eth_getTransactionReceipt` to
 * surface a usable `TransactionResponse` to ethers callers.
 *
 * The chain's receipt today is intentionally narrow — log emission,
 * cumulative execution-unit aggregation, and effective-fee disclosure are
 * tracked OI items. This translator fills in zero-equivalent values for
 * those gaps; callers that need the full native surface consume the SDK
 * receipt shape directly.
 */
export function translateReceiptOut(
  monoReceipt: MonoTransactionReceipt,
  fromAddress: string | null,
  toAddress: string | null,
): EthersReceiptShape {
  return {
    transactionHash: monoReceipt.tx_hash,
    blockHash: monoReceipt.block_hash,
    blockNumber: `0x${BigInt(monoReceipt.block_number).toString(16)}`,
    transactionIndex: `0x${monoReceipt.tx_index.toString(16)}`,
    status: monoReceipt.status === 1 ? "0x1" : "0x0",
    gasUsed: `0x${BigInt(monoReceipt.executionUnitsUsed).toString(16)}`,
    cumulativeGasUsed: `0x${BigInt(monoReceipt.executionUnitsUsed).toString(16)}`,
    effectiveGasPrice: "0x0",
    contractAddress: null,
    from: fromAddress ?? "0x0000000000000000000000000000000000000000",
    to: toAddress,
    type: "0x2",
    logsBloom: `0x${"0".repeat(512)}`,
    logs: [],
  };
}

/**
 * Translate `mono-core`'s `BlockHeader` into the ethers v6 wire shape
 * for `eth_getBlockByNumber` / `eth_getBlockByHash`.
 *
 * The chain's block header is intentionally narrower than Ethereum's
 * — it omits fields that don't exist in Monolythium (uncles, mix hash,
 * difficulty, nonce, sha3Uncles). This translator emits zero-valued
 * stand-ins so ethers' normaliser does not throw. Callers needing the
 * authoritative shape import the native `BlockHeader` from the SDK.
 */
export interface EthersBlockShape {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  stateRoot: string;
  miner: string;
  difficulty: string;
  nonce: string;
  baseFeePerGas: string | null;
  extraData: string;
  mixHash: string;
  transactions: string[];
  transactionsRoot: string;
  receiptsRoot: string;
  logsBloom: string;
  sha3Uncles: string;
  uncles: string[];
  size: string;
}

/**
 * Translate `mono-core`'s `BlockHeader` to the ethers wire shape.
 * `transactions` defaults to an empty list — the SDK's
 * `eth_getBlockByNumber` does not yet return tx hashes; once Stage 1+
 * surfaces them, callers update this translator.
 */
export function translateBlockOut(header: {
  number: bigint;
  hash: string;
  parent_hash: string;
  state_root: string;
  timestamp: bigint;
  executionUnitsUsed: bigint;
  executionUnitLimit: bigint;
}): EthersBlockShape {
  return {
    number: `0x${header.number.toString(16)}`,
    hash: header.hash,
    parentHash: header.parent_hash,
    timestamp: `0x${header.timestamp.toString(16)}`,
    gasUsed: `0x${header.executionUnitsUsed.toString(16)}`,
    gasLimit: `0x${header.executionUnitLimit.toString(16)}`,
    stateRoot: header.state_root,
    miner: "0x0000000000000000000000000000000000000000",
    difficulty: "0x0",
    nonce: "0x0000000000000000",
    baseFeePerGas: null,
    extraData: "0x",
    mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    transactions: [],
    transactionsRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
    receiptsRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
    logsBloom: `0x${"0".repeat(512)}`,
    sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    uncles: [],
    size: "0x0",
  };
}
