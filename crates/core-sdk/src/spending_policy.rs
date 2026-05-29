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

/// `setPolicy(address,address,uint128,uint128,bytes32,bytes32,uint128,uint128,bytes32,uint256,uint256)`.
///
/// WP §18.8 widened the word block from 6 to 11 words: the trailing 5
/// words carry the per-week cap, per-month cap, category allow-root,
/// packed time-of-day window, and explicit policy-expiry timestamp.
pub const SIGHASH_SET_POLICY: &str =
    "setPolicy(address,address,uint128,uint128,bytes32,bytes32,uint128,uint128,bytes32,uint256,uint256)";

/// `setPolicyClaim(address,address,uint128,uint128,bytes32,bytes32,uint128,uint128,bytes32,uint256,uint256,bytes,bytes)`.
pub const SIGHASH_SET_POLICY_CLAIM: &str =
    "setPolicyClaim(address,address,uint128,uint128,bytes32,bytes32,uint128,uint128,bytes32,uint256,uint256,bytes,bytes)";

/// `claimPolicyByAddress(address,address,uint128,uint128,bytes32,bytes32,uint128,uint128,bytes32,uint256,uint256,bytes)`.
///
/// Fresh-claim path that reads the sub-account ML-DSA-65 pubkey from
/// pubkey-registry (`0x110D`) instead of carrying it in calldata. It
/// uses the same bound message as [`SIGHASH_SET_POLICY_CLAIM`], so a
/// wallet can sign once and submit either form.
pub const SIGHASH_CLAIM_POLICY_BY_ADDRESS: &str =
    "claimPolicyByAddress(address,address,uint128,uint128,bytes32,bytes32,uint128,uint128,bytes32,uint256,uint256,bytes)";

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
///
/// WP §18.8 widened the policy word block from 6 to 11 words; the
/// trailing five fields (`weekly_cap_lythoshi`, `monthly_cap_lythoshi`,
/// `category_allow_root`, `time_window`, `policy_expiry`) are the
/// §18.8 dimensions. A zero value in any of them means "not configured"
/// (no weekly/monthly cap, no category allow-list, no time-of-day
/// window, never auto-expires) — matching the precompile's storage
/// sentinels.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpendingPolicyArgs {
    /// Sub-account being controlled.
    pub sub_account: [u8; 20],
    /// Principal allowed to manage the policy.
    pub principal: [u8; 20],
    /// Daily spend cap in lythoshi (wire word 2).
    pub daily_cap_lythoshi: u128,
    /// Per-transaction cap in lythoshi (wire word 3).
    pub per_tx_cap_lythoshi: u128,
    /// Allow-list Merkle root (wire word 4).
    pub allow_root: [u8; 32],
    /// Deny-list Merkle root (wire word 5).
    pub deny_root: [u8; 32],
    /// Per-week rolling cap in lythoshi (WP §18.8 wire code `0x07`). `0`
    /// = no weekly cap.
    pub weekly_cap_lythoshi: u128,
    /// Per-month rolling cap in lythoshi (WP §18.8 wire code `0x08`). `0`
    /// = no monthly cap.
    pub monthly_cap_lythoshi: u128,
    /// Per-category allow-list Merkle root (WP §18.8 wire code `0x09`).
    /// `Hash::ZERO` = no category constraint.
    pub category_allow_root: [u8; 32],
    /// Packed time-of-day window (WP §18.8 wire code `0x0A`). Build it
    /// with [`pack_time_window`]; a fully-zero word = no window
    /// (any hour allowed). Encoded as a `uint256`.
    pub time_window: [u8; 32],
    /// Explicit policy-expiry timestamp in unix seconds (WP §18.8 wire
    /// code `0x0B`). `0` = never auto-expires. Encoded as a `uint256`.
    pub policy_expiry: u64,
}

impl SpendingPolicyArgs {
    /// Build arguments from hex address strings.
    ///
    /// The WP §18.8 fields default to "not configured" — callers that
    /// need them set the struct fields directly or use
    /// [`SpendingPolicyArgs::with_dimensions`].
    ///
    /// # Errors
    /// Returns [`SpendingPolicyError`] if either address is malformed.
    pub fn from_hex_addresses(
        sub_account: &str,
        principal: &str,
        daily_cap_lythoshi: u128,
        per_tx_cap_lythoshi: u128,
        allow_root: [u8; 32],
        deny_root: [u8; 32],
    ) -> Result<Self, SpendingPolicyError> {
        Ok(Self {
            sub_account: hex_to_address(sub_account)?,
            principal: hex_to_address(principal)?,
            daily_cap_lythoshi,
            per_tx_cap_lythoshi,
            allow_root,
            deny_root,
            weekly_cap_lythoshi: 0,
            monthly_cap_lythoshi: 0,
            category_allow_root: [0u8; 32],
            time_window: [0u8; 32],
            policy_expiry: 0,
        })
    }

