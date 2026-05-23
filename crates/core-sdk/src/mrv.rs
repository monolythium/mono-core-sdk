//! Additive v4.1 MRV/RISC-V SDK surface.
//!
//! This module mirrors the accepted MRV artifact, typed-address, native
//! deploy/call, and receipt terms without depending on `mono-core` internals.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use thiserror::Error;

use crate::address::{
    address_to_hex, address_to_typed_bech32, hex_to_address, typed_bech32_to_address,
    typed_bech32_to_address_kind, AddressKind,
};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// Current MRV artifact format version.
pub const MRV_FORMAT_VERSION: u16 = 1;
/// Approved RISC-V profile name.
pub const MRV_PROFILE_MONO_RV32IM_V1: &str = "mono_rv32im_v1";
/// RISC-V memory page size.
pub const MRV_MEMORY_PAGE_BYTES: u32 = 65_536;
/// Maximum code section size.
pub const MRV_MAX_CODE_BYTES: usize = 16 * 1024 * 1024;
/// Maximum optional debug section size.
pub const MRV_MAX_DEBUG_BYTES: usize = 16 * 1024 * 1024;
/// Maximum declared memory pages.
pub const MRV_MAX_MEMORY_PAGES: u32 = 1024;
/// Maximum ABI symbol count.
pub const MRV_MAX_ABI_SYMBOLS: usize = 1024;
/// Maximum storage namespace byte length.
pub const MRV_MAX_STORAGE_NAMESPACE_BYTES: usize = 64;
/// Native LYTH decimal precision.
pub const LYTH_DECIMALS: u32 = 8;
/// Native LYTH decimal precision, named for app-facing amount surfaces.
pub const NATIVE_LYTH_DECIMALS: u32 = LYTH_DECIMALS;
/// Lythoshi in one LYTH.
pub const LYTHOSHI_PER_LYTH: u128 = 100_000_000;
/// Signed transaction extension kind for MRV execution.
pub const MRV_TX_EXTENSION_KIND: u8 = 0x30;
/// Body byte for the first MRV extension version.
pub const MRV_TX_EXTENSION_V1: u8 = 0x01;
/// ML-DSA-65 public key byte length for native transaction envelopes.
pub const ML_DSA_65_PUBLIC_KEY_LEN: usize = 1_952;
/// ML-DSA-65 signature byte length for native transaction envelopes.
pub const ML_DSA_65_SIGNATURE_LEN: usize = 3_309;
const STANDARD_ALGO_NUMBER_ML_DSA_65: u16 = 1_001;
const ENUM_VARIANT_INDEX_ML_DSA_65: u32 = 5;
const TX_HASH_TAG_SIGNING: u8 = 0x01;
const TX_HASH_TAG_IDENTITY: u8 = 0x02;

const MRV_CODE_HASH_DOMAIN: &[u8] = b"MONO_MRV_CODE_V1";
const MRV_CONTRACT_ADDRESS_DOMAIN: &[u8] = b"mono:riscv:contract-address:v1";
const MONO_SYSCALL_MODULE: &str = "mono";

/// Formatting options for app-facing LYTH display.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LythFormatOptions {
    /// Include the trailing ` LYTH` unit label.
    pub include_unit: bool,
}

impl LythFormatOptions {
    /// Default wallet/app display: numeric value plus ` LYTH`.
    pub const DEFAULT: Self = Self { include_unit: true };

    /// Numeric-only display for callers composing their own unit label.
    pub const NUMERIC_ONLY: Self = Self {
        include_unit: false,
    };
}

impl Default for LythFormatOptions {
    fn default() -> Self {
        Self::DEFAULT
    }
}

/// Format a lythoshi-denominated amount as canonical LYTH display text.
#[must_use]
pub fn format_lyth(lythoshi: u128, options: LythFormatOptions) -> String {
    let whole = lythoshi / LYTHOSHI_PER_LYTH;
    let fraction = lythoshi % LYTHOSHI_PER_LYTH;
    let mut formatted = format_whole_with_commas(whole);
    if fraction != 0 {
        formatted.push('.');
        formatted.push_str(&visible_fraction(fraction));
    }
    if options.include_unit {
        formatted.push_str(" LYTH");
    }
    formatted
}

/// Alias named after the atomic unit used by public SDK callers.
#[must_use]
pub fn format_lythoshi(lythoshi: u128, options: LythFormatOptions) -> String {
    format_lyth(lythoshi, options)
}

/// Parse a canonical LYTH string into lythoshi.
///
/// Accepts raw numeric strings (`"5000.5"`) and formatted strings from
/// [`format_lyth`] (`"5,000.5 LYTH"`). Rejects non-canonical comma
/// grouping and more than eight fractional digits.
pub fn parse_lyth_to_lythoshi(input: &str) -> Result<u128, MrvValidationError> {
    let numeric = strip_lyth_unit(input)?;
    let mut parts = numeric.split('.');
    let whole_raw = parts.next().unwrap_or_default();
    let fraction_raw = parts.next().unwrap_or_default();
    if parts.next().is_some()
        || !is_canonical_whole_lyth(whole_raw)
        || (numeric.contains('.') && fraction_raw.is_empty())
        || fraction_raw.len() > NATIVE_LYTH_DECIMALS as usize
        || !fraction_raw.bytes().all(|b| b.is_ascii_digit())
    {
        return Err(MrvValidationError::InvalidDecimal { field: "lyth" });
    }
    let whole = whole_raw
        .replace(',', "")
        .parse::<u128>()
        .map_err(|_| MrvValidationError::InvalidDecimal { field: "lyth" })?;
    let fraction = if fraction_raw.is_empty() {
        0
    } else {
        let mut padded = fraction_raw.to_owned();
        while padded.len() < NATIVE_LYTH_DECIMALS as usize {
            padded.push('0');
        }
        padded
            .parse::<u128>()
            .map_err(|_| MrvValidationError::InvalidDecimal { field: "lyth" })?
    };
    whole
        .checked_mul(LYTHOSHI_PER_LYTH)
        .and_then(|scaled| scaled.checked_add(fraction))
        .ok_or(MrvValidationError::InvalidDecimal { field: "lyth" })
}

/// Approved MRV RISC-V profile.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvRiscvProfile.ts"))]
#[serde(rename_all = "snake_case")]
pub enum MrvRiscvProfile {
    /// Mono RV32IM profile, integer-only and deterministic.
    #[serde(rename = "mono_rv32im_v1")]
    MonoRv32ImV1,
}

impl MrvRiscvProfile {
    /// Stable profile name.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::MonoRv32ImV1 => MRV_PROFILE_MONO_RV32IM_V1,
        }
    }
}

/// Typed address discriminator from ADR-0038.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvAddressKind.ts"))]
pub enum MrvAddressKind {
    /// User externally-owned account.
    #[serde(rename = "user")]
    User,
    /// Smart account.
    #[serde(rename = "smartAccount")]
    SmartAccount,
    /// RISC-V contract account.
    #[serde(rename = "contract")]
    Contract,
    /// Operator cluster identity.
    #[serde(rename = "cluster")]
    Cluster,
    /// Multisig identity.
    #[serde(rename = "multisig")]
    Multisig,
    /// System native module identity.
    #[serde(rename = "systemModule")]
    SystemModule,
}

impl MrvAddressKind {
    /// Stable HRP for this address kind.
    #[must_use]
    pub const fn hrp(self) -> &'static str {
        match self {
            Self::User => "mono",
            Self::SmartAccount => "monos",
            Self::Contract => "monoc",
            Self::Cluster => "monok",
            Self::Multisig => "monom",
            Self::SystemModule => "monox",
        }
    }

    fn address_kind(self) -> AddressKind {
        match self {
            Self::User => AddressKind::User,
            Self::SmartAccount => AddressKind::SmartAccount,
            Self::Contract => AddressKind::Contract,
            Self::Cluster => AddressKind::Cluster,
            Self::Multisig => AddressKind::Multisig,
            Self::SystemModule => AddressKind::SystemModule,
        }
    }

    fn from_address_kind(kind: AddressKind) -> Self {
        match kind {
            AddressKind::User => Self::User,
            AddressKind::SmartAccount => Self::SmartAccount,
            AddressKind::Contract => Self::Contract,
            AddressKind::Cluster => Self::Cluster,
            AddressKind::Multisig => Self::Multisig,
            AddressKind::SystemModule => Self::SystemModule,
        }
    }
}

/// Decoded typed bech32m address.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvTypedAddress.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvTypedAddress {
    /// ADR-0038 address kind.
    pub kind: MrvAddressKind,
    /// Typed bech32m address string.
    pub address: String,
}

/// Bounded memory declaration for an MRV artifact.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvMemoryLimits.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvMemoryLimits {
    /// Initial memory pages available at contract start.
    #[serde(rename = "initialPages")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "initialPages"))]
    pub initial_pages: u32,
    /// Maximum memory pages the contract may grow to.
    #[serde(rename = "maxPages")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "maxPages"))]
    pub max_pages: u32,
    /// Stack reservation in bytes.
    #[serde(rename = "stackBytes")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "stackBytes"))]
    pub stack_bytes: u32,
}

/// Stable storage namespace declaration.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvStorageNamespace.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvStorageNamespace {
    /// Lowercase namespace name.
    pub name: String,
    /// Namespace schema version.
    pub version: u16,
}

/// Contract ABI manifest.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvAbiManifest.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvAbiManifest {
    /// ABI symbols exposed by this artifact.
    pub symbols: Vec<MrvAbiSymbol>,
}

/// ABI symbol exposed by a contract.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvAbiSymbol.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvAbiSymbol {
    /// Stable symbol name.
    pub name: String,
    /// Symbol kind.
    pub kind: MrvAbiSymbolKind,
    /// Typed input parameters.
    pub inputs: Vec<MrvAbiParam>,
    /// Typed output parameters.
    pub outputs: Vec<MrvAbiParam>,
}

/// ABI symbol kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvAbiSymbolKind.ts"))]
#[serde(rename_all = "camelCase")]
pub enum MrvAbiSymbolKind {
    /// Contract constructor.
    Constructor,
    /// Callable function.
    Function,
    /// Emitted event.
    Event,
}

/// ABI parameter.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvAbiParam.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvAbiParam {
    /// Stable parameter name.
    pub name: String,
    /// Parameter type.
    pub ty: MrvAbiType,
}

/// ABI value type.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvAbiType.ts"))]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum MrvAbiType {
    /// No value.
    Unit,
    /// Boolean.
    Bool,
    /// Unsigned 8-bit integer.
    U8,
    /// Unsigned 32-bit integer.
    U32,
    /// Unsigned 64-bit integer.
    U64,
    /// Unsigned 128-bit integer.
    U128,
    /// Variable-length bytes.
    Bytes,
    /// Fixed-length bytes.
    FixedBytes {
        /// Fixed byte length.
        len: u16,
    },
    /// UTF-8 string.
    String,
    /// Typed Mono address.
    Address,
    /// BLAKE3 digest.
    Hash,
}

/// Host syscall import declared by an artifact.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvSyscallImport.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvSyscallImport {
    /// Host module name. Must be `mono`.
    pub module: String,
    /// Stable syscall import name.
    pub name: String,
    /// Stable numeric syscall identifier.
    pub id: u16,
}

