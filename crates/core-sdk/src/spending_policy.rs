//! Spending-policy precompile ABI helpers.
//!
//! These builders mirror `mono-core/crates/agent-commerce/spending-policy`.

use sha3::{Digest, Keccak256};

use crate::address::{address_to_hex, hex_to_address, AddressError};
use crate::consts::precompile_addresses;

/// Domain tag signed by a sub-account for fresh policy claims.
pub const SET_POLICY_CLAIM_DOMAIN_TAG: &[u8] = b"lyth.spending-policy.claim.v1";

/// ML-DSA-65 public key byte length.
pub const ML_DSA_65_PUBLIC_KEY_LEN: usize = 1952;

/// ML-DSA-65 signature byte length.
pub const ML_DSA_65_SIGNATURE_LEN: usize = 3309;

/// `setPolicy(address,address,uint128,uint128,bytes32,bytes32)`.
pub const SIGHASH_SET_POLICY: &str = "setPolicy(address,address,uint128,uint128,bytes32,bytes32)";

/// `setPolicyClaim(address,address,uint128,uint128,bytes32,bytes32,bytes,bytes)`.
pub const SIGHASH_SET_POLICY_CLAIM: &str =
    "setPolicyClaim(address,address,uint128,uint128,bytes32,bytes32,bytes,bytes)";

/// `claimPolicyByAddress(address,address,uint128,uint128,bytes32,bytes32,bytes)`.
///
/// Fresh-claim path that reads the sub-account ML-DSA-65 pubkey from
/// pubkey-registry (`0x110D`) instead of carrying it in calldata. It
/// uses the same bound message as [`SIGHASH_SET_POLICY_CLAIM`], so a
/// wallet can sign once and submit either form.
pub const SIGHASH_CLAIM_POLICY_BY_ADDRESS: &str =
    "claimPolicyByAddress(address,address,uint128,uint128,bytes32,bytes32,bytes)";

/// `enable(address)`.
pub const SIGHASH_ENABLE: &str = "enable(address)";

/// `disable(address)`.
pub const SIGHASH_DISABLE: &str = "disable(address)";

/// `recordSpend(address,uint128)`.
pub const SIGHASH_RECORD_SPEND: &str = "recordSpend(address,uint128)";

/// Errors returned by spending-policy ABI helpers.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum SpendingPolicyError {
    /// Address parsing failed.
    #[error(transparent)]
    Address(#[from] AddressError),

    /// A bytes32 argument was not exactly 32 bytes.
    #[error("{name} must be exactly 32 bytes")]
    Bytes32Length {
        /// Argument name.
        name: &'static str,
    },

    /// Public key length does not match ML-DSA-65.
    #[error("sub_account_pubkey must be {expected} bytes, got {got}")]
    PublicKeyLength {
        /// Expected byte length.
        expected: usize,
        /// Supplied byte length.
        got: usize,
    },

    /// Signature length does not match ML-DSA-65.
    #[error("sub_account_sig must be {expected} bytes, got {got}")]
    SignatureLength {
        /// Expected byte length.
        expected: usize,
        /// Supplied byte length.
        got: usize,
    },
}

/// Spending-policy arguments shared by `setPolicy` and `setPolicyClaim`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpendingPolicyArgs {
    /// Sub-account being controlled.
    pub sub_account: [u8; 20],
    /// Principal allowed to manage the policy.
    pub principal: [u8; 20],
    /// Daily spend cap in wei.
    pub daily_cap_wei: u128,
    /// Per-transaction cap in wei.
    pub per_tx_cap_wei: u128,
    /// Allow-list Merkle root.
    pub allow_root: [u8; 32],
    /// Deny-list Merkle root.
    pub deny_root: [u8; 32],
}

impl SpendingPolicyArgs {
    /// Build arguments from hex address strings.
    ///
    /// # Errors
    /// Returns [`SpendingPolicyError`] if either address is malformed.
    pub fn from_hex_addresses(
        sub_account: &str,
        principal: &str,
        daily_cap_wei: u128,
        per_tx_cap_wei: u128,
        allow_root: [u8; 32],
        deny_root: [u8; 32],
    ) -> Result<Self, SpendingPolicyError> {
        Ok(Self {
            sub_account: hex_to_address(sub_account)?,
            principal: hex_to_address(principal)?,
            daily_cap_wei,
            per_tx_cap_wei,
            allow_root,
            deny_root,
        })
    }
}

