//! Delegation precompile ABI helpers.
//!
//! These builders mirror `mono-core/crates/precompiles/system/delegation`.
//! The V4.1 redemption completion helper only prunes a matured queue
//! ticket today; principal payout still depends on the chain adding a
//! stake-vault/redemption-escrow accounting primitive.

use sha3::{Digest, Keccak256};

use crate::consts::precompile_addresses;

/// `completeRedemption(uint64)`.
pub const SIGHASH_COMPLETE_REDEMPTION: &str = "completeRedemption(uint64)";

/// Delegation precompile revert namespace byte.
pub const DELEGATION_REVERT_NAMESPACE: u8 = 0x02;

/// Stable revert payload for a full wallet redemption queue.
pub const REVERT_REDEMPTION_QUEUE_FULL: [u8; 2] = [DELEGATION_REVERT_NAMESPACE, 0x0E];

/// Stable revert payload for a missing redemption ticket.
pub const REVERT_REDEMPTION_TICKET_NOT_FOUND: [u8; 2] = [DELEGATION_REVERT_NAMESPACE, 0x0F];

/// Stable revert payload for a redemption ticket that has not reached
/// its maturity height.
pub const REVERT_REDEMPTION_NOT_MATURE: [u8; 2] = [DELEGATION_REVERT_NAMESPACE, 0x10];

/// Stable revert payload for the current fail-closed principal boundary.
pub const REVERT_REDEMPTION_PRINCIPAL_UNAVAILABLE: [u8; 2] = [DELEGATION_REVERT_NAMESPACE, 0x11];

/// Return true when a revert payload is the current fail-closed
/// redemption-principal boundary.
#[must_use]
pub fn is_redemption_principal_unavailable_revert(data: &[u8]) -> bool {
    data == REVERT_REDEMPTION_PRINCIPAL_UNAVAILABLE
}

/// Return the first four bytes of `keccak256(sighash)`.
#[must_use]
pub fn selector_for(sighash: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sighash.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Selector for `completeRedemption(uint64)`.
#[must_use]
pub fn selector_complete_redemption() -> [u8; 4] {
    selector_for(SIGHASH_COMPLETE_REDEMPTION)
}

/// Encode `completeRedemption(uint64)` calldata.
#[must_use]
pub fn encode_complete_redemption_calldata(index: u64) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 32);
    out.extend_from_slice(&selector_complete_redemption());
    encode_u256_word(&mut out, index);
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

/// Encode `completeRedemption(uint64)` calldata as lower-case hex.
#[must_use]
pub fn encode_complete_redemption_calldata_hex(index: u64) -> String {
    calldata_to_hex(&encode_complete_redemption_calldata(index))
}

/// Return the delegation precompile address as lower-case hex.
#[must_use]
pub fn delegation_address_hex() -> String {
    crate::address::address_to_hex(precompile_addresses::DELEGATION)
}

fn encode_u256_word(out: &mut Vec<u8>, value: u64) {
    out.extend_from_slice(&[0u8; 24]);
    out.extend_from_slice(&value.to_be_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selector_matches_mono_core() {
        assert_eq!(selector_complete_redemption(), [0x26, 0x16, 0x9d, 0x0a]);
    }

    #[test]
    fn redemption_revert_tags_match_mono_core() {
        assert_eq!(REVERT_REDEMPTION_QUEUE_FULL, [0x02, 0x0E]);
        assert_eq!(REVERT_REDEMPTION_TICKET_NOT_FOUND, [0x02, 0x0F]);
        assert_eq!(REVERT_REDEMPTION_NOT_MATURE, [0x02, 0x10]);
        assert_eq!(REVERT_REDEMPTION_PRINCIPAL_UNAVAILABLE, [0x02, 0x11]);
        assert!(is_redemption_principal_unavailable_revert(&[0x02, 0x11]));
        assert!(!is_redemption_principal_unavailable_revert(&[0x02, 0x10]));
    }

    #[test]
    fn complete_redemption_calldata_has_canonical_layout() {
        let calldata = encode_complete_redemption_calldata(42);
        assert_eq!(calldata.len(), 36);
        assert_eq!(&calldata[..4], &selector_complete_redemption());
        assert_eq!(&calldata[4..28], &[0u8; 24]);
        assert_eq!(&calldata[28..36], &42_u64.to_be_bytes());
        assert_eq!(
            encode_complete_redemption_calldata_hex(42),
            "0x26169d0a000000000000000000000000000000000000000000000000000000000000002a"
        );
    }

    #[test]
    fn delegation_address_is_canonical() {
        assert_eq!(
            delegation_address_hex(),
            "0x000000000000000000000000000000000000100a"
        );
    }
}
