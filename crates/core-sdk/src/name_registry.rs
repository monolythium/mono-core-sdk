//! Hierarchical name-registry precompile (`0x110E`) calldata + pricing
//! helpers.
//!
//! Mirrors `packages/ts/src/name-registry.ts` and
//! `mono-core/crates/precompiles/platform/name-registry-hierarchical`:
//! the U-curve registration cost and the frozen `register` /
//! `proposeTransfer` / `acceptTransfer` ABI signatures. Reads (forward
//! `lyth_resolveName`, reverse `lyth_nameOf`) live on the RPC client;
//! this module is the write/pricing side.

use sha3::{Digest, Keccak256};

use crate::consts::precompile_addresses::NAME_REGISTRY;

/// Name-registry precompile address (`0x110E`).
pub const NAME_REGISTRY_ADDRESS: [u8; 20] = NAME_REGISTRY;

/// `register(string,address)`.
pub const SIG_REGISTER: &str = "register(string,address)";
/// `proposeTransfer(string,address)`.
pub const SIG_PROPOSE_TRANSFER: &str = "proposeTransfer(string,address)";
/// `acceptTransfer(string)`.
pub const SIG_ACCEPT_TRANSFER: &str = "acceptTransfer(string)";

/// Fallback fee unit when the block base fee reads zero
/// (`ops.rs` `FALLBACK_FEE_UNIT_LYTHOSHI`).
pub const NAME_FALLBACK_FEE_UNIT_LYTHOSHI: u128 = 1_000_000_000_000;

/// Maximum whole-name length.
pub const NAME_MAX_LEN: usize = 80;
/// Minimum label length.
pub const NAME_LABEL_MIN_LEN: usize = 1;
/// Maximum label length.
pub const NAME_LABEL_MAX_LEN: usize = 63;

/// Name category (mirrors `NameCategory`). `System` is not user-registerable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NameCategory {
    /// `<x>.mono`.
    Human,
    /// `<x>.agent.<human>.mono`.
    Agent,
    /// `<x>.cluster.mono`.
    Cluster,
    /// `<x>.contract.mono`.
    Contract,
    /// `<x>.system.mono` — not user-registerable.
    System,
}

impl NameCategory {
    /// Per-category base multiplier (`validate.rs` `base_multiplier`).
    /// `None` for [`NameCategory::System`].
    #[must_use]
    pub const fn base_multiplier(self) -> Option<u128> {
        match self {
            Self::Human => Some(5),
            Self::Agent => Some(2),
            Self::Cluster => Some(20),
            Self::Contract => Some(10),
            Self::System => None,
        }
    }
}

/// Structural parse of a name into its category + primary-label length.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ParsedName {
    /// Category decided by structure.
    pub category: NameCategory,
    /// Length of the left-most (primary) label — the U-curve length input.
    pub primary_label_len: usize,
}

/// Error from the name-registry helpers.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum NameRegistryError {
    /// The name is empty or exceeds [`NAME_MAX_LEN`].
    #[error("name length is outside 1..={NAME_MAX_LEN}")]
    NameLength,
    /// A label is empty, mis-hyphenated, or has an invalid char.
    #[error("invalid label: {0}")]
    InvalidLabel(&'static str),
    /// The name does not end with `.mono`.
    #[error("name must end with .mono")]
    NotMono,
    /// An unrecognised structure / category anchor.
    #[error("unrecognised name structure")]
    Structure,
    /// `<x>.mono` collided with a structural reserve.
    #[error("name is a structural reserve")]
    StructuralReserve,
    /// Pricing was requested for a `system` name.
    #[error("system names are not registerable via this path")]
    SystemNotRegisterable,
    /// Primary label length is outside the priceable `1..=63` range.
    #[error("primary label length is outside the priceable 1..=63 range")]
    LengthNotPriceable,
    /// An owner address was not 20 bytes.
    #[error("address must be 20 bytes")]
    BadAddress,
}