/// Resolved syscall import.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvResolvedSyscall.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvResolvedSyscall {
    /// Stable numeric syscall identifier.
    pub id: u16,
    /// Stable syscall import name.
    pub name: String,
}

/// Build metadata recorded in an MRV artifact.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvBuildMetadata.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvBuildMetadata {
    /// Toolchain identifier.
    pub toolchain: String,
    /// `0x`-prefixed source or build-input digest.
    #[serde(rename = "sourceDigest")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "sourceDigest"))]
    pub source_digest: String,
    /// Reproducible build profile label.
    pub profile: String,
}

/// SDK JSON metadata for an MRV artifact.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvArtifactMetadata.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvArtifactMetadata {
    /// MRV format version.
    #[serde(rename = "formatVersion")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "formatVersion"))]
    pub format_version: u16,
    /// Approved RISC-V profile.
    pub profile: MrvRiscvProfile,
    /// BLAKE3 hash of the code section.
    #[serde(rename = "codeHash")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "codeHash"))]
    pub code_hash: String,
    /// Code byte count expected by this metadata.
    #[serde(rename = "codeBytes")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "codeBytes"))]
    pub code_bytes: u64,
    /// Optional debug byte count. Debug bytes are excluded from consensus hash.
    #[serde(rename = "debugBytes")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "debugBytes"))]
    pub debug_bytes: u64,
    /// Contract ABI manifest.
    pub abi: MrvAbiManifest,
    /// Host syscall imports declared by the artifact.
    pub imports: Vec<MrvSyscallImport>,
    /// Bounded memory declaration.
    pub memory: MrvMemoryLimits,
    /// Contract storage namespace.
    #[serde(rename = "storageNamespace")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "storageNamespace"))]
    pub storage_namespace: MrvStorageNamespace,
    /// Build metadata.
    pub build: MrvBuildMetadata,
}

/// Validated artifact metadata summary.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvValidatedArtifactMetadata.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvValidatedArtifactMetadata {
    /// Verified code hash.
    #[serde(rename = "codeHash")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "codeHash"))]
    pub code_hash: String,
    /// Approved profile.
    pub profile: MrvRiscvProfile,
    /// Bounded memory declaration.
    pub memory: MrvMemoryLimits,
    /// Contract storage namespace.
    #[serde(rename = "storageNamespace")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "storageNamespace"))]
    pub storage_namespace: MrvStorageNamespace,
    /// Resolved syscall imports in declared order.
    pub syscalls: Vec<MrvResolvedSyscall>,
    /// Number of ABI symbols.
    #[serde(rename = "abiSymbolCount")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "abiSymbolCount"))]
    pub abi_symbol_count: u64,
    /// Verified code byte count.
    #[serde(rename = "codeBytes")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "codeBytes"))]
    pub code_bytes: u64,
}

/// Typed MRV transaction extension descriptor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvTransactionExtension.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvTransactionExtension {
    /// Extension kind byte.
    pub kind: u8,
    /// Extension body bytes as `0x`-hex.
    #[serde(rename = "bodyHex")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "bodyHex"))]
    pub body_hex: String,
}

/// Native MRV deploy request model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvDeployRequest.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvDeployRequest {
    /// Optional typed user address that signs the deploy.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub from: Option<String>,
    /// Raw bincode MRV artifact bytes as `0x`-hex.
    #[serde(rename = "artifactBytes")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "artifactBytes"))]
    pub artifact_bytes: String,
    /// Native value to endow the contract with, in lythoshi.
    #[serde(rename = "valueLythoshi")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "valueLythoshi"))]
    pub value_lythoshi: String,
    /// Optional execution-unit ceiling for transaction admission.
    #[serde(rename = "executionUnitLimit", skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "executionUnitLimit", optional))]
    pub execution_unit_limit: Option<u64>,
    /// Optional max execution fee in lythoshi.
    #[serde(
        rename = "maxExecutionFeeLythoshi",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(
        feature = "ts-bindings",
        ts(rename = "maxExecutionFeeLythoshi", optional)
    )]
    pub max_execution_fee_lythoshi: Option<String>,
    /// Optional priority tip in lythoshi.
    #[serde(
        rename = "priorityTipLythoshi",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "priorityTipLythoshi", optional))]
    pub priority_tip_lythoshi: Option<String>,
    /// Optional signer nonce.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub nonce: Option<u64>,
}

/// Native MRV deploy response model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvDeployResponse.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvDeployResponse {
    /// Transaction hash.
    #[serde(rename = "txHash")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "txHash"))]
    pub tx_hash: String,
    /// Deployed typed contract address (`monoc1...`).
    #[serde(rename = "contractAddress")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "contractAddress"))]
    pub contract_address: String,
    /// Artifact hash when supplied by the node/indexer.
    #[serde(rename = "artifactHash", skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "artifactHash", optional))]
    pub artifact_hash: Option<String>,
    /// Receipt when the caller requested a confirmed response.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub receipt: Option<MrvExecutionReceipt>,
}

/// Native MRV contract call request model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvCallRequest.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvCallRequest {
    /// Optional typed user address that signs the call.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub from: Option<String>,
    /// Destination typed contract address (`monoc1...`).
    #[serde(rename = "contractAddress")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "contractAddress"))]
    pub contract_address: String,
    /// Call input bytes as `0x`-hex.
    pub input: String,
    /// Native value sent with the call, in lythoshi.
    #[serde(rename = "valueLythoshi")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "valueLythoshi"))]
    pub value_lythoshi: String,
    /// Optional execution-unit ceiling for transaction admission.
    #[serde(rename = "executionUnitLimit", skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "executionUnitLimit", optional))]
    pub execution_unit_limit: Option<u64>,
    /// Optional max execution fee in lythoshi.
    #[serde(
        rename = "maxExecutionFeeLythoshi",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(
        feature = "ts-bindings",
        ts(rename = "maxExecutionFeeLythoshi", optional)
    )]
    pub max_execution_fee_lythoshi: Option<String>,
    /// Optional priority tip in lythoshi.
    #[serde(
        rename = "priorityTipLythoshi",
        skip_serializing_if = "Option::is_none"
    )]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "priorityTipLythoshi", optional))]
    pub priority_tip_lythoshi: Option<String>,
    /// Optional signer nonce.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub nonce: Option<u64>,
}

/// Native MRV call status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvCallStatus.ts"))]
#[serde(rename_all = "camelCase")]
pub enum MrvCallStatus {
    /// Execution succeeded.
    Success,
    /// Execution used typed revert.
    Reverted,
    /// Execution halted without typed revert.
    Halted,
}

/// Native MRV call response model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvCallResponse.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvCallResponse {
    /// Transaction hash.
    #[serde(rename = "txHash")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "txHash"))]
    pub tx_hash: String,
    /// Execution status.
    pub status: MrvCallStatus,
    /// Returned bytes as `0x`-hex when available.
    #[serde(rename = "returnData")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "returnData"))]
    pub return_data: String,
    /// Typed RISC-V receipt when available.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub receipt: Option<MrvExecutionReceipt>,
}

/// Independent counters reported by MRV execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvMeterCounters.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvMeterCounters {
    /// Deterministic instruction-cycle count.
    pub cycles: u64,
    /// Units consumed by host syscalls.
    #[serde(rename = "syscallUnits")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "syscallUnits"))]
    pub syscall_units: u64,
    /// Units consumed by authenticated state reads and writes.
    #[serde(rename = "stateIoUnits")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "stateIoUnits"))]
    pub state_io_units: u64,
}

/// Typed event payload emitted by a contract or native module.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvEventRecord.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvEventRecord {
    /// Domain-separated event topic as `0x`-hex.
    pub topic: String,
    /// Event payload bytes as `0x`-hex.
    pub data: String,
}

/// Typed native-module state delta for receipts and indexers.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvNativeStateDelta.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvNativeStateDelta {
    /// Native module namespace that changed.
    pub namespace: MrvStorageNamespace,
    /// State key inside the namespace as `0x`-hex.
    pub key: String,
    /// Hash of the new value, or absent when the key was deleted.
    #[serde(rename = "valueHash", skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "valueHash", optional))]
    pub value_hash: Option<String>,
}

/// Typed revert payload.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "MrvRevertPayload.ts"))]
#[serde(deny_unknown_fields)]
pub struct MrvRevertPayload {
    /// Stable contract-defined revert code.
    pub code: u32,
    /// Opaque revert data as `0x`-hex.
    pub data: String,
}

/// Typed RISC-V execution receipt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "MrvExecutionReceipt.ts")
)]
#[serde(deny_unknown_fields)]
pub struct MrvExecutionReceipt {
    /// Consensus hash of the validated MRV artifact as `0x`-hex.
    #[serde(rename = "artifactHash")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "artifactHash"))]
    pub artifact_hash: String,
    /// Execution counters.
    pub counters: MrvMeterCounters,
    /// Typed events emitted by the call.
    pub events: Vec<MrvEventRecord>,
    /// Native module deltas produced by the call.
    #[serde(rename = "nativeDeltas")]
    #[cfg_attr(feature = "ts-bindings", ts(rename = "nativeDeltas"))]
    pub native_deltas: Vec<MrvNativeStateDelta>,
    /// Revert payload when execution failed through the typed revert path.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-bindings", ts(optional))]
    pub reverted: Option<MrvRevertPayload>,
}

/// Input options shared by MRV deploy and call request builders.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct MrvRequestBuildOptions {
    /// Optional typed user address that signs the request.
    pub from: Option<String>,
    /// Native value in lythoshi. Defaults to zero when omitted.
    pub value_lythoshi: Option<u128>,
    /// Optional execution-unit ceiling for transaction admission.
    pub execution_unit_limit: Option<u64>,
    /// Optional max execution fee in lythoshi.
    pub max_execution_fee_lythoshi: Option<u128>,
    /// Optional priority tip in lythoshi.
    pub priority_tip_lythoshi: Option<u128>,
    /// Optional signer nonce.
    pub nonce: Option<u64>,
}

impl MrvRequestBuildOptions {
    /// Empty options; builders default native value to zero lythoshi.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the typed user address that signs the request.
    #[must_use]
    pub fn from(mut self, from: impl Into<String>) -> Self {
        self.from = Some(from.into());
        self
    }

    /// Set native value in lythoshi.
    #[must_use]
    pub fn value_lythoshi(mut self, value: u128) -> Self {
        self.value_lythoshi = Some(value);
        self
    }

    /// Set the execution-unit ceiling.
    #[must_use]
    pub fn execution_unit_limit(mut self, limit: u64) -> Self {
        self.execution_unit_limit = Some(limit);
        self
    }

    /// Set max execution fee in lythoshi.
    #[must_use]
    pub fn max_execution_fee_lythoshi(mut self, value: u128) -> Self {
        self.max_execution_fee_lythoshi = Some(value);
        self
    }

    /// Set priority tip in lythoshi.
    #[must_use]
    pub fn priority_tip_lythoshi(mut self, value: u128) -> Self {
        self.priority_tip_lythoshi = Some(value);
        self
    }

    /// Set signer nonce.
    #[must_use]
    pub fn nonce(mut self, nonce: u64) -> Self {
        self.nonce = Some(nonce);
        self
    }
}

