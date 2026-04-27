/**
 * `MonolythiumSigner` — ethers v6 `AbstractSigner` adapter.
 *
 * Two backend strategies are supported, both via the same external
 * surface — `getAddress`, `signTransaction`, `signMessage`,
 * `signTypedData`:
 *
 * 1. **`fromEthersWallet`** — wraps a normal `ethers.Wallet`
 *    (secp256k1). Useful for tests, scripts, and any path where the
 *    user already has an Ethereum-style key. The SDK does not store
 *    the key — the wallet does.
 *
 * 2. **`MonolythiumSignerBackend`** — generic interface a non-ethers
 *    backend (keychain, hardware wallet, future ML-DSA-65 signer)
 *    implements to plug into ethers without forcing the SDK to take
 *    a hard ethers dependency on either the chain side or the
 *    consumer side.
 *
 * The address derivation rule for any backend is **Law §2.6**:
 * `keccak256(canonical_pubkey_bytes)[12..32]`, with algo-tagged domain
 * separation. For secp256k1 (the ethers Wallet path) this collapses
 * to the standard Ethereum derivation that `ethers.computeAddress`
 * already implements — so wallets the user already has work as-is.
 *
 * **What the shim is not.** This is SDK-level compat (per
 * `feedback_no_ethereum_wire_retrofit.md`). The chain's protocol-native
 * signing path is ML-DSA-65 (Law §2.1); ethers cannot produce ML-DSA
 * signatures, and the chain accepts secp256k1 only via the
 * crypto-agile `SignedTransaction` envelope. Use
 * `MonolythiumSignerBackend` to plug a native ML-DSA path in.
 */

import {
  AbstractSigner,
  type BaseWallet,
  type Provider,
  type Signer as EthersSigner,
  type TransactionRequest,
  type TypedDataDomain,
  type TypedDataField,
} from "ethers";

/**
 * Backend the `MonolythiumSigner` delegates signing to.
 *
 * The intent is to let consumers wire up any signing source — local
 * keystore, OS keychain, hardware wallet, or a future ML-DSA-65
 * adapter — without the shim forcing a particular implementation.
 *
 * Every method's return shape mirrors what ethers'
 * `AbstractSigner` callers expect, so the backend can compose with
 * any tooling built on ethers.
 */
export interface MonolythiumSignerBackend {
  /** Resolves to the 20-byte 0x-hex address (Law §2.6 derivation). */
  getAddress(): Promise<string>;

  /**
   * Resolves to a fully-encoded raw signed transaction (a 0x-hex
   * string). For secp256k1 this is the canonical EIP-1559 RLP that
   * `eth_sendRawTransaction` expects.
   */
  signTransaction(tx: TransactionRequest): Promise<string>;

  /**
   * Resolves to an EIP-191 personal-sign signature (`0x` + 65 bytes
   * for secp256k1 / variable for non-recoverable algorithms).
   */
  signMessage(message: string | Uint8Array): Promise<string>;

  /** Resolves to an EIP-712 typed-data signature. */
  signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>,
  ): Promise<string>;
}

/**
 * `MonolythiumSigner` — ethers v6 `Signer` for the Monolythium chain.
 *
 * Construct one of three ways:
 *
 * 1. `MonolythiumSigner.fromEthersWallet(wallet, provider)` — the
 *    fastest path; wraps a normal `ethers.Wallet`.
 * 2. `new MonolythiumSigner(backend, provider)` — supply any object
 *    implementing `MonolythiumSignerBackend`.
 *
 * The signer is fully spec-compatible with ethers v6 — it can be
 * passed anywhere a `Signer` is accepted (e.g.
 * `new ethers.Contract(address, abi, signer)`), and works with
 * `Contract.deploy`, `Contract.call`, all ContractFactory paths,
 * and `provider.broadcastTransaction(signed)`.
 */
export class MonolythiumSigner extends AbstractSigner<Provider | null> {
  readonly #backend: MonolythiumSignerBackend;

  constructor(backend: MonolythiumSignerBackend, provider?: Provider | null) {
    super(provider ?? null);
    this.#backend = backend;
  }

  /**
   * Wrap any ethers v6 `BaseWallet` (the parent class of `Wallet`,
   * `HDNodeWallet`, and friends) so callers don't have to write a
   * `MonolythiumSignerBackend` for the common test / dev path.
   *
   * Both `new Wallet(privateKey)` and `Wallet.createRandom()` /
   * `HDNodeWallet.fromMnemonic(...)` are accepted.
   */
  static fromEthersWallet(
    wallet: BaseWallet,
    provider?: Provider | null,
  ): MonolythiumSigner {
    const backend: MonolythiumSignerBackend = {
      getAddress: async () => wallet.address,
      signTransaction: (tx) => wallet.signTransaction(tx),
      signMessage: (message) => wallet.signMessage(message),
      signTypedData: (domain, types, value) =>
        wallet.signTypedData(domain, types, value),
    };
    return new MonolythiumSigner(backend, provider);
  }

  override async getAddress(): Promise<string> {
    return this.#backend.getAddress();
  }

  override connect(provider: Provider | null): EthersSigner {
    return new MonolythiumSigner(this.#backend, provider);
  }

  override async signTransaction(tx: TransactionRequest): Promise<string> {
    return this.#backend.signTransaction(tx);
  }

  override async signMessage(message: string | Uint8Array): Promise<string> {
    return this.#backend.signMessage(message);
  }

  override async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return this.#backend.signTypedData(domain, types, value);
  }
}
