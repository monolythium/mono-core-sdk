//! Additive v4.1 MRV/RISC-V SDK surface.
//!
//! This module mirrors the accepted MRV artifact, typed-address, native
//! deploy/call, and receipt terms without depending on `mono-core` internals.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::address::{
    address_to_typed_bech32, typed_bech32_to_address, typed_bech32_to_address_kind, AddressKind,
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
/// Lythoshi in one LYTH.
pub const LYTHOSHI_PER_LYTH: u128 = 100_000_000;
/// Signed transaction extension kind for MRV execution.
pub const MRV_TX_EXTENSION_KIND: u8 = 0x30;
/// Body byte for the first MRV extension version.
pub const MRV_TX_EXTENSION_V1: u8 = 0x01;

const MRV_CODE_HASH_DOMAIN: &[u8] = b"MONO_MRV_CODE_V1";
const MONO_SYSCALL_MODULE: &str = "mono";

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
}