/// Required inputs for building the current signed native transaction
/// envelope around an MRV deploy or call.
///
/// Field names on [`MrvNativeTxFields`] intentionally mirror the current
/// compatibility signing adapter (`maxFeePerGas`, `gasLimit`), but values are
/// ADR-0037 lythoshi and execution-unit counts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MrvNativeTxBuildOptions {
    /// Optional typed user address that signs the request.
    pub from: Option<String>,
    /// Chain id for the signed transaction envelope.
    pub chain_id: u64,
    /// Sender nonce for the signed transaction envelope.
    pub nonce: u64,
    /// Native value in lythoshi. Defaults to zero when omitted.
    pub value_lythoshi: u128,
    /// Execution-unit ceiling for transaction admission.
    pub execution_unit_limit: u64,
    /// Max execution fee in lythoshi.
    pub max_execution_fee_lythoshi: u128,
    /// Priority tip in lythoshi. Defaults to zero when omitted.
    pub priority_tip_lythoshi: u128,
}

impl MrvNativeTxBuildOptions {
    /// Build the required native transaction options.
    #[must_use]
    pub const fn new(
        chain_id: u64,
        nonce: u64,
        execution_unit_limit: u64,
        max_execution_fee_lythoshi: u128,
    ) -> Self {
        Self {
            from: None,
            chain_id,
            nonce,
            value_lythoshi: 0,
            execution_unit_limit,
            max_execution_fee_lythoshi,
            priority_tip_lythoshi: 0,
        }
    }

    /// Set the typed user address that signs the request.
    #[must_use]
    pub fn from(mut self, from: impl Into<String>) -> Self {
        self.from = Some(from.into());
        self
    }

    /// Set native value in lythoshi.
    #[must_use]
    pub const fn value_lythoshi(mut self, value: u128) -> Self {
        self.value_lythoshi = value;
        self
    }

    /// Set priority tip in lythoshi.
    #[must_use]
    pub const fn priority_tip_lythoshi(mut self, value: u128) -> Self {
        self.priority_tip_lythoshi = value;
        self
    }

    fn request_options(&self) -> MrvRequestBuildOptions {
        let mut options = MrvRequestBuildOptions::new()
            .value_lythoshi(self.value_lythoshi)
            .execution_unit_limit(self.execution_unit_limit)
            .max_execution_fee_lythoshi(self.max_execution_fee_lythoshi)
            .priority_tip_lythoshi(self.priority_tip_lythoshi)
            .nonce(self.nonce);
        if let Some(from) = &self.from {
            options = options.from(from.clone());
        }
        options
    }
}

/// Current native transaction signing shape for MRV deploy/call envelopes.
///
/// `maxFeePerGas` and `gasLimit` are compatibility field names inherited by
/// the signer adapter. MRV callers should treat them as max execution fee in
/// lythoshi and execution-unit limit respectively.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvNativeTxFields {
    /// Chain id.
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    /// Sender nonce.
    pub nonce: u64,
    /// Priority tip in lythoshi, rendered as a decimal string.
    #[serde(rename = "maxPriorityFeePerGas")]
    pub max_priority_fee_per_gas: String,
    /// Max execution fee in lythoshi, rendered as a decimal string.
    #[serde(rename = "maxFeePerGas")]
    pub max_fee_per_gas: String,
    /// Execution-unit ceiling.
    #[serde(rename = "gasLimit")]
    pub gas_limit: u64,
    /// Destination 20-byte hex address, or `null` for deploy.
    pub to: Option<String>,
    /// Native value in lythoshi, rendered as a decimal string.
    pub value: String,
    /// Transaction input bytes as `0x`-hex.
    pub input: String,
    /// Signed transaction extensions, including the MRV v1 descriptor.
    pub extensions: Vec<MrvTransactionExtension>,
}

impl MrvNativeTxFields {
    fn from_parts(
        options: &MrvNativeTxBuildOptions,
        to: Option<String>,
        input: String,
        value_lythoshi: &str,
        extension: MrvTransactionExtension,
    ) -> Self {
        Self {
            chain_id: options.chain_id,
            nonce: options.nonce,
            max_priority_fee_per_gas: options.priority_tip_lythoshi.to_string(),
            max_fee_per_gas: options.max_execution_fee_lythoshi.to_string(),
            gas_limit: options.execution_unit_limit,
            to,
            value: value_lythoshi.to_owned(),
            input,
            extensions: vec![extension],
        }
    }
}

/// Application-facing MRV native transaction fields.
///
/// The separate [`MrvNativeTxFields`] value is the compatibility signing
/// adapter shape. This facade keeps SDK plan consumers on v4.1 lythoshi and
/// execution-unit names without asking them to inspect `maxFeePerGas` or
/// `gasLimit`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvNativeTxFacade {
    /// Chain id.
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    /// Sender nonce.
    pub nonce: u64,
    /// Native value in lythoshi, rendered as a decimal string.
    #[serde(rename = "valueLythoshi")]
    pub value_lythoshi: String,
    /// Execution-unit ceiling.
    #[serde(rename = "executionUnitLimit")]
    pub execution_unit_limit: u64,
    /// Max execution fee in lythoshi, rendered as a decimal string.
    #[serde(rename = "maxExecutionFeeLythoshi")]
    pub max_execution_fee_lythoshi: String,
    /// Priority tip in lythoshi, rendered as a decimal string.
    #[serde(rename = "priorityTipLythoshi")]
    pub priority_tip_lythoshi: String,
}

impl MrvNativeTxFacade {
    fn from_options(options: &MrvNativeTxBuildOptions, value_lythoshi: &str) -> Self {
        Self {
            chain_id: options.chain_id,
            nonce: options.nonce,
            value_lythoshi: value_lythoshi.to_owned(),
            execution_unit_limit: options.execution_unit_limit,
            max_execution_fee_lythoshi: options.max_execution_fee_lythoshi.to_string(),
            priority_tip_lythoshi: options.priority_tip_lythoshi.to_string(),
        }
    }
}

/// Application-facing native fee preview for MRV deploy/call plans.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvNativeFeePreview {
    /// Total native fee cap in lythoshi.
    #[serde(rename = "totalLythoshi")]
    pub total_lythoshi: String,
    /// Total native fee cap formatted as numeric LYTH without a unit suffix.
    #[serde(rename = "totalLyth")]
    pub total_lyth: String,
    /// Estimated execution units used by the plan.
    #[serde(rename = "cyclesUsed")]
    pub cycles_used: u64,
    /// Execution-unit ceiling carried by the signed transaction.
    #[serde(rename = "executionUnitLimit")]
    pub execution_unit_limit: u64,
    /// Max execution fee in lythoshi.
    #[serde(rename = "maxExecutionFeeLythoshi")]
    pub max_execution_fee_lythoshi: String,
    /// Priority tip in lythoshi.
    #[serde(rename = "priorityTipLythoshi")]
    pub priority_tip_lythoshi: String,
}

impl MrvNativeFeePreview {
    fn from_options(options: &MrvNativeTxBuildOptions) -> Self {
        let total_lythoshi = options.max_execution_fee_lythoshi.to_string();
        Self {
            total_lyth: format_lyth(
                options.max_execution_fee_lythoshi,
                LythFormatOptions::NUMERIC_ONLY,
            ),
            total_lythoshi: total_lythoshi.clone(),
            cycles_used: options.execution_unit_limit,
            execution_unit_limit: options.execution_unit_limit,
            max_execution_fee_lythoshi: total_lythoshi,
            priority_tip_lythoshi: options.priority_tip_lythoshi.to_string(),
        }
    }
}

/// Fully-built MRV deploy request plus SDK-local execution metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvDeployPlan {
    /// Validated native deploy request.
    pub request: MrvDeployRequest,
    /// MRV v1 transaction extension descriptor.
    pub extension: MrvTransactionExtension,
    /// Deterministic contract address when artifact hash, signer, and nonce are known.
    #[serde(
        rename = "expectedContractAddress",
        skip_serializing_if = "Option::is_none"
    )]
    pub expected_contract_address: Option<String>,
}

/// Fully-built MRV call request plus SDK-local execution metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvCallPlan {
    /// Validated native call request.
    pub request: MrvCallRequest,
    /// MRV v1 transaction extension descriptor.
    pub extension: MrvTransactionExtension,
}

/// Fully-built MRV deploy plan plus the current sign-ready native transaction
/// fields.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvDeployNativeTxPlan {
    /// Validated native deploy request.
    pub request: MrvDeployRequest,
    /// MRV v1 transaction extension descriptor.
    pub extension: MrvTransactionExtension,
    /// Deterministic contract address when artifact hash, signer, and nonce are known.
    #[serde(
        rename = "expectedContractAddress",
        skip_serializing_if = "Option::is_none"
    )]
    pub expected_contract_address: Option<String>,
    /// Application-facing native transaction summary with v4.1 names.
    #[serde(rename = "nativeTx")]
    pub native_tx: MrvNativeTxFacade,
    /// Application-facing native fee preview with v4.1 names.
    #[serde(rename = "feePreview")]
    pub fee_preview: MrvNativeFeePreview,
    /// Sign-ready transaction fields for the current native transaction adapter.
    pub tx: MrvNativeTxFields,
}

/// Fully-built MRV call plan plus the current sign-ready native transaction
/// fields.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MrvCallNativeTxPlan {
    /// Validated native call request.
    pub request: MrvCallRequest,
    /// MRV v1 transaction extension descriptor.
    pub extension: MrvTransactionExtension,
    /// Application-facing native transaction summary with v4.1 names.
    #[serde(rename = "nativeTx")]
    pub native_tx: MrvNativeTxFacade,
    /// Application-facing native fee preview with v4.1 names.
    #[serde(rename = "feePreview")]
    pub fee_preview: MrvNativeFeePreview,
    /// Sign-ready transaction fields for the current native transaction adapter.
    pub tx: MrvNativeTxFields,
}

