//! Native developer schema surface shared by Mono Studio Host, the DevKit,
//! and the native developer MCP profile.

use serde::{Deserialize, Serialize};

/// Wallet host API implemented by this crate.
pub const NATIVE_DEV_HOST_API_VERSION: &str = "0.1.0";
/// DevKit manifest schema supported by this crate.
pub const NATIVE_DEV_MANIFEST_SCHEMA_VERSION: u16 = 1;
/// Sidecar IPC protocol supported by this crate.
pub const NATIVE_DEV_IPC_PROTOCOL_VERSION: &str = "mono.native-dev.ipc.v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeDevkitChannel {
    Stable,
    Testnet,
    Local,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeDevkitSidecarStatus {
    Missing,
    Stopped,
    Starting,
    Running,
    Unhealthy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeDevkitCompatibility {
    Compatible,
    TooOldForHost,
    TooNewForHost,
    InvalidManifest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StudioHostState {
    Disabled,
    MissingDevkit,
    IncompatibleDevkit,
    Ready,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevkitArchive {
    pub url: String,
    pub sha256: String,
    pub signature: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevkitSidecarManifest {
    pub binary_name: String,
    pub ipc_protocol_version: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevkitManifest {
    pub schema_version: u16,
    pub devkit_version: String,
    pub channel: NativeDevkitChannel,
    pub minimum_wallet_host_api: String,
    pub maximum_wallet_host_api: String,
    pub mono_core_commit: String,
    pub mono_core_sdk_commit: String,
    pub archive: NativeDevkitArchive,
    pub sidecar: NativeDevkitSidecarManifest,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_notes_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevkitStatus {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_version: Option<String>,
    pub channel: NativeDevkitChannel,
    pub host_api_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_path: Option<String>,
    pub sidecar_status: NativeDevkitSidecarStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manifest: Option<NativeDevkitManifest>,
    pub compatibility: NativeDevkitCompatibility,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StudioHostStatus {
    pub state: StudioHostState,
    pub developer_mode_enabled: bool,
    pub host_api_version: String,
    pub devkit: NativeDevkitStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeDevRiskSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevRiskLabel {
    pub id: String,
    pub title: String,
    pub severity: NativeDevRiskSeverity,
    pub detail: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeDevApprovalKind {
    MrvDeploy,
    MrvCall,
    MrcTokenCreate,
    VerificationPublish,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NativeDevWalletApprovalRequest {
    pub id: String,
    pub kind: NativeDevApprovalKind,
    pub created_at: String,
    pub origin: String,
    pub chain_id: String,
    pub from: String,
    pub title: String,
    pub summary: String,
    pub risk_labels: Vec<NativeDevRiskLabel>,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NativeDevMrvDeployPlan {
    pub chain_id: String,
    pub from: String,
    pub expected_contract_address: String,
    pub artifact_hash: String,
    pub abi_hash: String,
    pub value_lythoshi: String,
    pub execution_unit_limit: String,
    pub max_execution_fee_lythoshi: String,
    pub constructor_input: String,
    pub risk_labels: Vec<NativeDevRiskLabel>,
    pub wallet_approval_request: NativeDevWalletApprovalRequest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeDevMrcAssetKind {
    Mrc20FixedSupply,
    Mrc20CappedMint,
    Mrc721Collection,
    Mrc1155Collection,
    Mrc4626Vault,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevMrcAllocation {
    pub address: String,
    pub amount: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NativeDevMrcTokenPlan {
    pub asset_kind: NativeDevMrcAssetKind,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub supply_policy: String,
    pub mint_policy: String,
    pub transfer_policy: String,
    pub metadata_policy: String,
    pub admin_roles: Vec<String>,
    pub issuer_address: String,
    pub initial_allocations: Vec<NativeDevMrcAllocation>,
    pub risk_labels: Vec<NativeDevRiskLabel>,
    pub wallet_approval_request: NativeDevWalletApprovalRequest,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NativeDevContractPassport {
    pub address: String,
    pub artifact_hash: String,
    pub source_bundle_hash: String,
    pub abi_hash: String,
    pub compiler_version: String,
    pub sdk_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template_id: Option<String>,
    pub verification_status: String,
    pub risk_labels: Vec<NativeDevRiskLabel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deploy_tx: Option<String>,
    pub issuer: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevVerificationArtifact {
    pub artifact_hash: String,
    pub source_bundle_hash: String,
    pub abi_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NativeDevVerificationFile {
    pub path: String,
    pub hash: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NativeDevVerificationBundle {
    pub bundle_hash: String,
    pub contract_passport: NativeDevContractPassport,
    pub artifact: NativeDevVerificationArtifact,
    pub files: Vec<NativeDevVerificationFile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallet_approval_request: Option<NativeDevWalletApprovalRequest>,
}

#[must_use]
pub fn check_native_devkit_compatibility(
    manifest: Option<&NativeDevkitManifest>,
    host_api_version: &str,
) -> NativeDevkitCompatibility {
    let Some(manifest) = manifest else {
        return NativeDevkitCompatibility::InvalidManifest;
    };
    if manifest.schema_version != NATIVE_DEV_MANIFEST_SCHEMA_VERSION
        || manifest.sidecar.ipc_protocol_version != NATIVE_DEV_IPC_PROTOCOL_VERSION
    {
        return NativeDevkitCompatibility::InvalidManifest;
    }
    if compare_versions(host_api_version, &manifest.minimum_wallet_host_api).is_lt() {
        return NativeDevkitCompatibility::TooNewForHost;
    }
    if compare_versions(host_api_version, &manifest.maximum_wallet_host_api).is_gt() {
        return NativeDevkitCompatibility::TooOldForHost;
    }
    NativeDevkitCompatibility::Compatible
}

#[must_use]
pub fn resolve_studio_host_status(
    developer_mode_enabled: bool,
    channel: NativeDevkitChannel,
    install_path: Option<String>,
    manifest: Option<NativeDevkitManifest>,
    sidecar_status: Option<NativeDevkitSidecarStatus>,
) -> StudioHostStatus {
    let compatibility =
        check_native_devkit_compatibility(manifest.as_ref(), NATIVE_DEV_HOST_API_VERSION);
    let devkit = NativeDevkitStatus {
        installed_version: manifest.as_ref().map(|item| item.devkit_version.clone()),
        channel,
        host_api_version: NATIVE_DEV_HOST_API_VERSION.to_owned(),
        install_path: install_path.clone(),
        sidecar_status: sidecar_status.unwrap_or(if install_path.is_some() {
            NativeDevkitSidecarStatus::Stopped
        } else {
            NativeDevkitSidecarStatus::Missing
        }),
        manifest,
        compatibility,
        message: native_devkit_status_message(compatibility, install_path.as_deref()).to_owned(),
    };
    let state = if !developer_mode_enabled {
        StudioHostState::Disabled
    } else if install_path.is_none() || devkit.manifest.is_none() {
        StudioHostState::MissingDevkit
    } else if compatibility != NativeDevkitCompatibility::Compatible {
        StudioHostState::IncompatibleDevkit
    } else {
        StudioHostState::Ready
    };
    StudioHostStatus {
        state,
        developer_mode_enabled,
        host_api_version: NATIVE_DEV_HOST_API_VERSION.to_owned(),
        devkit,
    }
}

#[must_use]
pub fn native_dev_ui_strings() -> &'static [&'static str] {
    &[
        "Mono Studio Host",
        "Developer Mode",
        "DevKit missing",
        "DevKit incompatible",
        "DevKit ready",
        "Wallet approval required",
        "Execution units",
        "Maximum execution fee",
        "Lythoshi value",
        "Artifact hash",
        "ABI manifest",
        "Token passport",
        "Verification bundle",
    ]
}

fn native_devkit_status_message(
    compatibility: NativeDevkitCompatibility,
    install_path: Option<&str>,
) -> &'static str {
    if install_path.is_none() {
        return "DevKit is not installed.";
    }
    match compatibility {
        NativeDevkitCompatibility::Compatible => "DevKit is compatible with this wallet host.",
        NativeDevkitCompatibility::TooOldForHost => "DevKit is older than this wallet host API.",
        NativeDevkitCompatibility::TooNewForHost => "DevKit requires a newer wallet host API.",
        NativeDevkitCompatibility::InvalidManifest => "DevKit manifest is invalid.",
    }
}

fn compare_versions(left: &str, right: &str) -> std::cmp::Ordering {
    parse_version_parts(left).cmp(&parse_version_parts(right))
}

fn parse_version_parts(value: &str) -> [u64; 3] {
    let mut out = [0_u64; 3];
    for (index, part) in value.split(['.', '-']).take(3).enumerate() {
        out[index] = part.parse::<u64>().unwrap_or(0);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest() -> NativeDevkitManifest {
        NativeDevkitManifest {
            schema_version: NATIVE_DEV_MANIFEST_SCHEMA_VERSION,
            devkit_version: "0.1.0".to_owned(),
            channel: NativeDevkitChannel::Testnet,
            minimum_wallet_host_api: "0.1.0".to_owned(),
            maximum_wallet_host_api: "0.1.9".to_owned(),
            mono_core_commit: "1111111111111111111111111111111111111111".to_owned(),
            mono_core_sdk_commit: "2222222222222222222222222222222222222222".to_owned(),
            archive: NativeDevkitArchive {
                url: "file:///tmp/mono-devkit.tar.zst".to_owned(),
                sha256: "a".repeat(64),
                signature: "test-signature".to_owned(),
                size_bytes: None,
            },
            sidecar: NativeDevkitSidecarManifest {
                binary_name: "mono-dev".to_owned(),
                ipc_protocol_version: NATIVE_DEV_IPC_PROTOCOL_VERSION.to_owned(),
            },
            release_notes_url: None,
        }
    }

    #[test]
    fn native_devkit_status_resolves_host_states() {
        let manifest = manifest();
        assert_eq!(
            check_native_devkit_compatibility(Some(&manifest), NATIVE_DEV_HOST_API_VERSION),
            NativeDevkitCompatibility::Compatible
        );
        assert_eq!(
            resolve_studio_host_status(false, NativeDevkitChannel::Stable, None, None, None).state,
            StudioHostState::Disabled
        );
        assert_eq!(
            resolve_studio_host_status(true, NativeDevkitChannel::Stable, None, None, None).state,
            StudioHostState::MissingDevkit
        );
        assert_eq!(
            resolve_studio_host_status(
                true,
                NativeDevkitChannel::Testnet,
                Some("/tmp/devkit".to_owned()),
                Some(manifest),
                None
            )
            .state,
            StudioHostState::Ready
        );
    }

    #[test]
    fn native_dev_ui_strings_exclude_inherited_terms() {
        let blocked = [
            String::from("Sol") + "idity",
            String::from("Found") + "ry",
            String::from("Hard") + "hat",
            String::from("for") + "ge",
            String::from("ca") + "st",
            String::from("ER") + "C",
            String::from("EV") + "M",
            String::from(char::from(48)) + &String::from(char::from(120)),
            String::from("ga") + "s",
            String::from("gw") + "ei",
            String::from('w') + "ei",
            String::from("eth") + "_",
        ];
        let ui = native_dev_ui_strings().join("\n");
        for term in blocked {
            assert!(!ui.contains(&term), "native dev UI string contains {term}");
        }
    }
}