/// Return the first four bytes of `keccak256(sighash)`.
#[must_use]
pub fn selector_for(sighash: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sighash.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Selector for `setPolicy`.
#[must_use]
pub fn selector_set_policy() -> [u8; 4] {
    selector_for(SIGHASH_SET_POLICY)
}

/// Selector for `setPolicyClaim`.
#[must_use]
pub fn selector_set_policy_claim() -> [u8; 4] {
    selector_for(SIGHASH_SET_POLICY_CLAIM)
}

/// Selector for `claimPolicyByAddress`.
#[must_use]
pub fn selector_claim_policy_by_address() -> [u8; 4] {
    selector_for(SIGHASH_CLAIM_POLICY_BY_ADDRESS)
}

/// Selector for `enable`.
#[must_use]
pub fn selector_enable() -> [u8; 4] {
    selector_for(SIGHASH_ENABLE)
}

/// Selector for `disable`.
#[must_use]
pub fn selector_disable() -> [u8; 4] {
    selector_for(SIGHASH_DISABLE)
}

/// Selector for `recordSpend`.
#[must_use]
pub fn selector_record_spend() -> [u8; 4] {
    selector_for(SIGHASH_RECORD_SPEND)
}

/// Compose the canonical message a sub-account signs for fresh policy claims.
#[must_use]
pub fn compose_claim_bound_message(
    chain_id: u64,
    precompile_addr: [u8; 20],
    args: &SpendingPolicyArgs,
    expected_policy_version: u64,
) -> Vec<u8> {
    let mut out = Vec::with_capacity(
        SET_POLICY_CLAIM_DOMAIN_TAG.len() + 8 + 20 + 20 + 20 + 16 + 16 + 32 + 32 + 8,
    );
    out.extend_from_slice(SET_POLICY_CLAIM_DOMAIN_TAG);
    out.extend_from_slice(&chain_id.to_be_bytes());
    out.extend_from_slice(&precompile_addr);
    out.extend_from_slice(&args.sub_account);
    out.extend_from_slice(&args.principal);
    out.extend_from_slice(&args.daily_cap_wei.to_be_bytes());
    out.extend_from_slice(&args.per_tx_cap_wei.to_be_bytes());
    out.extend_from_slice(&args.allow_root);
    out.extend_from_slice(&args.deny_root);
    out.extend_from_slice(&expected_policy_version.to_be_bytes());
    out
}

/// Compose the fresh-claim message using the canonical spending-policy slot.
#[must_use]
pub fn compose_default_claim_bound_message(chain_id: u64, args: &SpendingPolicyArgs) -> Vec<u8> {
    compose_claim_bound_message(chain_id, precompile_addresses::SPENDING_POLICY, args, 0)
}

/// Encode legacy `setPolicy` calldata. This is valid only for re-claims.
#[must_use]
pub fn encode_set_policy_calldata(args: &SpendingPolicyArgs) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 6 * 32);
    out.extend_from_slice(&selector_set_policy());
    encode_policy_words(&mut out, args);
    out
}

/// Encode `setPolicyClaim` calldata for fresh sub-account claims.
///
/// # Errors
/// Returns [`SpendingPolicyError`] if public key or signature lengths do
/// not match ML-DSA-65.
pub fn encode_set_policy_claim_calldata(
    args: &SpendingPolicyArgs,
    sub_account_pubkey: &[u8],
    sub_account_sig: &[u8],
) -> Result<Vec<u8>, SpendingPolicyError> {
    if sub_account_pubkey.len() != ML_DSA_65_PUBLIC_KEY_LEN {
        return Err(SpendingPolicyError::PublicKeyLength {
            expected: ML_DSA_65_PUBLIC_KEY_LEN,
            got: sub_account_pubkey.len(),
        });
    }
    if sub_account_sig.len() != ML_DSA_65_SIGNATURE_LEN {
        return Err(SpendingPolicyError::SignatureLength {
            expected: ML_DSA_65_SIGNATURE_LEN,
            got: sub_account_sig.len(),
        });
    }
    let mut out =
        Vec::with_capacity(4 + 6 * 32 + ML_DSA_65_PUBLIC_KEY_LEN + ML_DSA_65_SIGNATURE_LEN);
    out.extend_from_slice(&selector_set_policy_claim());
    encode_policy_words(&mut out, args);
    out.extend_from_slice(sub_account_pubkey);
    out.extend_from_slice(sub_account_sig);
    Ok(out)
}

/// Encode `claimPolicyByAddress` calldata for fresh sub-account claims.
///
/// This is the preferred fresh-claim path after the sub-account pubkey
/// has been registered in pubkey-registry (`0x110D`). It saves 1952
/// calldata bytes compared with [`encode_set_policy_claim_calldata`].
///
/// # Errors
/// Returns [`SpendingPolicyError`] if `sub_account_sig` is not ML-DSA-65
/// signature length.
pub fn encode_claim_policy_by_address_calldata(
    args: &SpendingPolicyArgs,
    sub_account_sig: &[u8],
) -> Result<Vec<u8>, SpendingPolicyError> {
    if sub_account_sig.len() != ML_DSA_65_SIGNATURE_LEN {
        return Err(SpendingPolicyError::SignatureLength {
            expected: ML_DSA_65_SIGNATURE_LEN,
            got: sub_account_sig.len(),
        });
    }
    let mut out = Vec::with_capacity(4 + 6 * 32 + ML_DSA_65_SIGNATURE_LEN);
    out.extend_from_slice(&selector_claim_policy_by_address());
    encode_policy_words(&mut out, args);
    out.extend_from_slice(sub_account_sig);
    Ok(out)
}