/// Errors returned by MRV SDK validation helpers.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum MrvValidationError {
    /// Hex field was malformed.
    #[error("{field} must be 0x-prefixed even-length hex")]
    InvalidHex {
        /// Field name.
        field: &'static str,
    },

    /// Hex field length was wrong.
    #[error("{field} must be {expected} bytes")]
    InvalidHexLength {
        /// Field name.
        field: &'static str,
        /// Expected byte length.
        expected: usize,
    },

    /// Decimal field was malformed.
    #[error("{field} must be a canonical unsigned decimal string")]
    InvalidDecimal {
        /// Field name.
        field: &'static str,
    },

    /// MRV format version was unsupported.
    #[error("unsupported MRV format version {found}, expected {expected}")]
    UnsupportedFormatVersion {
        /// Declared version.
        found: u16,
        /// Expected version.
        expected: u16,
    },

    /// Code bytes were empty.
    #[error("MRV code is empty")]
    CodeEmpty,

    /// Code bytes exceeded the consensus maximum.
    #[error("MRV code has {len} bytes, max {max}")]
    CodeTooLarge {
        /// Actual length.
        len: usize,
        /// Maximum length.
        max: usize,
    },

    /// Metadata code length did not match supplied bytes.
    #[error("metadata codeBytes {declared} does not match supplied code length {actual}")]
    CodeLengthMismatch {
        /// Declared length.
        declared: u64,
        /// Actual length.
        actual: u64,
    },

    /// Debug bytes exceeded the consensus maximum.
    #[error("MRV debug section has {len} bytes, max {max}")]
    DebugTooLarge {
        /// Actual length.
        len: u64,
        /// Maximum length.
        max: usize,
    },

    /// Code hash did not match supplied bytes.
    #[error("MRV code hash mismatch: declared {declared}, computed {computed}")]
    CodeHashMismatch {
        /// Declared hash.
        declared: String,
        /// Computed hash.
        computed: String,
    },

    /// Memory declaration failed validation.
    #[error("invalid MRV memory declaration: {0}")]
    InvalidMemory(&'static str),

    /// Storage namespace failed validation.
    #[error("invalid MRV storage namespace: {0}")]
    InvalidStorageNamespace(&'static str),

    /// ABI manifest had no symbols.
    #[error("MRV ABI must declare at least one symbol")]
    AbiEmpty,

    /// ABI manifest had too many symbols.
    #[error("MRV ABI has {len} symbols, max {max}")]
    AbiTooLarge {
        /// Actual count.
        len: usize,
        /// Maximum count.
        max: usize,
    },

    /// ABI symbol name was invalid.
    #[error("invalid MRV ABI symbol '{0}'")]
    InvalidAbiSymbol(String),

    /// ABI symbol name was duplicated.
    #[error("duplicate MRV ABI symbol '{0}'")]
    DuplicateAbiSymbol(String),

    /// ABI parameter was invalid.
    #[error("invalid MRV ABI parameter '{0}'")]
    InvalidAbiParam(String),

    /// Import used a forbidden host module.
    #[error("forbidden host import {module}.{name}")]
    ForbiddenHostImport {
        /// Host module.
        module: String,
        /// Import name.
        name: String,
    },

    /// Import used an unknown syscall id.
    #[error("unknown MRV syscall id {0}")]
    UnknownSyscallId(u16),

    /// Import used an unknown syscall name.
    #[error("unknown MRV syscall name '{0}'")]
    UnknownSyscallName(String),

    /// Import name and id did not identify the same syscall.
    #[error("MRV syscall name/id mismatch for {name}: declared {declared}, expected {expected}")]
    SyscallNameMismatch {
        /// Declared name.
        name: String,
        /// Declared id.
        declared: u16,
        /// Expected id for the name.
        expected: u16,
    },

    /// Import duplicated a syscall.
    #[error("duplicate MRV syscall '{0}'")]
    DuplicateSyscall(String),

    /// Address failed parsing or did not match the required kind.
    #[error("invalid typed address in {field}: {reason}")]
    InvalidAddress {
        /// Field name.
        field: &'static str,
        /// Parser reason.
        reason: String,
    },

    /// Execution-unit limit must be non-zero when present.
    #[error("{field} must be greater than zero")]
    InvalidExecutionUnitLimit {
        /// Field name.
        field: &'static str,
    },

    /// Raw transaction signing input had an invalid fixed-length byte vector.
    #[error("{field} must be {expected} bytes, got {actual}")]
    InvalidNativeTxBytes {
        /// Field name.
        field: &'static str,
        /// Expected byte length.
        expected: usize,
        /// Actual byte length.
        actual: usize,
    },

    /// Raw transaction signing input exceeded a 32-bit canonical length field.
    #[error("{field} exceeds u32 length")]
    NativeTxLengthOverflow {
        /// Field name.
        field: &'static str,
    },
}

/// Compute the MRV code-section BLAKE3 hash as `0x`-hex.
#[must_use]
pub fn mrv_code_hash_hex(code: &[u8]) -> String {
    hex_encode(&compute_mrv_code_hash(code))
}

/// Return the canonical MRV v1 transaction extension descriptor.
#[must_use]
pub fn mrv_v1_transaction_extension() -> MrvTransactionExtension {
    MrvTransactionExtension {
        kind: MRV_TX_EXTENSION_KIND,
        body_hex: "0x01".to_owned(),
    }
}

/// Encode a typed ADR-0038 address.
#[must_use]
pub fn mrv_address_to_bech32(kind: MrvAddressKind, bytes: [u8; 20]) -> String {
    address_to_typed_bech32(kind.address_kind(), bytes)
}

/// Decode any allocated typed ADR-0038 address.
///
/// # Errors
/// Returns [`MrvValidationError`] when the address is malformed or uses an
/// unallocated/reserved HRP.
pub fn mrv_bech32_to_address(
    address: &str,
) -> Result<(MrvAddressKind, [u8; 20]), MrvValidationError> {
    typed_bech32_to_address(address)
        .map(|(kind, bytes)| (MrvAddressKind::from_address_kind(kind), bytes))
        .map_err(|err| MrvValidationError::InvalidAddress {
            field: "address",
            reason: err.to_string(),
        })
}

/// Decode a typed ADR-0038 address and require `kind`.
///
/// # Errors
/// Returns [`MrvValidationError`] when the address is malformed or the HRP does
/// not match `kind`.
pub fn mrv_bech32_to_address_kind(
    address: &str,
    kind: MrvAddressKind,
) -> Result<[u8; 20], MrvValidationError> {
    typed_bech32_to_address_kind(address, kind.address_kind()).map_err(|err| {
        MrvValidationError::InvalidAddress {
            field: "address",
            reason: err.to_string(),
        }
    })
}

/// Derive the deterministic `monoc` address for an MRV deployment.
///
/// This mirrors mono-core runtime deployment address derivation so SDK
/// callers can precompute the contract address before the deploy transaction
/// is included.
///
/// # Errors
/// Returns [`MrvValidationError`] when `deployer_address` is malformed or
/// `artifact_hash_hex` is not a 32-byte `0x` hash.
pub fn derive_mrv_contract_address(
    deployer_address: &str,
    deployer_nonce: u64,
    artifact_hash_hex: &str,
) -> Result<String, MrvValidationError> {
    let (deployer_kind, deployer_bytes) = mrv_bech32_to_address(deployer_address)?;
    let artifact_hash = decode_hex("artifactHash", artifact_hash_hex)?;
    if artifact_hash.len() != 32 {
        return Err(MrvValidationError::InvalidHexLength {
            field: "artifactHash",
            expected: 32,
        });
    }

    let mut hasher = blake3::Hasher::new();
    hasher.update(MRV_CONTRACT_ADDRESS_DOMAIN);
    hasher.update(deployer_kind.hrp().as_bytes());
    hasher.update(&[0]);
    hasher.update(&deployer_bytes);
    hasher.update(&deployer_nonce.to_be_bytes());
    hasher.update(&artifact_hash);
    let digest = hasher.finalize();
    let mut contract_bytes = [0u8; 20];
    contract_bytes.copy_from_slice(&digest.as_bytes()[..20]);
    Ok(mrv_address_to_bech32(
        MrvAddressKind::Contract,
        contract_bytes,
    ))
}

/// Validate MRV artifact metadata against the supplied code bytes.
///
/// # Errors
/// Returns [`MrvValidationError`] when the metadata violates the accepted MRV
/// bounds or the code hash does not match `code`.
pub fn validate_mrv_artifact_metadata(
    metadata: &MrvArtifactMetadata,
    code: &[u8],
) -> Result<MrvValidatedArtifactMetadata, MrvValidationError> {
    if metadata.format_version != MRV_FORMAT_VERSION {
        return Err(MrvValidationError::UnsupportedFormatVersion {
            found: metadata.format_version,
            expected: MRV_FORMAT_VERSION,
        });
    }
    if code.is_empty() {
        return Err(MrvValidationError::CodeEmpty);
    }
    if code.len() > MRV_MAX_CODE_BYTES {
        return Err(MrvValidationError::CodeTooLarge {
            len: code.len(),
            max: MRV_MAX_CODE_BYTES,
        });
    }
    let actual_code_len = u64::try_from(code.len()).unwrap_or(u64::MAX);
    if metadata.code_bytes != actual_code_len {
        return Err(MrvValidationError::CodeLengthMismatch {
            declared: metadata.code_bytes,
            actual: actual_code_len,
        });
    }
    if metadata.debug_bytes > MRV_MAX_DEBUG_BYTES as u64 {
        return Err(MrvValidationError::DebugTooLarge {
            len: metadata.debug_bytes,
            max: MRV_MAX_DEBUG_BYTES,
        });
    }
    validate_hex_length("codeHash", &metadata.code_hash, 32)?;
    validate_hex_length("sourceDigest", &metadata.build.source_digest, 32)?;
    validate_memory(metadata.memory)?;
    validate_storage_namespace(&metadata.storage_namespace)?;
    validate_abi(&metadata.abi)?;
    let syscalls = validate_imports(&metadata.imports)?;
    let computed = mrv_code_hash_hex(code);
    if metadata.code_hash.to_ascii_lowercase() != computed {
        return Err(MrvValidationError::CodeHashMismatch {
            declared: metadata.code_hash.clone(),
            computed,
        });
    }
    Ok(MrvValidatedArtifactMetadata {
        code_hash: computed,
        profile: metadata.profile,
        memory: metadata.memory,
        storage_namespace: metadata.storage_namespace.clone(),
        syscalls,
        abi_symbol_count: metadata.abi.symbols.len() as u64,
        code_bytes: actual_code_len,
    })
}

/// Validate an MRV deploy request.
///
/// # Errors
/// Returns [`MrvValidationError`] when typed addresses, hex bytes, amount
/// strings, or execution-unit fields are malformed.
pub fn validate_mrv_deploy_request(request: &MrvDeployRequest) -> Result<(), MrvValidationError> {
    if let Some(from) = &request.from {
        validate_typed_address("from", from, MrvAddressKind::User)?;
    }
    decode_hex("artifactBytes", &request.artifact_bytes)?;
    validate_decimal("valueLythoshi", &request.value_lythoshi)?;
    validate_optional_decimal(
        "maxExecutionFeeLythoshi",
        request.max_execution_fee_lythoshi.as_deref(),
    )?;
    validate_optional_decimal(
        "priorityTipLythoshi",
        request.priority_tip_lythoshi.as_deref(),
    )?;
    validate_execution_unit_limit("executionUnitLimit", request.execution_unit_limit)?;
    Ok(())
}

/// Validate an MRV call request.
///
/// # Errors
/// Returns [`MrvValidationError`] when typed addresses, hex bytes, amount
/// strings, or execution-unit fields are malformed.
pub fn validate_mrv_call_request(request: &MrvCallRequest) -> Result<(), MrvValidationError> {
    if let Some(from) = &request.from {
        validate_typed_address("from", from, MrvAddressKind::User)?;
    }
    validate_typed_address(
        "contractAddress",
        &request.contract_address,
        MrvAddressKind::Contract,
    )?;
    decode_hex("input", &request.input)?;
    validate_decimal("valueLythoshi", &request.value_lythoshi)?;
    validate_optional_decimal(
        "maxExecutionFeeLythoshi",
        request.max_execution_fee_lythoshi.as_deref(),
    )?;
    validate_optional_decimal(
        "priorityTipLythoshi",
        request.priority_tip_lythoshi.as_deref(),
    )?;
    validate_execution_unit_limit("executionUnitLimit", request.execution_unit_limit)?;
    Ok(())
}

/// Build and validate an MRV deploy request from raw artifact bytes.
///
/// This helper owns the SDK wire naming (`artifactBytes`, `valueLythoshi`,
/// `executionUnitLimit`) so applications do not have to hand-assemble JSON.
///
/// # Errors
/// Returns [`MrvValidationError`] when options contain malformed typed
/// addresses or invalid execution-unit fields.
pub fn build_mrv_deploy_request(
    artifact_bytes: &[u8],
    options: MrvRequestBuildOptions,
) -> Result<MrvDeployRequest, MrvValidationError> {
    let request = MrvDeployRequest {
        from: options.from,
        artifact_bytes: hex_encode(artifact_bytes),
        value_lythoshi: options.value_lythoshi.unwrap_or_default().to_string(),
        execution_unit_limit: options.execution_unit_limit,
        max_execution_fee_lythoshi: options
            .max_execution_fee_lythoshi
            .map(|value| value.to_string()),
        priority_tip_lythoshi: options.priority_tip_lythoshi.map(|value| value.to_string()),
        nonce: options.nonce,
    };
    validate_mrv_deploy_request(&request)?;
    Ok(request)
}

/// Build and validate an MRV call request from raw input bytes.
///
/// # Errors
/// Returns [`MrvValidationError`] when the contract address or options are
/// malformed.
pub fn build_mrv_call_request(
    contract_address: &str,
    input: &[u8],
    options: MrvRequestBuildOptions,
) -> Result<MrvCallRequest, MrvValidationError> {
    let request = MrvCallRequest {
        from: options.from,
        contract_address: contract_address.to_owned(),
        input: hex_encode(input),
        value_lythoshi: options.value_lythoshi.unwrap_or_default().to_string(),
        execution_unit_limit: options.execution_unit_limit,
        max_execution_fee_lythoshi: options
            .max_execution_fee_lythoshi
            .map(|value| value.to_string()),
        priority_tip_lythoshi: options.priority_tip_lythoshi.map(|value| value.to_string()),
        nonce: options.nonce,
    };
    validate_mrv_call_request(&request)?;
    Ok(request)
}

/// Build an MRV deploy plan with the v1 extension descriptor attached.
///
/// When `artifact_hash_hex`, `from`, and `nonce` are all present, the helper
/// also precomputes the deterministic contract address.
///
/// # Errors
/// Returns [`MrvValidationError`] when request validation fails or when a
/// supplied artifact hash is not a 32-byte `0x` hash.
pub fn build_mrv_deploy_plan(
    artifact_bytes: &[u8],
    artifact_hash_hex: Option<&str>,
    options: MrvRequestBuildOptions,
) -> Result<MrvDeployPlan, MrvValidationError> {
    let from = options.from.clone();
    let nonce = options.nonce;
    let request = build_mrv_deploy_request(artifact_bytes, options)?;
    let expected_contract_address = match (artifact_hash_hex, from.as_deref(), nonce) {
        (Some(artifact_hash), Some(from), Some(nonce)) => {
            Some(derive_mrv_contract_address(from, nonce, artifact_hash)?)
        }
        (Some(artifact_hash), _, _) => {
            validate_hex_length("artifactHash", artifact_hash, 32)?;
            None
        }
        (None, _, _) => None,
    };
    Ok(MrvDeployPlan {
        request,
        extension: mrv_v1_transaction_extension(),
        expected_contract_address,
    })
}

/// Build an MRV call plan with the v1 extension descriptor attached.
///
/// # Errors
/// Returns [`MrvValidationError`] when request validation fails.
pub fn build_mrv_call_plan(
    contract_address: &str,
    input: &[u8],
    options: MrvRequestBuildOptions,
) -> Result<MrvCallPlan, MrvValidationError> {
    Ok(MrvCallPlan {
        request: build_mrv_call_request(contract_address, input, options)?,
        extension: mrv_v1_transaction_extension(),
    })
}

/// Build an MRV deploy plan plus current sign-ready native transaction fields.
///
/// # Errors
/// Returns [`MrvValidationError`] when request validation fails, a supplied
/// artifact hash is malformed, or the optional signer address is not a typed
/// user address.
pub fn build_mrv_deploy_native_tx_plan(
    artifact_bytes: &[u8],
    artifact_hash_hex: Option<&str>,
    options: MrvNativeTxBuildOptions,
) -> Result<MrvDeployNativeTxPlan, MrvValidationError> {
    let plan = build_mrv_deploy_plan(artifact_bytes, artifact_hash_hex, options.request_options())?;
    let tx = MrvNativeTxFields::from_parts(
        &options,
        None,
        plan.request.artifact_bytes.clone(),
        &plan.request.value_lythoshi,
        plan.extension.clone(),
    );
    let native_tx = MrvNativeTxFacade::from_options(&options, &plan.request.value_lythoshi);
    let fee_preview = MrvNativeFeePreview::from_options(&options);
    Ok(MrvDeployNativeTxPlan {
        request: plan.request,
        extension: plan.extension,
        expected_contract_address: plan.expected_contract_address,
        native_tx,
        fee_preview,
        tx,
    })
}

/// Build an MRV call plan plus current sign-ready native transaction fields.
///
/// # Errors
/// Returns [`MrvValidationError`] when request validation fails or the contract
/// address is not a typed `monoc` address.
pub fn build_mrv_call_native_tx_plan(
    contract_address: &str,
    input: &[u8],
    options: MrvNativeTxBuildOptions,
) -> Result<MrvCallNativeTxPlan, MrvValidationError> {
    let plan = build_mrv_call_plan(contract_address, input, options.request_options())?;
    let to = address_to_hex(mrv_bech32_to_address_kind(
        &plan.request.contract_address,
        MrvAddressKind::Contract,
    )?);
    let tx = MrvNativeTxFields::from_parts(
        &options,
        Some(to),
        plan.request.input.clone(),
        &plan.request.value_lythoshi,
        plan.extension.clone(),
    );
    let native_tx = MrvNativeTxFacade::from_options(&options, &plan.request.value_lythoshi);
    let fee_preview = MrvNativeFeePreview::from_options(&options);
    Ok(MrvCallNativeTxPlan {
        request: plan.request,
        extension: plan.extension,
        native_tx,
        fee_preview,
        tx,
    })
}

/// Encode the canonical transaction preimage that native transaction signers
/// hash before signing.
///
/// The returned bytes are not the signed wire envelope. Hash them with
/// Keccak-256 or call [`mrv_native_tx_sighash`] directly.
///
/// # Errors
/// Returns [`MrvValidationError`] when decimal, hex, address, or extension
/// fields are malformed.
pub fn encode_mrv_native_tx_signing_preimage(
    tx: &MrvNativeTxFields,
) -> Result<Vec<u8>, MrvValidationError> {
    encode_mrv_native_tx_for_hash(tx, TX_HASH_TAG_SIGNING)
}

/// Compute the Keccak-256 digest that an external ML-DSA-65 signer signs for a
/// native MRV transaction.
///
/// # Errors
/// Returns [`MrvValidationError`] when transaction fields are malformed.
pub fn mrv_native_tx_sighash(tx: &MrvNativeTxFields) -> Result<[u8; 32], MrvValidationError> {
    Ok(keccak32(&encode_mrv_native_tx_signing_preimage(tx)?))
}

/// Compute the signed transaction identity hash from the transaction fields,
/// raw ML-DSA-65 signature, and raw ML-DSA-65 public key.
///
/// # Errors
/// Returns [`MrvValidationError`] when transaction fields are malformed or the
/// signature/public key lengths are wrong.
pub fn mrv_native_tx_hash(
    tx: &MrvNativeTxFields,
    signature: &[u8],
    public_key: &[u8],
) -> Result<[u8; 32], MrvValidationError> {
    expect_len("signature", signature, ML_DSA_65_SIGNATURE_LEN)?;
    expect_len("publicKey", public_key, ML_DSA_65_PUBLIC_KEY_LEN)?;
    let mut preimage = encode_mrv_native_tx_for_hash(tx, TX_HASH_TAG_IDENTITY)?;
    preimage.extend_from_slice(signature);
    preimage.extend_from_slice(public_key);
    Ok(keccak32(&preimage))
}

/// Encode the current bincode signed native transaction envelope from an
/// already-produced ML-DSA-65 signature and public key.
///
/// # Errors
/// Returns [`MrvValidationError`] when transaction fields are malformed or the
/// signature/public key lengths are wrong.
pub fn encode_mrv_signed_native_tx_bincode(
    tx: &MrvNativeTxFields,
    signature: &[u8],
    public_key: &[u8],
) -> Result<Vec<u8>, MrvValidationError> {
    expect_len("signature", signature, ML_DSA_65_SIGNATURE_LEN)?;
    expect_len("publicKey", public_key, ML_DSA_65_PUBLIC_KEY_LEN)?;

    let input = decode_hex("input", &tx.input)?;
    let to = tx
        .to
        .as_deref()
        .map(|to| {
            hex_to_address(to).map_err(|err| MrvValidationError::InvalidAddress {
                field: "to",
                reason: err.to_string(),
            })
        })
        .transpose()?;
    let extensions = decode_native_tx_extensions(&tx.extensions)?;
    let mut out = Vec::new();
    push_u64_le(&mut out, tx.chain_id);
    push_u64_le(&mut out, tx.nonce);
    push_u256_le(
        &mut out,
        parse_u128_decimal("maxPriorityFeePerGas", &tx.max_priority_fee_per_gas)?,
    );
    push_u256_le(
        &mut out,
        parse_u128_decimal("maxFeePerGas", &tx.max_fee_per_gas)?,
    );
    push_u64_le(&mut out, tx.gas_limit);
    match to {
        Some(addr) => {
            out.push(1);
            out.extend_from_slice(&addr);
        }
        None => out.push(0),
    }
    push_u256_le(&mut out, parse_u128_decimal("value", &tx.value)?);
    push_bincode_bytes(&mut out, "input", &input)?;
    push_u64_le(&mut out, 0);
    push_u64_le(
        &mut out,
        u64::try_from(extensions.len()).unwrap_or(u64::MAX),
    );
    for extension in extensions {
        out.push(extension.kind);
        push_bincode_bytes(&mut out, "extension.body", &extension.body)?;
    }
    push_ml_dsa65_opaque(&mut out, signature)?;
    push_ml_dsa65_opaque(&mut out, public_key)?;
    Ok(out)
}

struct DecodedNativeTxExtension {
    kind: u8,
    body: Vec<u8>,
}

fn encode_mrv_native_tx_for_hash(
    tx: &MrvNativeTxFields,
    tag: u8,
) -> Result<Vec<u8>, MrvValidationError> {
    let input = decode_hex("input", &tx.input)?;
    let to = tx
        .to
        .as_deref()
        .map(|to| {
            hex_to_address(to).map_err(|err| MrvValidationError::InvalidAddress {
                field: "to",
                reason: err.to_string(),
            })
        })
        .transpose()?;
    let extensions = decode_native_tx_extensions(&tx.extensions)?;
    let mut out = Vec::new();
    out.push(tag);
    out.extend_from_slice(&tx.chain_id.to_be_bytes());
    out.extend_from_slice(&tx.nonce.to_be_bytes());
    push_u256_be(
        &mut out,
        parse_u128_decimal("maxPriorityFeePerGas", &tx.max_priority_fee_per_gas)?,
    );
    push_u256_be(
        &mut out,
        parse_u128_decimal("maxFeePerGas", &tx.max_fee_per_gas)?,
    );
    out.extend_from_slice(&tx.gas_limit.to_be_bytes());
    match to {
        Some(addr) => {
            out.push(1);
            out.extend_from_slice(&addr);
        }
        None => out.push(0),
    }
    push_u256_be(&mut out, parse_u128_decimal("value", &tx.value)?);
    push_u32_len_be(&mut out, "input.length", input.len())?;
    out.extend_from_slice(&input);
    out.extend_from_slice(&0_u32.to_be_bytes());
    push_u32_len_be(&mut out, "extensions.length", extensions.len())?;
    for extension in extensions {
        out.push(extension.kind);
        push_u32_len_be(&mut out, "extension.body", extension.body.len())?;
        out.extend_from_slice(&extension.body);
    }
    Ok(out)
}

fn decode_native_tx_extensions(
    extensions: &[MrvTransactionExtension],
) -> Result<Vec<DecodedNativeTxExtension>, MrvValidationError> {
    extensions
        .iter()
        .map(|extension| {
            Ok(DecodedNativeTxExtension {
                kind: extension.kind,
                body: decode_hex("extension.bodyHex", &extension.body_hex)?,
            })
        })
        .collect()
}

fn parse_u128_decimal(field: &'static str, value: &str) -> Result<u128, MrvValidationError> {
    validate_decimal(field, value)?;
    value
        .parse::<u128>()
        .map_err(|_| MrvValidationError::InvalidDecimal { field })
}

fn visible_fraction(fraction: u128) -> String {
    format!("{fraction:08}").trim_end_matches('0').to_owned()
}

fn format_whole_with_commas(value: u128) -> String {
    let digits = value.to_string();
    let first_group_len = digits.len() % 3;
    let mut formatted = String::with_capacity(digits.len() + digits.len() / 3);
    let mut index = 0;
    if first_group_len != 0 {
        formatted.push_str(&digits[..first_group_len]);
        index = first_group_len;
        if index < digits.len() {
            formatted.push(',');
        }
    }
    while index < digits.len() {
        formatted.push_str(&digits[index..index + 3]);
        index += 3;
        if index < digits.len() {
            formatted.push(',');
        }
    }
    formatted
}

fn strip_lyth_unit(input: &str) -> Result<&str, MrvValidationError> {
    let trimmed = input.trim();
    let numeric = if trimmed.len() >= 4 && trimmed[trimmed.len() - 4..].eq_ignore_ascii_case("LYTH")
    {
        let before_unit = &trimmed[..trimmed.len() - 4];
        if before_unit
            .as_bytes()
            .last()
            .is_none_or(u8::is_ascii_whitespace)
        {
            before_unit.trim_end()
        } else {
            return Err(MrvValidationError::InvalidDecimal { field: "lyth" });
        }
    } else {
        trimmed
    };
    if numeric.is_empty() {
        return Err(MrvValidationError::InvalidDecimal { field: "lyth" });
    }
    Ok(numeric)
}

fn is_canonical_whole_lyth(value: &str) -> bool {
    if value == "0" {
        return true;
    }
    if !value.contains(',') {
        return !value.starts_with('0') && value.bytes().all(|b| b.is_ascii_digit());
    }
    let mut groups = value.split(',');
    let Some(first) = groups.next() else {
        return false;
    };
    if first.is_empty()
        || first.len() > 3
        || first.starts_with('0')
        || !first.bytes().all(|b| b.is_ascii_digit())
    {
        return false;
    }
    groups.all(|group| group.len() == 3 && group.bytes().all(|b| b.is_ascii_digit()))
}

fn push_u256_be(out: &mut Vec<u8>, value: u128) {
    out.extend_from_slice(&[0u8; 16]);
    out.extend_from_slice(&value.to_be_bytes());
}

fn push_u256_le(out: &mut Vec<u8>, value: u128) {
    out.extend_from_slice(&value.to_le_bytes());
    out.extend_from_slice(&[0u8; 16]);
}

fn push_u32_len_be(
    out: &mut Vec<u8>,
    field: &'static str,
    len: usize,
) -> Result<(), MrvValidationError> {
    let len =
        u32::try_from(len).map_err(|_| MrvValidationError::NativeTxLengthOverflow { field })?;
    out.extend_from_slice(&len.to_be_bytes());
    Ok(())
}

fn push_u64_le(out: &mut Vec<u8>, value: u64) {
    out.extend_from_slice(&value.to_le_bytes());
}

fn push_bincode_bytes(
    out: &mut Vec<u8>,
    field: &'static str,
    bytes: &[u8],
) -> Result<(), MrvValidationError> {
    let len = u64::try_from(bytes.len())
        .map_err(|_| MrvValidationError::NativeTxLengthOverflow { field })?;
    push_u64_le(out, len);
    out.extend_from_slice(bytes);
    Ok(())
}

fn push_ml_dsa65_opaque(out: &mut Vec<u8>, bytes: &[u8]) -> Result<(), MrvValidationError> {
    out.extend_from_slice(&ENUM_VARIANT_INDEX_ML_DSA_65.to_le_bytes());
    out.extend_from_slice(&STANDARD_ALGO_NUMBER_ML_DSA_65.to_le_bytes());
    push_bincode_bytes(out, "ml_dsa_65", bytes)
}

fn expect_len(
    field: &'static str,
    bytes: &[u8],
    expected: usize,
) -> Result<(), MrvValidationError> {
    if bytes.len() != expected {
        return Err(MrvValidationError::InvalidNativeTxBytes {
            field,
            expected,
            actual: bytes.len(),
        });
    }
    Ok(())
}

fn keccak32(bytes: &[u8]) -> [u8; 32] {
    let digest = Keccak256::digest(bytes);
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    out
}

fn compute_mrv_code_hash(code: &[u8]) -> [u8; 32] {
    let mut hasher = blake3::Hasher::new();
    hasher.update(MRV_CODE_HASH_DOMAIN);
    let len = u64::try_from(code.len()).unwrap_or(u64::MAX);
    hasher.update(&len.to_be_bytes());
    hasher.update(code);
    hasher.finalize().into()
}

fn validate_memory(memory: MrvMemoryLimits) -> Result<(), MrvValidationError> {
    if memory.initial_pages == 0 {
        return Err(MrvValidationError::InvalidMemory("initialPages is zero"));
    }
    if memory.max_pages == 0 {
        return Err(MrvValidationError::InvalidMemory("maxPages is zero"));
    }
    if memory.initial_pages > memory.max_pages {
        return Err(MrvValidationError::InvalidMemory(
            "initialPages exceeds maxPages",
        ));
    }
    if memory.max_pages > MRV_MAX_MEMORY_PAGES {
        return Err(MrvValidationError::InvalidMemory("maxPages exceeds bound"));
    }
    if memory.stack_bytes == 0 {
        return Err(MrvValidationError::InvalidMemory("stackBytes is zero"));
    }
    let Some(max_bytes) = memory.max_pages.checked_mul(MRV_MEMORY_PAGE_BYTES) else {
        return Err(MrvValidationError::InvalidMemory(
            "max memory overflows u32",
        ));
    };
    if memory.stack_bytes > max_bytes {
        return Err(MrvValidationError::InvalidMemory(
            "stackBytes exceeds max memory",
        ));
    }
    if !memory.stack_bytes.is_multiple_of(16) {
        return Err(MrvValidationError::InvalidMemory(
            "stackBytes must be 16-byte aligned",
        ));
    }
    Ok(())
}

fn validate_storage_namespace(namespace: &MrvStorageNamespace) -> Result<(), MrvValidationError> {
    if namespace.version == 0 {
        return Err(MrvValidationError::InvalidStorageNamespace(
            "version must be non-zero",
        ));
    }
    if namespace.name.len() > MRV_MAX_STORAGE_NAMESPACE_BYTES {
        return Err(MrvValidationError::InvalidStorageNamespace(
            "namespace is too long",
        ));
    }
    if !is_identifier(&namespace.name) {
        return Err(MrvValidationError::InvalidStorageNamespace(
            "namespace is not canonical",
        ));
    }
    Ok(())
}

fn validate_abi(abi: &MrvAbiManifest) -> Result<(), MrvValidationError> {
    if abi.symbols.is_empty() {
        return Err(MrvValidationError::AbiEmpty);
    }
    if abi.symbols.len() > MRV_MAX_ABI_SYMBOLS {
        return Err(MrvValidationError::AbiTooLarge {
            len: abi.symbols.len(),
            max: MRV_MAX_ABI_SYMBOLS,
        });
    }
    let mut seen = BTreeSet::new();
    for symbol in &abi.symbols {
        if !is_identifier(&symbol.name) {
            return Err(MrvValidationError::InvalidAbiSymbol(symbol.name.clone()));
        }
        if !seen.insert(symbol.name.as_str()) {
            return Err(MrvValidationError::DuplicateAbiSymbol(symbol.name.clone()));
        }
        for param in symbol.inputs.iter().chain(symbol.outputs.iter()) {
            if !is_identifier(&param.name) {
                return Err(MrvValidationError::InvalidAbiParam(param.name.clone()));
            }
            validate_abi_type(&param.ty)?;
        }
    }
    Ok(())
}

fn validate_abi_type(ty: &MrvAbiType) -> Result<(), MrvValidationError> {
    if matches!(ty, MrvAbiType::FixedBytes { len: 0 }) {
        return Err(MrvValidationError::InvalidAbiParam(
            "fixed bytes length is zero".to_owned(),
        ));
    }
    Ok(())
}

fn validate_imports(
    imports: &[MrvSyscallImport],
) -> Result<Vec<MrvResolvedSyscall>, MrvValidationError> {
    let mut seen = BTreeSet::new();
    let mut resolved = Vec::with_capacity(imports.len());
    for import in imports {
        let syscall = resolve_syscall_import(import)?;
        if !seen.insert(syscall.id) {
            return Err(MrvValidationError::DuplicateSyscall(syscall.name));
        }
        resolved.push(syscall);
    }
    Ok(resolved)
}

fn resolve_syscall_import(
    import: &MrvSyscallImport,
) -> Result<MrvResolvedSyscall, MrvValidationError> {
    if import.module != MONO_SYSCALL_MODULE {
        return Err(MrvValidationError::ForbiddenHostImport {
            module: import.module.clone(),
            name: import.name.clone(),
        });
    }
    let expected_name =
        syscall_name(import.id).ok_or(MrvValidationError::UnknownSyscallId(import.id))?;
    let expected_id = syscall_id(&import.name)
        .ok_or_else(|| MrvValidationError::UnknownSyscallName(import.name.clone()))?;
    if expected_id != import.id {
        return Err(MrvValidationError::SyscallNameMismatch {
            name: import.name.clone(),
            declared: import.id,
            expected: expected_id,
        });
    }
    Ok(MrvResolvedSyscall {
        id: import.id,
        name: expected_name.to_owned(),
    })
}

fn syscall_name(id: u16) -> Option<&'static str> {
    match id {
        0x0101 => Some("storage_read"),
        0x0102 => Some("storage_write"),
        0x0103 => Some("storage_delete"),
        0x0201 => Some("caller"),
        0x0202 => Some("contract_address"),
        0x0203 => Some("block_height"),
        0x0204 => Some("block_hash"),
        0x0301 => Some("call_contract"),
        0x0302 => Some("emit_event"),
        0x0303 => Some("transfer_native"),
        0x0401 => Some("verify_signature"),
        0x0402 => Some("hash"),
        0x0501 => Some("revert"),
        _ => None,
    }
}