/// Return the name-registry precompile address (`0x110E`) as lower-case hex.
#[must_use]
pub fn name_registry_address_hex() -> String {
    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for b in &NAME_REGISTRY_ADDRESS {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// 4-byte selector (`keccak256(sig)[..4]`).
#[must_use]
pub fn selector_for(sig: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sig.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// U-curve length multiplier ×10 (`validate.rs` `length_modifier_x10`).
/// `None` for a label length outside `1..=63`.
#[must_use]
pub fn name_length_modifier_x10(label_len: usize) -> Option<u128> {
    match label_len {
        1 => Some(1000),
        2 => Some(500),
        3 => Some(100),
        4 => Some(50),
        5 => Some(30),
        6..=12 => Some(10),
        13..=20 => Some(15),
        21..=32 => Some(30),
        33..=50 => Some(100),
        51..=63 => Some(500),
        _ => None,
    }
}

/// Structural parse of a `*.mono` name into `{ category, primary_label_len }`.
/// Does NOT enforce the forbidden-prefix list (the chain does).
///
/// # Errors
/// Returns a [`NameRegistryError`] on a structurally invalid name.
pub fn parse_name_category(name: &str) -> Result<ParsedName, NameRegistryError> {
    if name.is_empty() || name.len() > NAME_MAX_LEN {
        return Err(NameRegistryError::NameLength);
    }
    let parts: Vec<&str> = name.split('.').collect();
    if parts.iter().any(|p| p.is_empty()) {
        return Err(NameRegistryError::InvalidLabel("empty label"));
    }
    for label in &parts {
        validate_label(label)?;
    }
    if *parts.last().unwrap() != "mono" {
        return Err(NameRegistryError::NotMono);
    }
    let primary_label_len = parts[0].len();
    match parts.len() {
        2 => {
            if matches!(parts[0], "agent" | "cluster" | "contract" | "system") {
                return Err(NameRegistryError::StructuralReserve);
            }
            Ok(ParsedName {
                category: NameCategory::Human,
                primary_label_len,
            })
        }
        3 => {
            let category = match parts[1] {
                "cluster" => NameCategory::Cluster,
                "contract" => NameCategory::Contract,
                "system" => NameCategory::System,
                _ => return Err(NameRegistryError::Structure),
            };
            Ok(ParsedName {
                category,
                primary_label_len,
            })
        }
        4 => {
            if parts[1] != "agent" {
                return Err(NameRegistryError::Structure);
            }
            Ok(ParsedName {
                category: NameCategory::Agent,
                primary_label_len,
            })
        }
        _ => Err(NameRegistryError::Structure),
    }
}

/// U-curve registration cost in lythoshi (`ops.rs`
/// `registration_cost_lythoshi_with_unit`):
/// `base × modX10 × fee_unit / 10` (multiply-before-divide to match
/// the chain's integer arithmetic).
///
/// # Errors
/// - [`NameRegistryError::SystemNotRegisterable`] for a `system` name.
/// - [`NameRegistryError::LengthNotPriceable`] for a primary label length
///   outside `1..=63`.
pub fn name_registration_cost(
    category: NameCategory,
    primary_label_len: usize,
    fee_unit_lythoshi: u128,
) -> Result<u128, NameRegistryError> {
    let base = category
        .base_multiplier()
        .ok_or(NameRegistryError::SystemNotRegisterable)?;
    let mod_x10 =
        name_length_modifier_x10(primary_label_len).ok_or(NameRegistryError::LengthNotPriceable)?;
    Ok(base * mod_x10 * fee_unit_lythoshi / 10)
}

/// Encode `register(string,address)` calldata for `0x110E`.
///
/// For human/agent/contract names the precompile uses the CALLER as owner,
/// so `owner` is typically the zero address. Submit with `value` equal to
/// the [`name_registration_cost`].
#[must_use]
pub fn encode_name_register_call(name: &str, owner: [u8; 20]) -> Vec<u8> {
    encode_string_address_call(selector_for(SIG_REGISTER), name, owner)
}

/// Encode `proposeTransfer(string,address)` calldata for `0x110E`.
#[must_use]
pub fn encode_name_propose_transfer_call(name: &str, recipient: [u8; 20]) -> Vec<u8> {
    encode_string_address_call(selector_for(SIG_PROPOSE_TRANSFER), name, recipient)
}

/// Encode `acceptTransfer(string)` calldata for `0x110E`.
#[must_use]
pub fn encode_name_accept_transfer_call(name: &str) -> Vec<u8> {
    let name_bytes = name.as_bytes();
    let mut out = Vec::new();
    out.extend_from_slice(&selector_for(SIG_ACCEPT_TRANSFER));
    // Single head word → the string offset is 0x20.
    out.extend_from_slice(&u256_word_u128(0x20));
    out.extend_from_slice(&u256_word_u128(name_bytes.len() as u128));
    out.extend_from_slice(&pad_to_word(name_bytes));
    out
}

/// Format raw calldata as `0x...` hex.
#[must_use]
pub fn calldata_to_hex(calldata: &[u8]) -> String {
    let mut out = String::with_capacity(2 + calldata.len() * 2);
    out.push_str("0x");
    for b in calldata {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

// --- internals -------------------------------------------------------

fn encode_string_address_call(selector: [u8; 4], name: &str, address: [u8; 20]) -> Vec<u8> {
    let name_bytes = name.as_bytes();
    let mut out = Vec::new();
    out.extend_from_slice(&selector);
    // Two head words (string offset, address) → string tail starts at 0x40.
    out.extend_from_slice(&u256_word_u128(0x40));
    out.extend_from_slice(&address_word(address));
    out.extend_from_slice(&u256_word_u128(name_bytes.len() as u128));
    out.extend_from_slice(&pad_to_word(name_bytes));
    out
}

fn validate_label(label: &str) -> Result<(), NameRegistryError> {
    if label.len() < NAME_LABEL_MIN_LEN || label.len() > NAME_LABEL_MAX_LEN {
        return Err(NameRegistryError::InvalidLabel("length"));
    }
    if label.starts_with('-') || label.ends_with('-') {
        return Err(NameRegistryError::InvalidLabel("hyphen edge"));
    }
    if label.contains("--") {
        return Err(NameRegistryError::InvalidLabel("double hyphen"));
    }
    if !label
        .bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
    {
        return Err(NameRegistryError::InvalidLabel("charset"));
    }
    Ok(())
}

fn address_word(addr: [u8; 20]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[12..32].copy_from_slice(&addr);
    out
}

fn u256_word_u128(value: u128) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[16..32].copy_from_slice(&value.to_be_bytes());
    out
}

fn pad_to_word(bytes: &[u8]) -> Vec<u8> {
    let mut out = bytes.to_vec();
    let pad = (32 - (bytes.len() % 32)) % 32;
    out.extend(std::iter::repeat_n(0u8, pad));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn address_and_selectors_pinned() {
        assert_eq!(NAME_REGISTRY_ADDRESS, NAME_REGISTRY);
        assert_eq!(
            name_registry_address_hex(),
            "0x000000000000000000000000000000000000110e"
        );
        // Golden selectors cross-checked against the TS keccak helper.
        assert_eq!(calldata_to_hex(&selector_for(SIG_REGISTER)), "0x1e59c529");
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_PROPOSE_TRANSFER)),
            "0x3aa6c68b"
        );
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_ACCEPT_TRANSFER)),
            "0x6d136f62"
        );
    }

    #[test]
    fn encodes_register_like_ts_golden() {
        // Byte-exact golden produced by the TS encodeNameRegisterCall.
        assert_eq!(
            calldata_to_hex(&encode_name_register_call("alice.mono", [0u8; 20])),
            "0x1e59c5290000000000000000000000000000000000000000000000000000000000000040\
0000000000000000000000000000000000000000000000000000000000000000\
000000000000000000000000000000000000000000000000000000000000000a\
616c6963652e6d6f6e6f00000000000000000000000000000000000000000000"
        );
        assert_eq!(
            calldata_to_hex(&encode_name_register_call("alice.mono", [0x11; 20])),
            "0x1e59c5290000000000000000000000000000000000000000000000000000000000000040\
0000000000000000000000001111111111111111111111111111111111111111\
000000000000000000000000000000000000000000000000000000000000000a\
616c6963652e6d6f6e6f00000000000000000000000000000000000000000000"
        );
    }

    #[test]
    fn encodes_propose_and_accept_like_ts_golden() {
        assert_eq!(
            calldata_to_hex(&encode_name_propose_transfer_call("bob.mono", [0x11; 20])),
            "0x3aa6c68b0000000000000000000000000000000000000000000000000000000000000040\
0000000000000000000000001111111111111111111111111111111111111111\
0000000000000000000000000000000000000000000000000000000000000008\
626f622e6d6f6e6f000000000000000000000000000000000000000000000000"
        );
        assert_eq!(
            calldata_to_hex(&encode_name_accept_transfer_call("alice.mono")),
            "0x6d136f620000000000000000000000000000000000000000000000000000000000000020\
000000000000000000000000000000000000000000000000000000000000000a\
616c6963652e6d6f6e6f00000000000000000000000000000000000000000000"
        );
    }

    #[test]
    fn parses_categories() {
        assert_eq!(
            parse_name_category("alice.mono").unwrap(),
            ParsedName {
                category: NameCategory::Human,
                primary_label_len: 5
            }
        );
        assert_eq!(
            parse_name_category("ops.cluster.mono").unwrap().category,
            NameCategory::Cluster
        );
        assert_eq!(
            parse_name_category("vault.contract.mono").unwrap().category,
            NameCategory::Contract
        );
        assert_eq!(
            parse_name_category("bot.agent.alice.mono")
                .unwrap()
                .category,
            NameCategory::Agent
        );
        assert_eq!(
            parse_name_category("cluster.mono"),
            Err(NameRegistryError::StructuralReserve)
        );
        assert_eq!(
            parse_name_category("alice.eth"),
            Err(NameRegistryError::NotMono)
        );
        assert_eq!(
            parse_name_category("Alice.mono"),
            Err(NameRegistryError::InvalidLabel("charset"))
        );
    }

    #[test]
    fn prices_u_curve_like_ts_golden() {
        let unit = 1_000_000_000_000u128;
        // human, len 5: 5 * 30 * unit / 10.
        assert_eq!(
            name_registration_cost(NameCategory::Human, 5, unit).unwrap(),
            15_000_000_000_000
        );
        // cluster, len 3: 20 * 100 * unit / 10.
        assert_eq!(
            name_registration_cost(NameCategory::Cluster, 3, unit).unwrap(),
            200_000_000_000_000
        );
        assert_eq!(name_length_modifier_x10(1), Some(1000));
        assert_eq!(name_length_modifier_x10(6), Some(10));
        assert_eq!(name_length_modifier_x10(64), None);
        assert_eq!(
            name_registration_cost(NameCategory::System, 5, unit),
            Err(NameRegistryError::SystemNotRegisterable)
        );
    }
}