    /// Attach the WP §18.8 dimension fields (per-week cap, per-month cap,
    /// category allow-root, packed time-of-day window, policy-expiry) to
    /// an existing argument set.
    #[must_use]
    pub fn with_dimensions(
        mut self,
        weekly_cap_lythoshi: u128,
        monthly_cap_lythoshi: u128,
        category_allow_root: [u8; 32],
        time_window: [u8; 32],
        policy_expiry: u64,
    ) -> Self {
        self.weekly_cap_lythoshi = weekly_cap_lythoshi;
        self.monthly_cap_lythoshi = monthly_cap_lythoshi;
        self.category_allow_root = category_allow_root;
        self.time_window = time_window;
        self.policy_expiry = policy_expiry;
        self
    }
}

/// Pack a time-of-day window into the 32-byte `time_window` word.
///
/// Mirrors `spending-policy::storage::pack_time_window`: `start_hour` /
/// `end_hour` are clamped to `0..=23`; when `enabled` is `false` the
/// word is all-zero (the "no window configured" sentinel). Layout (low
/// 3 bytes of the big-endian word): byte at index 29 = enabled
/// sentinel (`0x01`), index 30 = `start_hour`, index 31 = `end_hour`.
#[must_use]
pub fn pack_time_window(enabled: bool, start_hour: u8, end_hour: u8) -> [u8; 32] {
    let mut out = [0u8; 32];
    if !enabled {
        return out;
    }
    out[29] = 0x01;
    out[30] = start_hour.min(23);
    out[31] = end_hour.min(23);
    out
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
        SET_POLICY_CLAIM_DOMAIN_TAG.len()
            + 8
            + 20
            + 20
            + 20
            + 16
            + 16
            + 32
            + 32
            + 16
            + 16
            + 32
            + 32
            + 8
            + 8,
    );
    out.extend_from_slice(SET_POLICY_CLAIM_DOMAIN_TAG);
    out.extend_from_slice(&chain_id.to_be_bytes());
    out.extend_from_slice(&precompile_addr);
    out.extend_from_slice(&args.sub_account);
    out.extend_from_slice(&args.principal);
    out.extend_from_slice(&args.daily_cap_lythoshi.to_be_bytes());
    out.extend_from_slice(&args.per_tx_cap_lythoshi.to_be_bytes());
    out.extend_from_slice(&args.allow_root);
    out.extend_from_slice(&args.deny_root);
    // WP §18.8 fields, in wire order: weekly cap (be16), monthly cap
    // (be16), category allow-root (32), packed time window (be32),
    // policy expiry (be8). These slot in before the trailing
    // expected-policy-version word.
    out.extend_from_slice(&args.weekly_cap_lythoshi.to_be_bytes());
    out.extend_from_slice(&args.monthly_cap_lythoshi.to_be_bytes());
    out.extend_from_slice(&args.category_allow_root);
    out.extend_from_slice(&args.time_window);
    out.extend_from_slice(&args.policy_expiry.to_be_bytes());
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
    let mut out = Vec::with_capacity(4 + 11 * 32);
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
        Vec::with_capacity(4 + 11 * 32 + ML_DSA_65_PUBLIC_KEY_LEN + ML_DSA_65_SIGNATURE_LEN);
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
    let mut out = Vec::with_capacity(4 + 11 * 32 + ML_DSA_65_SIGNATURE_LEN);
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
    encode_u128_word(out, args.daily_cap_lythoshi);
    encode_u128_word(out, args.per_tx_cap_lythoshi);
    out.extend_from_slice(&args.allow_root);
    out.extend_from_slice(&args.deny_root);
    // WP §18.8 trailing 5 words.
    encode_u128_word(out, args.weekly_cap_lythoshi);
    encode_u128_word(out, args.monthly_cap_lythoshi);
    out.extend_from_slice(&args.category_allow_root);
    // `time_window` is a packed uint256 word; `policy_expiry` is a
    // uint256 carrying a u64 unix-seconds value right-aligned.
    out.extend_from_slice(&args.time_window);
    encode_u64_word(out, args.policy_expiry);
}