fn syscall_id(name: &str) -> Option<u16> {
    match name {
        "storage_read" => Some(0x0101),
        "storage_write" => Some(0x0102),
        "storage_delete" => Some(0x0103),
        "caller" => Some(0x0201),
        "contract_address" => Some(0x0202),
        "block_height" => Some(0x0203),
        "block_hash" => Some(0x0204),
        "call_contract" => Some(0x0301),
        "emit_event" => Some(0x0302),
        "transfer_native" => Some(0x0303),
        "verify_signature" => Some(0x0401),
        "hash" => Some(0x0402),
        "revert" => Some(0x0501),
        _ => None,
    }
}

fn validate_typed_address(
    field: &'static str,
    address: &str,
    expected: MrvAddressKind,
) -> Result<(), MrvValidationError> {
    typed_bech32_to_address_kind(address, expected.address_kind())
        .map(|_| ())
        .map_err(|err| MrvValidationError::InvalidAddress {
            field,
            reason: err.to_string(),
        })
}

fn validate_execution_unit_limit(
    field: &'static str,
    value: Option<u64>,
) -> Result<(), MrvValidationError> {
    if value == Some(0) {
        return Err(MrvValidationError::InvalidExecutionUnitLimit { field });
    }
    Ok(())
}

fn validate_optional_decimal(
    field: &'static str,
    value: Option<&str>,
) -> Result<(), MrvValidationError> {
    if let Some(value) = value {
        validate_decimal(field, value)?;
    }
    Ok(())
}

