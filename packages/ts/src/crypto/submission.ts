import { bytesToHex, hexToBytes } from "./bytes.js";
import type { MlDsa65Backend } from "./ml-dsa.js";
import type { NativeEvmTxFields } from "./tx.js";

export interface JsonRpcCallClient {
  call<T>(method: string, params?: unknown): Promise<T>;
}

/**
 * A built plaintext submission — the bincode-encoded chain-side
 * `SignedTransaction` (`0x`-prefixed hex) ready to hand to
 * `mesh_submitTx`, plus the canonical hashes the wallet validates the
 * node echo against.
 *
 * Mirrors the chain-side artefacts produced by the Rust SDK's
 * `build_chain_signed_tx` (`mono-core/crates/core/sdk/src/tx.rs`): the
 * ML-DSA-65 signature is taken over the canonical chain-side `sighash`
 * (keccak-256 of the 0x01-tagged preimage) and the canonical native tx
 * hash is the keccak-256 of the 0x02-tagged preimage with the signature
 * and public key appended.
 */
export interface PlaintextSubmission {
  /** Bincode `SignedTransaction` wire bytes, `0x`-prefixed. */
  signedTxWireHex: string;
  /** Canonical native tx hash the node echoes on admission. */
  innerTxHashHex: string;
  /** Canonical chain-side sighash that was signed. */
  innerSighashHex: string;
  /** Length in bytes of the bincode `SignedTransaction`. */
  innerWireBytes: number;
}

/**
 * Build a PLAINTEXT submission — the sole submit path since the v2
 * re-genesis dropped the encrypted (LythiumSeal) mempool.
 *
 * It re-shapes the native tx into the chain-side `SignedTransaction`,
 * signs over the canonical `sighash` with the ML-DSA-65 backend,
 * bincode-serializes the result, and `0x`-hex-encodes it. The bytes are
 * forwarded verbatim through `mesh_submitTx` (the node routes them to
 * `MempoolTx::plaintext` via `submit_raw`).
 *
 * Mirrors `TxClient::submit_plaintext` in the Rust SDK.
 */
export function buildPlaintextSubmission(args: {
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
}): PlaintextSubmission {
  const signed = args.backend.signEvmTx(args.tx);
  return {
    signedTxWireHex: `0x${signed.wireHex}`,
    innerTxHashHex: bytesToHex(signed.txHash),
    innerSighashHex: bytesToHex(signed.sighash),
    innerWireBytes: signed.wireBytes.length,
  };
}

/**
 * Submit a bincode-encoded chain-side `SignedTransaction` (`0x`-hex)
 * through the plaintext `mesh_submitTx` path and validate the node's
 * echoed canonical tx hash against the locally computed one.
 *
 * Mirrors the validation in `TxClient::submit_plaintext`: the node
 * echoes the 32-byte canonical native tx hash on admission, and any
 * mismatch (or non-32-byte response) is rejected loud so a wallet never
 * trusts a hash it did not derive itself.
 *
 * @returns the validated canonical native tx hash (`0x`-prefixed).
 */
export async function submitPlaintextTransaction(
  client: JsonRpcCallClient,
  signedTxWireHex: string,
  expectedTxHashHex: string,
): Promise<string> {
  const returned = await client.call<string>("mesh_submitTx", [signedTxWireHex]);
  const returnedBytes = hexToBytes(returned, "mesh_submitTx tx hash");
  if (returnedBytes.length !== 32) {
    throw new Error(
      `mesh_submitTx tx hash must be 32 bytes, got ${returnedBytes.length}`,
    );
  }
  const expectedBytes = hexToBytes(expectedTxHashHex, "expected tx hash");
  if (!bytesEqual(returnedBytes, expectedBytes)) {
    throw new Error(
      `mesh_submitTx returned tx hash ${bytesToHex(returnedBytes)} but the locally computed canonical hash is ${bytesToHex(expectedBytes)}`,
    );
  }
  return bytesToHex(returnedBytes);
}

/**
 * Build, sign, and submit a native transaction through the plaintext
 * `mesh_submitTx` path.
 *
 * Mirrors `TxClient::build_sign_submit` in the Rust SDK. The encrypted
 * (LythiumSeal) submit path was removed at the v2 re-genesis, so this is
 * the single build-sign-submit entry point.
 *
 * @returns the node-echoed-and-validated canonical native tx hash
 *   (`0x`-prefixed).
 */
export async function submitTransaction(args: {
  client: JsonRpcCallClient;
  backend: MlDsa65Backend;
  tx: NativeEvmTxFields;
}): Promise<string> {
  const plaintext = buildPlaintextSubmission({ backend: args.backend, tx: args.tx });
  return submitPlaintextTransaction(
    args.client,
    plaintext.signedTxWireHex,
    plaintext.innerTxHashHex,
  );
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