fn encode_u64_word(out: &mut Vec<u8>, value: u64) {
    out.extend_from_slice(&[0u8; 24]);
    out.extend_from_slice(&value.to_be_bytes());
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
            daily_cap_lythoshi: 100,
            per_tx_cap_lythoshi: 7,
            allow_root: [0xAA; 32],
            deny_root: [0xBB; 32],
            weekly_cap_lythoshi: 500,
            monthly_cap_lythoshi: 2_000,
            category_allow_root: [0xCC; 32],
            time_window: pack_time_window(true, 9, 17),
            policy_expiry: 1_900_000_000,
        }
    }

    #[test]
    fn selectors_match_mono_core() {
        // WP §18.8 widened the setPolicy* sighash strings to 11 words,
        // so their selectors changed; enable/disable/recordSpend are
        // unchanged.
        assert_eq!(selector_set_policy(), [0x8d, 0xa1, 0xa7, 0x65]);
        assert_eq!(selector_set_policy_claim(), [0x35, 0x53, 0x1f, 0x6c]);
        assert_eq!(selector_claim_policy_by_address(), [0x0c, 0x21, 0x37, 0x6c]);
        assert_eq!(selector_enable(), [0x5b, 0xfa, 0x1b, 0x68]);
        assert_eq!(selector_disable(), [0xe6, 0xc0, 0x9e, 0xdf]);
        assert_eq!(selector_record_spend(), [0xdc, 0xa0, 0x42, 0x92]);
    }

    #[test]
    fn claim_message_has_canonical_shape() {
        let a = args();
        let msg = compose_claim_bound_message(69420, precompile_addresses::SPENDING_POLICY, &a, 0);
        // domain(29) + chain_id(8) + precompile(20) + sub(20) + principal(20)
        // + daily(16) + per_tx(16) + allow(32) + deny(32) + weekly(16)
        // + monthly(16) + category(32) + time_window(32) + expiry(8)
        // + expected_version(8) = 305.
        assert_eq!(msg.len(), 305);
        assert_eq!(
            &msg[..SET_POLICY_CLAIM_DOMAIN_TAG.len()],
            SET_POLICY_CLAIM_DOMAIN_TAG
        );
        assert_eq!(
            &msg[SET_POLICY_CLAIM_DOMAIN_TAG.len()..SET_POLICY_CLAIM_DOMAIN_TAG.len() + 8],
            &69420_u64.to_be_bytes()
        );
        // The trailing two words are policy_expiry (be8 in a be8 slot)
        // and expected_policy_version (be8). The expiry sits at
        // bytes [289..297), the version at [297..305).
        assert_eq!(&msg[289..297], &1_900_000_000_u64.to_be_bytes());
        assert_eq!(&msg[297..305], &0_u64.to_be_bytes());
    }

    #[test]
    fn set_policy_calldata_has_canonical_length() {
        // WP §18.8 widened the word block to 11 words → 4 + 11*32 = 356.
        let calldata = encode_set_policy_calldata(&args());
        assert_eq!(calldata.len(), 356);
        assert_eq!(&calldata[..4], &selector_set_policy());
    }

    #[test]
    fn set_policy_claim_calldata_has_canonical_length() {
        let pk = vec![0x33; ML_DSA_65_PUBLIC_KEY_LEN];
        let sig = vec![0x44; ML_DSA_65_SIGNATURE_LEN];
        let calldata = encode_set_policy_claim_calldata(&args(), &pk, &sig).unwrap();
        // 4 + 11*32 + 1952 + 3309 = 5617.
        assert_eq!(calldata.len(), 5617);
        assert_eq!(&calldata[..4], &selector_set_policy_claim());
    }

    #[test]
    fn claim_policy_by_address_calldata_has_canonical_length() {
        let sig = vec![0x44; ML_DSA_65_SIGNATURE_LEN];
        let calldata = encode_claim_policy_by_address_calldata(&args(), &sig).unwrap();
        // 4 + 11*32 + 3309 = 3665.
        assert_eq!(calldata.len(), 3665);
        assert_eq!(&calldata[..4], &selector_claim_policy_by_address());
    }

    #[test]
    fn pack_time_window_matches_mono_core_layout() {
        let w = pack_time_window(true, 9, 17);
        assert_eq!(w[29], 0x01);
        assert_eq!(w[30], 9);
        assert_eq!(w[31], 17);
        // Disabled → all-zero sentinel.
        assert_eq!(pack_time_window(false, 9, 17), [0u8; 32]);
        // Hours clamp to 0..=23.
        let clamped = pack_time_window(true, 99, 200);
        assert_eq!(clamped[30], 23);
        assert_eq!(clamped[31], 23);
    }
}