fn validate_decimal(field: &'static str, value: &str) -> Result<(), MrvValidationError> {
    if value.is_empty() || (value.len() > 1 && value.starts_with('0')) {
        return Err(MrvValidationError::InvalidDecimal { field });
    }
    if !value.bytes().all(|b| b.is_ascii_digit()) {
        return Err(MrvValidationError::InvalidDecimal { field });
    }
    value
        .parse::<u128>()
        .map(|_| ())
        .map_err(|_| MrvValidationError::InvalidDecimal { field })
}

fn validate_hex_length(
    field: &'static str,
    value: &str,
    expected: usize,
) -> Result<(), MrvValidationError> {
    let bytes = decode_hex(field, value)?;
    if bytes.len() != expected {
        return Err(MrvValidationError::InvalidHexLength { field, expected });
    }
    Ok(())
}

fn decode_hex(field: &'static str, value: &str) -> Result<Vec<u8>, MrvValidationError> {
    let Some(body) = value
        .strip_prefix("0x")
        .or_else(|| value.strip_prefix("0X"))
    else {
        return Err(MrvValidationError::InvalidHex { field });
    };
    if body.len() % 2 != 0 {
        return Err(MrvValidationError::InvalidHex { field });
    }
    let mut out = Vec::with_capacity(body.len() / 2);
    for i in 0..body.len() / 2 {
        let hi = decode_hex_nibble(body.as_bytes()[i * 2])
            .ok_or(MrvValidationError::InvalidHex { field })?;
        let lo = decode_hex_nibble(body.as_bytes()[i * 2 + 1])
            .ok_or(MrvValidationError::InvalidHex { field })?;
        out.push((hi << 4) | lo);
    }
    Ok(out)
}