/// Encode `enable(sub_account)` calldata.
#[must_use]
pub fn encode_enable_calldata(sub_account: [u8; 20]) -> Vec<u8> {
    encode_single_address_call(selector_enable(), sub_account)
}

/// Encode `disable(sub_account)` calldata.
#[must_use]
pub fn encode_disable_calldata(sub_account: [u8; 20]) -> Vec<u8> {
    encode_single_address_call(selector_disable(), sub_account)
}

fn encode_policy_words(out: &mut Vec<u8>, args: &SpendingPolicyArgs) {
    encode_address_word(out, args.sub_account);
    encode_address_word(out, args.principal);
    encode_u128_word(out, args.daily_cap_wei);
    encode_u128_word(out, args.per_tx_cap_wei);
    out.extend_from_slice(&args.allow_root);
    out.extend_from_slice(&args.deny_root);
}

fn encode_single_address_call(selector: [u8; 4], address: [u8; 20]) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 32);
    out.extend_from_slice(&selector);
    encode_address_word(&mut out, address);
    out
}

fn encode_address_word(out: &mut Vec<u8>, address: [u8; 20]) {
    out.extend_from_slice(&[0u8; 12]);
    out.extend_from_slice(&address);
}

fn encode_u128_word(out: &mut Vec<u8>, value: u128) {
    out.extend_from_slice(&[0u8; 16]);
    out.extend_from_slice(&value.to_be_bytes());
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

/// Return the spending-policy precompile address as lower-case hex.
#[must_use]
pub fn spending_policy_address_hex() -> String {
    address_to_hex(precompile_addresses::SPENDING_POLICY)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args() -> SpendingPolicyArgs {
        SpendingPolicyArgs {
            sub_account: [0x11; 20],
            principal: [0x22; 20],
            daily_cap_wei: 100,
            per_tx_cap_wei: 7,
            allow_root: [0xAA; 32],
            deny_root: [0xBB; 32],
        }
    }

    #[test]
    fn selectors_match_mono_core() {
        assert_eq!(selector_set_policy(), [0xd6, 0xa5, 0x18, 0xb2]);
        assert_eq!(selector_set_policy_claim(), [0x08, 0xd7, 0x8f, 0x9c]);
        assert_eq!(selector_claim_policy_by_address(), [0xc2, 0x39, 0x7f, 0xe9]);
        assert_eq!(selector_enable(), [0x5b, 0xfa, 0x1b, 0x68]);
        assert_eq!(selector_disable(), [0xe6, 0xc0, 0x9e, 0xdf]);
        assert_eq!(selector_record_spend(), [0xdc, 0xa0, 0x42, 0x92]);
    }

    #[test]
    fn claim_message_has_canonical_shape() {
        let a = args();
        let msg = compose_claim_bound_message(69420, precompile_addresses::SPENDING_POLICY, &a, 0);
        assert_eq!(msg.len(), 201);
        assert_eq!(
            &msg[..SET_POLICY_CLAIM_DOMAIN_TAG.len()],
            SET_POLICY_CLAIM_DOMAIN_TAG
        );
        assert_eq!(
            &msg[SET_POLICY_CLAIM_DOMAIN_TAG.len()..SET_POLICY_CLAIM_DOMAIN_TAG.len() + 8],
            &69420_u64.to_be_bytes()
        );
    }

    #[test]
    fn set_policy_claim_calldata_has_canonical_length() {
        let pk = vec![0x33; ML_DSA_65_PUBLIC_KEY_LEN];
        let sig = vec![0x44; ML_DSA_65_SIGNATURE_LEN];
        let calldata = encode_set_policy_claim_calldata(&args(), &pk, &sig).unwrap();
        assert_eq!(calldata.len(), 5457);
        assert_eq!(&calldata[..4], &selector_set_policy_claim());
    }

    #[test]
    fn claim_policy_by_address_calldata_has_canonical_length() {
        let sig = vec![0x44; ML_DSA_65_SIGNATURE_LEN];
        let calldata = encode_claim_policy_by_address_calldata(&args(), &sig).unwrap();
        assert_eq!(calldata.len(), 3505);
        assert_eq!(&calldata[..4], &selector_claim_policy_by_address());
    }
}