fn decode_hex_nibble(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(2 + bytes.len() * 2);
    out.push_str("0x");
    for byte in bytes {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

fn is_identifier(value: &str) -> bool {
    let mut chars = value.bytes();
    let Some(first) = chars.next() else {
        return false;
    };
    if !first.is_ascii_lowercase() {
        return false;
    }
    chars.all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == b'_')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lyth_amount_helpers_use_eight_decimal_precision() {
        let cases = [
            (0, "0 LYTH"),
            (1, "0.00000001 LYTH"),
            (50_000, "0.0005 LYTH"),
            (12_340_000, "0.1234 LYTH"),
            (12_345_678, "0.12345678 LYTH"),
            (500_050_000_000, "5,000.5 LYTH"),
        ];

        assert_eq!(NATIVE_LYTH_DECIMALS, 8);
        for (lythoshi, expected) in cases {
            assert_eq!(format_lyth(lythoshi, LythFormatOptions::DEFAULT), expected);
            assert_eq!(
                format_lythoshi(lythoshi, LythFormatOptions::DEFAULT),
                expected
            );
            assert_eq!(parse_lyth_to_lythoshi(expected).unwrap(), lythoshi);
        }
        assert_eq!(
            format_lyth(500_050_000_000, LythFormatOptions::NUMERIC_ONLY),
            "5,000.5"
        );
        assert_eq!(parse_lyth_to_lythoshi("1.00000001").unwrap(), 100_000_001);
        assert!(parse_lyth_to_lythoshi("1.").is_err());
        assert!(parse_lyth_to_lythoshi("1.000000001").is_err());
        assert!(parse_lyth_to_lythoshi("12,34 LYTH").is_err());
    }

    fn valid_metadata() -> MrvArtifactMetadata {
        let code = [0x13, 0x00, 0x00, 0x00];
        MrvArtifactMetadata {
            format_version: MRV_FORMAT_VERSION,
            profile: MrvRiscvProfile::MonoRv32ImV1,
            code_hash: mrv_code_hash_hex(&code),
            code_bytes: code.len() as u64,
            debug_bytes: 0,
            abi: MrvAbiManifest {
                symbols: vec![MrvAbiSymbol {
                    name: "transfer".to_owned(),
                    kind: MrvAbiSymbolKind::Function,
                    inputs: vec![MrvAbiParam {
                        name: "amount".to_owned(),
                        ty: MrvAbiType::U128,
                    }],
                    outputs: vec![MrvAbiParam {
                        name: "ok".to_owned(),
                        ty: MrvAbiType::Bool,
                    }],
                }],
            },
            imports: vec![
                MrvSyscallImport {
                    module: "mono".to_owned(),
                    name: "storage_read".to_owned(),
                    id: 0x0101,
                },
                MrvSyscallImport {
                    module: "mono".to_owned(),
                    name: "emit_event".to_owned(),
                    id: 0x0302,
                },
            ],
            memory: MrvMemoryLimits {
                initial_pages: 1,
                max_pages: 4,
                stack_bytes: 16 * 1024,
            },
            storage_namespace: MrvStorageNamespace {
                name: "contract_state".to_owned(),
                version: 1,
            },
            build: MrvBuildMetadata {
                toolchain: "mono-riscv-test".to_owned(),
                source_digest: "0x0707070707070707070707070707070707070707070707070707070707070707"
                    .to_owned(),
                profile: "release-deterministic".to_owned(),
            },
        }
    }

    #[test]
    fn artifact_metadata_validates_and_serializes_to_wire_shape() {
        let code = [0x13, 0x00, 0x00, 0x00];
        let metadata = valid_metadata();
        let validated = validate_mrv_artifact_metadata(&metadata, &code).unwrap();
        assert_eq!(validated.profile, MrvRiscvProfile::MonoRv32ImV1);
        assert_eq!(validated.code_hash, metadata.code_hash);
        assert_eq!(validated.abi_symbol_count, 1);
        assert_eq!(
            validated.syscalls,
            vec![
                MrvResolvedSyscall {
                    id: 0x0101,
                    name: "storage_read".to_owned()
                },
                MrvResolvedSyscall {
                    id: 0x0302,
                    name: "emit_event".to_owned()
                }
            ]
        );

        let value = serde_json::to_value(&metadata).unwrap();
        assert_eq!(value["formatVersion"], 1);
        assert_eq!(value["profile"], "mono_rv32im_v1");
        assert_eq!(value["codeBytes"], 4);
        assert_eq!(value["memory"]["initialPages"], 1);
        assert_eq!(value["storageNamespace"]["name"], "contract_state");
        assert!(value.get("gas").is_none());
    }

    #[test]
    fn artifact_metadata_rejects_bad_hash_and_imports() {
        let code = [0x13, 0x00, 0x00, 0x00];
        let mut metadata = valid_metadata();
        metadata.code_hash =
            "0x9999999999999999999999999999999999999999999999999999999999999999".to_owned();
        assert!(matches!(
            validate_mrv_artifact_metadata(&metadata, &code),
            Err(MrvValidationError::CodeHashMismatch { .. })
        ));

        let mut metadata = valid_metadata();
        metadata.imports.push(MrvSyscallImport {
            module: "wasi_snapshot_preview1".to_owned(),
            name: "fd_read".to_owned(),
            id: 0x0101,
        });
        assert!(matches!(
            validate_mrv_artifact_metadata(&metadata, &code),
            Err(MrvValidationError::ForbiddenHostImport { .. })
        ));
    }

    #[test]
    fn typed_address_helpers_round_trip_contract_hrp() {
        let bytes = [0x22; 20];
        let contract = mrv_address_to_bech32(MrvAddressKind::Contract, bytes);
        assert!(contract.starts_with("monoc1"));
        assert_eq!(
            mrv_bech32_to_address(&contract).unwrap(),
            (MrvAddressKind::Contract, bytes)
        );
        assert_eq!(
            mrv_bech32_to_address_kind(&contract, MrvAddressKind::Contract).unwrap(),
            bytes
        );
        assert!(mrv_bech32_to_address_kind(&contract, MrvAddressKind::User).is_err());
    }

    #[test]
    fn derives_mrv_deploy_contract_address_from_runtime_preimage() {
        let deployer = mrv_address_to_bech32(MrvAddressKind::User, [0x11; 20]);
        let smart_account = mrv_address_to_bech32(MrvAddressKind::SmartAccount, [0x11; 20]);
        let artifact_hash = "0x598501b99b388ca564905b49040c6d315a55fb13bf34a6f002aa04960a27895d";

        let contract = derive_mrv_contract_address(&deployer, 7, artifact_hash).unwrap();
        let (kind, bytes) = mrv_bech32_to_address(&contract).unwrap();

        assert_eq!(kind, MrvAddressKind::Contract);
        assert_eq!(bytes.len(), 20);
        assert_eq!(
            contract,
            derive_mrv_contract_address(&deployer, 7, artifact_hash).unwrap()
        );
        assert_ne!(
            contract,
            derive_mrv_contract_address(&deployer, 8, artifact_hash).unwrap()
        );
        assert_ne!(
            contract,
            derive_mrv_contract_address(&smart_account, 7, artifact_hash).unwrap()
        );
        assert!(derive_mrv_contract_address(&deployer, 7, "0x1234").is_err());
    }

    #[test]
    fn deploy_and_call_request_validation_uses_lythoshi_and_execution_units() {
        let user = mrv_address_to_bech32(MrvAddressKind::User, [0x11; 20]);
        let contract = mrv_address_to_bech32(MrvAddressKind::Contract, [0x22; 20]);
        let deploy = MrvDeployRequest {
            from: Some(user.clone()),
            artifact_bytes: "0x13000000".to_owned(),
            value_lythoshi: "100000000".to_owned(),
            execution_unit_limit: Some(1_000_000),
            max_execution_fee_lythoshi: Some("10".to_owned()),
            priority_tip_lythoshi: Some("1".to_owned()),
            nonce: Some(7),
        };
        validate_mrv_deploy_request(&deploy).unwrap();
        let call = MrvCallRequest {
            from: Some(user),
            contract_address: contract,
            input: "0x0102".to_owned(),
            value_lythoshi: "0".to_owned(),
            execution_unit_limit: Some(50_000),
            max_execution_fee_lythoshi: None,
            priority_tip_lythoshi: None,
            nonce: None,
        };
        validate_mrv_call_request(&call).unwrap();
        assert_eq!(mrv_v1_transaction_extension().kind, MRV_TX_EXTENSION_KIND);
        assert_eq!(mrv_v1_transaction_extension().body_hex, "0x01");
        assert!(serde_json::to_string(&call)
            .unwrap()
            .contains("valueLythoshi"));
        assert!(!serde_json::to_string(&call).unwrap().contains("gas"));
    }

    #[test]
    fn builders_create_valid_mrv_plans_without_handwritten_wire_fields() {
        let user = mrv_address_to_bech32(MrvAddressKind::User, [0x11; 20]);
        let contract = mrv_address_to_bech32(MrvAddressKind::Contract, [0x22; 20]);
        let artifact_hash = "0x598501b99b388ca564905b49040c6d315a55fb13bf34a6f002aa04960a27895d";

        let deploy = build_mrv_deploy_request(
            &[0x13, 0x00, 0x00, 0x00],
            MrvRequestBuildOptions::new()
                .from(user.clone())
                .value_lythoshi(100_000_000)
                .execution_unit_limit(1_000_000)
                .max_execution_fee_lythoshi(25)
                .priority_tip_lythoshi(1)
                .nonce(7),
        )
        .unwrap();
        assert_eq!(deploy.artifact_bytes, "0x13000000");
        assert_eq!(deploy.value_lythoshi, "100000000");
        assert_eq!(deploy.execution_unit_limit, Some(1_000_000));
        assert_eq!(deploy.max_execution_fee_lythoshi.as_deref(), Some("25"));
        assert_eq!(deploy.priority_tip_lythoshi.as_deref(), Some("1"));

        let deploy_plan = build_mrv_deploy_plan(
            &[0x13, 0x00, 0x00, 0x00],
            Some(artifact_hash),
            MrvRequestBuildOptions::new().from(user.clone()).nonce(7),
        )
        .unwrap();
        assert_eq!(deploy_plan.request.value_lythoshi, "0");
        assert_eq!(deploy_plan.extension.kind, MRV_TX_EXTENSION_KIND);
        assert_eq!(deploy_plan.extension.body_hex, "0x01");
        let expected_address = derive_mrv_contract_address(&user, 7, artifact_hash).unwrap();
        assert_eq!(
            deploy_plan.expected_contract_address.as_deref(),
            Some(expected_address.as_str())
        );

        let call_plan = build_mrv_call_plan(
            &contract,
            &[0x01, 0x02],
            MrvRequestBuildOptions::new().from(user),
        )
        .unwrap();
        assert_eq!(call_plan.request.contract_address, contract);
        assert_eq!(call_plan.request.input, "0x0102");
        assert_eq!(call_plan.request.value_lythoshi, "0");

        let wire = serde_json::to_string(&deploy_plan).unwrap();
        assert!(wire.contains("artifactBytes"));
        assert!(wire.contains("valueLythoshi"));
        assert!(wire.contains("expectedContractAddress"));
        assert!(!wire.contains("gas"));
        assert!(
            build_mrv_deploy_plan(&[0x13], Some("0x1234"), MrvRequestBuildOptions::new()).is_err()
        );
        assert!(build_mrv_call_request(
            &contract,
            &[0x01],
            MrvRequestBuildOptions::new().execution_unit_limit(0)
        )
        .is_err());
    }

    #[test]
    fn builders_create_signer_ready_native_tx_plans() {
        let user = mrv_address_to_bech32(MrvAddressKind::User, [0x11; 20]);
        let contract = mrv_address_to_bech32(MrvAddressKind::Contract, [0x22; 20]);
        let artifact_hash = "0x598501b99b388ca564905b49040c6d315a55fb13bf34a6f002aa04960a27895d";

        let deploy = build_mrv_deploy_native_tx_plan(
            &[0x13, 0x00, 0x00, 0x00],
            Some(artifact_hash),
            MrvNativeTxBuildOptions::new(69_420, 7, 100_000, 25)
                .from(user.clone())
                .priority_tip_lythoshi(1),
        )
        .unwrap();
        assert_eq!(
            deploy.expected_contract_address.as_deref(),
            Some(
                derive_mrv_contract_address(&user, 7, artifact_hash)
                    .unwrap()
                    .as_str()
            )
        );
        assert_eq!(deploy.native_tx.chain_id, 69_420);
        assert_eq!(deploy.native_tx.nonce, 7);
        assert_eq!(deploy.native_tx.value_lythoshi, "0");
        assert_eq!(deploy.native_tx.execution_unit_limit, 100_000);
        assert_eq!(deploy.native_tx.max_execution_fee_lythoshi, "25");
        assert_eq!(deploy.native_tx.priority_tip_lythoshi, "1");
        assert_eq!(deploy.fee_preview.total_lythoshi, "25");
        assert_eq!(deploy.fee_preview.total_lyth, "0.00000025");
        assert_eq!(deploy.fee_preview.cycles_used, 100_000);
        assert_eq!(deploy.fee_preview.execution_unit_limit, 100_000);
        assert_eq!(deploy.fee_preview.max_execution_fee_lythoshi, "25");
        assert_eq!(deploy.fee_preview.priority_tip_lythoshi, "1");
        assert_eq!(deploy.tx.chain_id, 69_420);
        assert_eq!(deploy.tx.nonce, 7);
        assert_eq!(deploy.tx.max_priority_fee_per_gas, "1");
        assert_eq!(deploy.tx.max_fee_per_gas, "25");
        assert_eq!(deploy.tx.gas_limit, 100_000);
        assert_eq!(deploy.tx.to, None);
        assert_eq!(deploy.tx.value, "0");
        assert_eq!(deploy.tx.input, "0x13000000");
        assert_eq!(
            deploy.tx.extensions,
            vec![MrvTransactionExtension {
                kind: MRV_TX_EXTENSION_KIND,
                body_hex: "0x01".to_owned(),
            }]
        );

        let call = build_mrv_call_native_tx_plan(
            &contract,
            &[0x01, 0x02],
            MrvNativeTxBuildOptions::new(69_420, 8, 50_000, 10)
                .from(user)
                .value_lythoshi(3),
        )
        .unwrap();
        assert_eq!(call.native_tx.chain_id, 69_420);
        assert_eq!(call.native_tx.nonce, 8);
        assert_eq!(call.native_tx.value_lythoshi, "3");
        assert_eq!(call.native_tx.execution_unit_limit, 50_000);
        assert_eq!(call.native_tx.max_execution_fee_lythoshi, "10");
        assert_eq!(call.native_tx.priority_tip_lythoshi, "0");
        assert_eq!(call.fee_preview.total_lythoshi, "10");
        assert_eq!(call.fee_preview.total_lyth, "0.0000001");
        assert_eq!(call.fee_preview.cycles_used, 50_000);
        assert_eq!(call.fee_preview.execution_unit_limit, 50_000);
        assert_eq!(call.fee_preview.max_execution_fee_lythoshi, "10");
        assert_eq!(call.fee_preview.priority_tip_lythoshi, "0");
        assert_eq!(call.tx.chain_id, 69_420);
        assert_eq!(call.tx.nonce, 8);
        assert_eq!(call.tx.max_priority_fee_per_gas, "0");
        assert_eq!(call.tx.max_fee_per_gas, "10");
        assert_eq!(call.tx.gas_limit, 50_000);
        assert_eq!(
            call.tx.to.as_deref(),
            Some("0x2222222222222222222222222222222222222222")
        );
        assert_eq!(call.tx.value, "3");
        assert_eq!(call.tx.input, "0x0102");
        assert_eq!(call.tx.extensions[0].kind, MRV_TX_EXTENSION_KIND);

        let mut wire = serde_json::to_value(&call).unwrap();
        assert_eq!(wire["tx"]["chainId"], 69_420);
        assert_eq!(wire["tx"]["maxFeePerGas"], "10");
        assert_eq!(wire["tx"]["gasLimit"], 50_000);
        assert_eq!(wire["tx"]["extensions"][0]["bodyHex"], "0x01");
        assert_eq!(wire["nativeTx"]["maxExecutionFeeLythoshi"], "10");
        assert_eq!(wire["nativeTx"]["executionUnitLimit"], 50_000);
        assert_eq!(wire["feePreview"]["totalLythoshi"], "10");
        assert_eq!(wire["feePreview"]["totalLyth"], "0.0000001");
        assert_eq!(wire["feePreview"]["cyclesUsed"], 50_000);
        let signing_adapter = wire.as_object_mut().unwrap().remove("tx").unwrap();
        let app_facing_wire = serde_json::to_string(&wire).unwrap().to_lowercase();
        assert!(!app_facing_wire.contains("gas"));
        assert!(!app_facing_wire.contains("wei"));
        assert!(serde_json::to_string(&signing_adapter)
            .unwrap()
            .contains("gasLimit"));

        assert!(build_mrv_call_native_tx_plan(
            &mrv_address_to_bech32(MrvAddressKind::User, [0x33; 20]),
            &[],
            MrvNativeTxBuildOptions::new(69_420, 0, 1, 1)
        )
        .is_err());
    }

    #[test]
    fn native_tx_encoding_commits_to_mrv_extensions() {
        let contract = mrv_address_to_bech32(MrvAddressKind::Contract, [0x22; 20]);
        let plan = build_mrv_call_native_tx_plan(
            &contract,
            &[0x01, 0x02],
            MrvNativeTxBuildOptions::new(69_420, 8, 50_000, 10).value_lythoshi(3),
        )
        .unwrap();
        let mut no_extension = plan.tx.clone();
        no_extension.extensions.clear();

        let no_extension_preimage = encode_mrv_native_tx_signing_preimage(&no_extension).unwrap();
        let with_extension_preimage = encode_mrv_native_tx_signing_preimage(&plan.tx).unwrap();
        assert_ne!(with_extension_preimage, no_extension_preimage);
        assert!(hex_encode(&no_extension_preimage).ends_with("0000000000000000"));
        assert!(hex_encode(&with_extension_preimage).ends_with("0000000001300000000101"));

        let sig = vec![0x55; ML_DSA_65_SIGNATURE_LEN];
        let public_key = vec![0x66; ML_DSA_65_PUBLIC_KEY_LEN];
        let sighash = mrv_native_tx_sighash(&plan.tx).unwrap();
        let tx_hash = mrv_native_tx_hash(&plan.tx, &sig, &public_key).unwrap();
        assert_eq!(sighash.len(), 32);
        assert_eq!(tx_hash.len(), 32);
        assert_ne!(sighash, tx_hash);

        let wire = encode_mrv_signed_native_tx_bincode(&plan.tx, &sig, &public_key).unwrap();
        assert!(hex_encode(&wire)
            .contains("000000000000000001000000000000003001000000000000000105000000"));
        assert!(encode_mrv_signed_native_tx_bincode(&plan.tx, &sig[..10], &public_key).is_err());
    }
}
