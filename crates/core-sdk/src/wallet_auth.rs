//! Generic, domain-bound wallet authentication.
//!
//! The V1 contract is intentionally application-neutral. It fixes canonical
//! challenge/proof JSON and an ML-DSA-65 verification boundary; applications
//! own nonce consumption and session policy, while wallets own approval UX and
//! binding to the actual caller origin and active network.

use fips204::ml_dsa_65;
use fips204::traits::{SerDes, Verifier};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use thiserror::Error;
use url::Url;

use crate::address::{address_to_bech32, typed_bech32_to_address_kind, AddressKind};

/// Literal challenge version.
pub const WALLET_AUTH_CHALLENGE_VERSION: &str = "1";
/// Literal proof algorithm.
pub const WALLET_AUTH_ALGORITHM: &str = "ml-dsa-65";
/// Prefix prepended to canonical challenge JSON before Keccak-256.
pub const WALLET_AUTH_SIGNING_PREFIX: &[u8] = b"monolythium.wallet-auth.v1\0";
/// Challenge nonce width before unpadded base64url encoding.
pub const WALLET_AUTH_NONCE_BYTES: usize = 32;
/// Maximum number of requested scopes.
pub const WALLET_AUTH_MAX_SCOPES: usize = 16;
/// Maximum ASCII bytes in one scope.
pub const WALLET_AUTH_MAX_SCOPE_BYTES: usize = 128;
/// Maximum challenge lifetime.
pub const WALLET_AUTH_MAX_TTL_SECONDS: u64 = 180;
/// Maximum clock tolerance accepted by the full verifier.
pub const WALLET_AUTH_MAX_CLOCK_SKEW_SECONDS: u64 = 30;
/// Maximum ASCII bytes in a challenge domain/host.
pub const WALLET_AUTH_MAX_DOMAIN_BYTES: usize = 512;
/// Maximum ASCII bytes in a challenge origin.
pub const WALLET_AUTH_MAX_ORIGIN_BYTES: usize = 528;
/// Maximum ASCII bytes in a challenge URI.
pub const WALLET_AUTH_MAX_URI_BYTES: usize = 529;
/// Maximum ASCII bytes in a typed user address.
pub const WALLET_AUTH_MAX_ADDRESS_BYTES: usize = 128;
/// Maximum accepted encoded challenge JSON size.
pub const WALLET_AUTH_MAX_CHALLENGE_JSON_BYTES: usize = 8_192;
/// Maximum accepted encoded proof JSON size.
pub const WALLET_AUTH_MAX_PROOF_JSON_BYTES: usize = 24_576;

const ML_DSA_65_ADDRESS_DOMAIN: &[u8] = b"MONO_ADDRESS_BLAKE3_20_V1";
const ML_DSA_65_ALGORITHM_ID: u16 = 1001;
const MAX_U256_DECIMAL: &str =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";

/// Exact signed V1 challenge. Field declaration order is wire-significant for
/// canonical JSON serialization.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct WalletAuthChallengeV1 {
    /// Must be [`WALLET_AUTH_CHALLENGE_VERSION`].
    pub version: String,
    /// Canonical URL host, including a non-default port.
    pub domain: String,
    /// Canonical HTTP(S) URL origin without a trailing slash.
    pub origin: String,
    /// Canonical origin root (`origin + "/"`).
    pub uri: String,
    /// Canonical typed user address (`mono1…`).
    pub address: String,
    /// Unsigned canonical decimal uint256 string.
    pub chain_id: String,
    /// Lowercase `0x`-prefixed 32-byte genesis hash.
    pub genesis_hash: String,
    /// Unpadded base64url encoding of exactly 32 random bytes.
    pub nonce: String,
    /// Canonical UTC ISO timestamp with exactly three fractional digits.
    pub issued_at: String,
    /// Canonical UTC ISO timestamp with exactly three fractional digits.
    pub expiration_time: String,
    /// Sorted, unique ASCII scope tokens.
    pub scopes: Vec<String>,
}

/// Self-contained ML-DSA-65 proof. Field declaration order is wire-significant
/// for canonical JSON serialization.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct WalletAuthProofV1 {
    /// Exact signed challenge.
    pub challenge: WalletAuthChallengeV1,
    /// Must be [`WALLET_AUTH_ALGORITHM`].
    pub algorithm: String,
    /// Lowercase `0x`-prefixed ML-DSA-65 public key.
    pub public_key: String,
    /// Lowercase `0x`-prefixed ML-DSA-65 signature.
    pub signature: String,
}

/// Errors at the wallet-authentication trust boundary.
#[derive(Debug, Error)]
pub enum WalletAuthError {
    /// JSON could not be decoded or encoded.
    #[error("invalid wallet-auth JSON: {0}")]
    Json(#[from] serde_json::Error),
    /// UTF-8 decoding failed.
    #[error("wallet-auth JSON must be UTF-8")]
    Utf8,
    /// A field failed strict validation.
    #[error("invalid {field}: {reason}")]
    InvalidField {
        /// Field name.
        field: &'static str,
        /// Stable human-readable reason.
        reason: &'static str,
    },
    /// Raw JSON was semantically valid but not byte-canonical.
    #[error("wallet-auth JSON is not canonical")]
    NonCanonicalEncoding,
    /// Proof key derives a different address than the signed challenge.
    #[error("challenge address does not match proof public key")]
    AddressMismatch,
    /// Public-key bytes do not decode as ML-DSA-65.
    #[error("proof public key is not a valid ML-DSA-65 key")]
    InvalidPublicKey,
    /// Signature did not verify.
    #[error("wallet authentication signature is invalid")]
    InvalidSignature,
    /// Challenge validity window has not started.
    #[error("wallet authentication challenge is not yet valid")]
    NotYetValid,
    /// Challenge validity window has ended.
    #[error("wallet authentication challenge has expired")]
    Expired,
}

fn invalid(field: &'static str, reason: &'static str) -> WalletAuthError {
    WalletAuthError::InvalidField { field, reason }
}

fn require_bounded_ascii(
    value: &str,
    field: &'static str,
    max_bytes: usize,
) -> Result<(), WalletAuthError> {
    if value.len() > max_bytes {
        return Err(invalid(field, "is too long"));
    }
    if !value.is_ascii() {
        return Err(invalid(field, "must contain ASCII only"));
    }
    Ok(())
}

fn is_scope_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'/' | b'-')
}

fn validate_scopes(scopes: &[String]) -> Result<(), WalletAuthError> {
    if scopes.is_empty() || scopes.len() > WALLET_AUTH_MAX_SCOPES {
        return Err(invalid("scopes", "must contain 1..16 entries"));
    }
    for scope in scopes {
        if scope.is_empty()
            || scope.len() > WALLET_AUTH_MAX_SCOPE_BYTES
            || !scope.as_bytes().iter().copied().all(is_scope_byte)
        {
            return Err(invalid(
                "scopes",
                "entries must be 1..128 byte ASCII scope tokens",
            ));
        }
    }
    if scopes.windows(2).any(|pair| pair[0] >= pair[1]) {
        return Err(invalid(
            "scopes",
            "must be sorted by ASCII byte order without duplicates",
        ));
    }
    Ok(())
}

fn validate_url_binding(challenge: &WalletAuthChallengeV1) -> Result<(), WalletAuthError> {
    let parsed = Url::parse(&challenge.origin)
        .map_err(|_| invalid("origin", "must be an absolute HTTP(S) URL origin"))?;
    if !matches!(parsed.scheme(), "http" | "https")
        || !parsed.username().is_empty()
        || parsed.password().is_some()
    {
        return Err(invalid(
            "origin",
            "must be an HTTP(S) origin without credentials",
        ));
    }
    let canonical_origin = parsed.origin().ascii_serialization();
    let Some((_, canonical_domain)) = canonical_origin.split_once("://") else {
        return Err(invalid("origin", "must have a tuple origin"));
    };
    if challenge.origin != canonical_origin
        || challenge.domain != canonical_domain
        || challenge.uri != format!("{canonical_origin}/")
    {
        return Err(invalid(
            "origin",
            "domain, origin, and uri must be canonical host, origin, and origin root",
        ));
    }
    Ok(())
}

fn validate_chain_id(value: &str) -> bool {
    if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return false;
    }
    if value.len() > 1 && value.starts_with('0') {
        return false;
    }
    value.len() < MAX_U256_DECIMAL.len()
        || (value.len() == MAX_U256_DECIMAL.len() && value <= MAX_U256_DECIMAL)
}

fn is_lower_hex(value: &str, bytes: usize) -> bool {
    value.len() == 2 + bytes * 2
        && value.starts_with("0x")
        && value[2..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn base64url_index(byte: u8) -> Option<u8> {
    match byte {
        b'A'..=b'Z' => Some(byte - b'A'),
        b'a'..=b'z' => Some(byte - b'a' + 26),
        b'0'..=b'9' => Some(byte - b'0' + 52),
        b'-' => Some(62),
        b'_' => Some(63),
        _ => None,
    }
}

fn validate_nonce(value: &str) -> bool {
    value.len() == 43
        && value.bytes().all(|byte| base64url_index(byte).is_some())
        && value
            .as_bytes()
            .last()
            .and_then(|byte| base64url_index(*byte))
            .is_some_and(|index| index % 4 == 0)
}

fn parse_two(bytes: &[u8], offset: usize) -> Option<u32> {
    let a = *bytes.get(offset)?;
    let b = *bytes.get(offset + 1)?;
    if !a.is_ascii_digit() || !b.is_ascii_digit() {
        return None;
    }
    Some(u32::from(a - b'0') * 10 + u32::from(b - b'0'))
}

fn parse_four(bytes: &[u8], offset: usize) -> Option<i64> {
    let mut out = 0i64;
    for index in offset..offset + 4 {
        let byte = *bytes.get(index)?;
        if !byte.is_ascii_digit() {
            return None;
        }
        out = out * 10 + i64::from(byte - b'0');
    }
    Some(out)
}

fn is_leap_year(year: i64) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn days_in_month(year: i64, month: u32) -> Option<u32> {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => Some(31),
        4 | 6 | 9 | 11 => Some(30),
        2 if is_leap_year(year) => Some(29),
        2 => Some(28),
        _ => None,
    }
}

// Howard Hinnant's civil-date conversion, shifted to Unix epoch days.
fn days_since_unix_epoch(year: i64, month: u32, day: u32) -> i64 {
    let adjusted_year = year - i64::from(month <= 2);
    let era = adjusted_year.div_euclid(400);
    let year_of_era = adjusted_year - era * 400;
    let shifted_month = i64::from(month) + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * shifted_month + 2) / 5 + i64::from(day) - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn parse_canonical_timestamp(value: &str, field: &'static str) -> Result<u64, WalletAuthError> {
    let bytes = value.as_bytes();
    if bytes.len() != 24
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes[19] != b'.'
        || bytes[23] != b'Z'
    {
        return Err(invalid(
            field,
            "must be UTC ISO 8601 with exactly millisecond precision",
        ));
    }
    let year = parse_four(bytes, 0).ok_or_else(|| invalid(field, "invalid year"))?;
    let month = parse_two(bytes, 5).ok_or_else(|| invalid(field, "invalid month"))?;
    let day = parse_two(bytes, 8).ok_or_else(|| invalid(field, "invalid day"))?;
    let hour = parse_two(bytes, 11).ok_or_else(|| invalid(field, "invalid hour"))?;
    let minute = parse_two(bytes, 14).ok_or_else(|| invalid(field, "invalid minute"))?;
    let second = parse_two(bytes, 17).ok_or_else(|| invalid(field, "invalid second"))?;
    let millisecond = parse_four(&[b'0', bytes[20], bytes[21], bytes[22]], 0)
        .ok_or_else(|| invalid(field, "invalid millisecond"))?;
    let Some(max_day) = days_in_month(year, month) else {
        return Err(invalid(field, "invalid month"));
    };
    if !(1970..=9999).contains(&year)
        || day == 0
        || day > max_day
        || hour > 23
        || minute > 59
        || second > 59
    {
        return Err(invalid(field, "invalid canonical UTC timestamp"));
    }
    let seconds = days_since_unix_epoch(year, month, day) * 86_400
        + i64::from(hour) * 3_600
        + i64::from(minute) * 60
        + i64::from(second);
    let millis = seconds
        .checked_mul(1_000)
        .and_then(|value| value.checked_add(millisecond))
        .ok_or_else(|| invalid(field, "timestamp out of range"))?;
    u64::try_from(millis).map_err(|_| invalid(field, "timestamp predates Unix epoch"))
}

/// Strictly validate a V1 challenge without changing any field.
pub fn validate_wallet_auth_challenge_v1(
    challenge: &WalletAuthChallengeV1,
) -> Result<(), WalletAuthError> {
    require_bounded_ascii(
        &challenge.version,
        "version",
        WALLET_AUTH_CHALLENGE_VERSION.len(),
    )?;
    require_bounded_ascii(&challenge.domain, "domain", WALLET_AUTH_MAX_DOMAIN_BYTES)?;
    require_bounded_ascii(&challenge.origin, "origin", WALLET_AUTH_MAX_ORIGIN_BYTES)?;
    require_bounded_ascii(&challenge.uri, "uri", WALLET_AUTH_MAX_URI_BYTES)?;
    require_bounded_ascii(&challenge.address, "address", WALLET_AUTH_MAX_ADDRESS_BYTES)?;
    require_bounded_ascii(&challenge.chain_id, "chainId", MAX_U256_DECIMAL.len())?;
    require_bounded_ascii(&challenge.genesis_hash, "genesisHash", 66)?;
    require_bounded_ascii(&challenge.nonce, "nonce", 43)?;
    require_bounded_ascii(&challenge.issued_at, "issuedAt", 24)?;
    require_bounded_ascii(&challenge.expiration_time, "expirationTime", 24)?;
    if challenge.version != WALLET_AUTH_CHALLENGE_VERSION {
        return Err(invalid("version", "must be '1'"));
    }
    validate_url_binding(challenge)?;

    let address = typed_bech32_to_address_kind(&challenge.address, AddressKind::User)
        .map_err(|_| invalid("address", "must be a typed mono1 bech32m address"))?;
    if address_to_bech32(address) != challenge.address {
        return Err(invalid("address", "must be canonical lower-case bech32m"));
    }
    if !validate_chain_id(&challenge.chain_id) {
        return Err(invalid(
            "chainId",
            "must be an unsigned canonical uint256 decimal string",
        ));
    }
    if !is_lower_hex(&challenge.genesis_hash, 32) {
        return Err(invalid(
            "genesisHash",
            "must be 0x-prefixed lowercase 32-byte hex",
        ));
    }
    if !validate_nonce(&challenge.nonce) {
        return Err(invalid(
            "nonce",
            "must be unpadded base64url encoding of exactly 32 bytes",
        ));
    }
    let issued = parse_canonical_timestamp(&challenge.issued_at, "issuedAt")?;
    let expiration = parse_canonical_timestamp(&challenge.expiration_time, "expirationTime")?;
    if expiration <= issued {
        return Err(invalid("expirationTime", "must be later than issuedAt"));
    }
    if expiration - issued > WALLET_AUTH_MAX_TTL_SECONDS * 1_000 {
        return Err(invalid(
            "expirationTime",
            "challenge lifetime must not exceed 180 seconds",
        ));
    }
    validate_scopes(&challenge.scopes)
}

/// Return canonical no-whitespace challenge JSON in the locked field order.
pub fn canonical_wallet_auth_challenge_json_v1(
    challenge: &WalletAuthChallengeV1,
) -> Result<String, WalletAuthError> {
    validate_wallet_auth_challenge_v1(challenge)?;
    Ok(serde_json::to_string(challenge)?)
}

/// Return canonical challenge JSON bytes without the signing prefix.
pub fn encode_wallet_auth_challenge_v1(
    challenge: &WalletAuthChallengeV1,
) -> Result<Vec<u8>, WalletAuthError> {
    Ok(canonical_wallet_auth_challenge_json_v1(challenge)?.into_bytes())
}

/// Decode only byte-canonical challenge JSON.
pub fn decode_wallet_auth_challenge_v1(
    encoded: &[u8],
) -> Result<WalletAuthChallengeV1, WalletAuthError> {
    if encoded.len() > WALLET_AUTH_MAX_CHALLENGE_JSON_BYTES {
        return Err(invalid("challenge", "JSON is too large"));
    }
    let text = std::str::from_utf8(encoded).map_err(|_| WalletAuthError::Utf8)?;
    let challenge: WalletAuthChallengeV1 = serde_json::from_str(text)?;
    if canonical_wallet_auth_challenge_json_v1(&challenge)?.as_bytes() != encoded {
        return Err(WalletAuthError::NonCanonicalEncoding);
    }
    Ok(challenge)
}

/// Prefix + canonical JSON: the exact application-level signing preimage.
pub fn wallet_auth_challenge_signing_preimage_v1(
    challenge: &WalletAuthChallengeV1,
) -> Result<Vec<u8>, WalletAuthError> {
    let encoded = encode_wallet_auth_challenge_v1(challenge)?;
    let mut preimage = Vec::with_capacity(WALLET_AUTH_SIGNING_PREFIX.len() + encoded.len());
    preimage.extend_from_slice(WALLET_AUTH_SIGNING_PREFIX);
    preimage.extend_from_slice(&encoded);
    Ok(preimage)
}

/// Keccak-256 digest signed as the ML-DSA-65 prehash message.
pub fn wallet_auth_challenge_digest_v1(
    challenge: &WalletAuthChallengeV1,
) -> Result<[u8; 32], WalletAuthError> {
    let digest = Keccak256::digest(wallet_auth_challenge_signing_preimage_v1(challenge)?);
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    Ok(out)
}

fn decode_lower_hex<const N: usize>(
    value: &str,
    field: &'static str,
) -> Result<[u8; N], WalletAuthError> {
    if !is_lower_hex(value, N) {
        return Err(invalid(
            field,
            "must be canonical lowercase fixed-width hex",
        ));
    }
    let mut out = [0u8; N];
    for (index, slot) in out.iter_mut().enumerate() {
        let offset = 2 + index * 2;
        *slot = u8::from_str_radix(&value[offset..offset + 2], 16)
            .map_err(|_| invalid(field, "contains invalid hex"))?;
    }
    Ok(out)
}

fn ml_dsa65_address(public_key: &[u8; ml_dsa_65::PK_LEN]) -> [u8; 20] {
    let mut hasher = blake3::Hasher::new();
    hasher.update(ML_DSA_65_ADDRESS_DOMAIN);
    hasher.update(&ML_DSA_65_ALGORITHM_ID.to_be_bytes());
    hasher.update(public_key);
    let mut address = [0u8; 20];
    address.copy_from_slice(&hasher.finalize().as_bytes()[..20]);
    address
}

/// Strictly validate proof framing and its nested challenge.
pub fn validate_wallet_auth_proof_v1(proof: &WalletAuthProofV1) -> Result<(), WalletAuthError> {
    validate_wallet_auth_challenge_v1(&proof.challenge)?;
    require_bounded_ascii(&proof.algorithm, "algorithm", WALLET_AUTH_ALGORITHM.len())?;
    require_bounded_ascii(&proof.public_key, "publicKey", 2 + ml_dsa_65::PK_LEN * 2)?;
    require_bounded_ascii(&proof.signature, "signature", 2 + ml_dsa_65::SIG_LEN * 2)?;
    if proof.algorithm != WALLET_AUTH_ALGORITHM {
        return Err(invalid("algorithm", "must be 'ml-dsa-65'"));
    }
    if !is_lower_hex(&proof.public_key, ml_dsa_65::PK_LEN) {
        return Err(invalid(
            "publicKey",
            "must be lowercase 0x hex for exactly 1952 bytes",
        ));
    }
    if !is_lower_hex(&proof.signature, ml_dsa_65::SIG_LEN) {
        return Err(invalid(
            "signature",
            "must be lowercase 0x hex for exactly 3309 bytes",
        ));
    }
    Ok(())
}

/// Return canonical no-whitespace proof JSON in the locked field order.
pub fn canonical_wallet_auth_proof_json_v1(
    proof: &WalletAuthProofV1,
) -> Result<String, WalletAuthError> {
    validate_wallet_auth_proof_v1(proof)?;
    Ok(serde_json::to_string(proof)?)
}

/// Return canonical proof JSON bytes.
pub fn encode_wallet_auth_proof_v1(proof: &WalletAuthProofV1) -> Result<Vec<u8>, WalletAuthError> {
    Ok(canonical_wallet_auth_proof_json_v1(proof)?.into_bytes())
}

/// Decode only byte-canonical proof JSON.
pub fn decode_wallet_auth_proof_v1(encoded: &[u8]) -> Result<WalletAuthProofV1, WalletAuthError> {
    if encoded.len() > WALLET_AUTH_MAX_PROOF_JSON_BYTES {
        return Err(invalid("proof", "JSON is too large"));
    }
    let text = std::str::from_utf8(encoded).map_err(|_| WalletAuthError::Utf8)?;
    let proof: WalletAuthProofV1 = serde_json::from_str(text)?;
    if canonical_wallet_auth_proof_json_v1(&proof)?.as_bytes() != encoded {
        return Err(WalletAuthError::NonCanonicalEncoding);
    }
    Ok(proof)
}

/// Verify structure, key-derived address, and the ML-DSA-65 signature.
///
/// This intentionally checks address binding before the more expensive
/// signature verification. Use [`verify_wallet_auth_proof_v1_at`] at a server
/// boundary to enforce freshness as well.
pub fn verify_wallet_auth_proof_signature_v1(
    proof: &WalletAuthProofV1,
) -> Result<(), WalletAuthError> {
    validate_wallet_auth_proof_v1(proof)?;
    let public_key_bytes =
        decode_lower_hex::<{ ml_dsa_65::PK_LEN }>(&proof.public_key, "publicKey")?;
    let derived_address = address_to_bech32(ml_dsa65_address(&public_key_bytes));
    if derived_address != proof.challenge.address {
        return Err(WalletAuthError::AddressMismatch);
    }
    let signature = decode_lower_hex::<{ ml_dsa_65::SIG_LEN }>(&proof.signature, "signature")?;
    let public_key = ml_dsa_65::PublicKey::try_from_bytes(public_key_bytes)
        .map_err(|_| WalletAuthError::InvalidPublicKey)?;
    let digest = wallet_auth_challenge_digest_v1(&proof.challenge)?;
    if !public_key.verify(&digest, &signature, &[]) {
        return Err(WalletAuthError::InvalidSignature);
    }
    Ok(())
}

/// Verify the proof and its validity window at an explicit Unix-millisecond
/// instant. `clock_skew_seconds` is applied at both boundaries.
pub fn verify_wallet_auth_proof_v1_at(
    proof: &WalletAuthProofV1,
    now_unix_millis: u64,
    clock_skew_seconds: u64,
) -> Result<(), WalletAuthError> {
    if clock_skew_seconds > WALLET_AUTH_MAX_CLOCK_SKEW_SECONDS {
        return Err(invalid("clockSkewSeconds", "must be between 0 and 30"));
    }
    validate_wallet_auth_proof_v1(proof)?;
    let issued = parse_canonical_timestamp(&proof.challenge.issued_at, "issuedAt")?;
    let expiration = parse_canonical_timestamp(&proof.challenge.expiration_time, "expirationTime")?;
    let skew = clock_skew_seconds.saturating_mul(1_000);
    if now_unix_millis.saturating_add(skew) < issued {
        return Err(WalletAuthError::NotYetValid);
    }
    if now_unix_millis.saturating_sub(skew) > expiration {
        return Err(WalletAuthError::Expired);
    }
    verify_wallet_auth_proof_signature_v1(proof)
}

#[cfg(test)]
mod tests {
    use fips204::ml_dsa_65;
    use fips204::traits::{KeyGen, SerDes, Signer};
    use sha3::{Digest, Keccak256};

    use super::*;

    const GOLDEN_JSON: &str = concat!(
        r#"{"version":"1","domain":"stele.example:8443","origin":"https://stele.example:8443","#,
        r#""uri":"https://stele.example:8443/","address":"mono1dytvzzug96qtr0k09em5qm95hqn83cdyag8k3u","#,
        r#""chainId":"1337","genesisHash":"0xabababababababababababababababababababababababababababababababab","#,
        r#""nonce":"WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlo","#,
        r#""issuedAt":"2030-01-02T03:04:05.006Z","expirationTime":"2030-01-02T03:07:05.006Z","#,
        r#""scopes":["booking:write","services:read","stele:web:session"]}"#,
    );
    const GOLDEN_DIGEST: &str = "3f303dca413a7aadee6fb77d06b7aa69727fc602e77ee1b63247ddf5429ec934";
    const GOLDEN_PUBLIC_KEY_HASH: &str =
        "be210bfd8691cea81a1f3960179ba192743fa6b40eb9052fce6038472d762282";
    const GOLDEN_SIGNATURE_HASH: &str =
        "688fd39a62a5bb1613bf12bf34a2497ef42cee8732bdeaf163401b7a5aadc924";

    fn lower_hex(bytes: &[u8]) -> String {
        let mut out = String::with_capacity(2 + bytes.len() * 2);
        out.push_str("0x");
        for byte in bytes {
            use std::fmt::Write as _;
            write!(&mut out, "{byte:02x}").expect("write to String");
        }
        out
    }

    fn challenge_for_key(public_key: &[u8; ml_dsa_65::PK_LEN]) -> WalletAuthChallengeV1 {
        WalletAuthChallengeV1 {
            version: "1".to_owned(),
            domain: "stele.example:8443".to_owned(),
            origin: "https://stele.example:8443".to_owned(),
            uri: "https://stele.example:8443/".to_owned(),
            address: address_to_bech32(ml_dsa65_address(public_key)),
            chain_id: "1337".to_owned(),
            genesis_hash: format!("0x{}", "ab".repeat(32)),
            nonce: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlo".to_owned(),
            issued_at: "2030-01-02T03:04:05.006Z".to_owned(),
            expiration_time: "2030-01-02T03:07:05.006Z".to_owned(),
            scopes: vec![
                "booking:write".to_owned(),
                "services:read".to_owned(),
                "stele:web:session".to_owned(),
            ],
        }
    }

    fn proof() -> WalletAuthProofV1 {
        let (public_key, private_key) = ml_dsa_65::KG::keygen_from_seed(&[7u8; 32]);
        let public_key_bytes = public_key.into_bytes();
        let challenge = challenge_for_key(&public_key_bytes);
        let digest = wallet_auth_challenge_digest_v1(&challenge).expect("challenge digest");
        let signature = private_key
            .try_sign_with_seed(&[0u8; 32], &digest, &[])
            .expect("deterministic signature");
        WalletAuthProofV1 {
            challenge,
            algorithm: WALLET_AUTH_ALGORITHM.to_owned(),
            public_key: lower_hex(&public_key_bytes),
            signature: lower_hex(&signature),
        }
    }

    #[test]
    fn pins_cross_language_golden_vectors() {
        let proof = proof();
        assert_eq!(
            proof.challenge.address,
            "mono1dytvzzug96qtr0k09em5qm95hqn83cdyag8k3u"
        );
        assert_eq!(
            canonical_wallet_auth_challenge_json_v1(&proof.challenge).unwrap(),
            GOLDEN_JSON
        );
        assert_eq!(
            lower_hex(&wallet_auth_challenge_digest_v1(&proof.challenge).unwrap()),
            format!("0x{GOLDEN_DIGEST}")
        );
        let public_key =
            decode_lower_hex::<{ ml_dsa_65::PK_LEN }>(&proof.public_key, "publicKey").unwrap();
        let signature =
            decode_lower_hex::<{ ml_dsa_65::SIG_LEN }>(&proof.signature, "signature").unwrap();
        assert_eq!(
            lower_hex(&Keccak256::digest(public_key)),
            format!("0x{GOLDEN_PUBLIC_KEY_HASH}")
        );
        assert_eq!(
            lower_hex(&Keccak256::digest(signature)),
            format!("0x{GOLDEN_SIGNATURE_HASH}")
        );
        verify_wallet_auth_proof_signature_v1(&proof).unwrap();
        let now = parse_canonical_timestamp("2030-01-02T03:05:00.000Z", "now").unwrap();
        verify_wallet_auth_proof_v1_at(&proof, now, 0).unwrap();
    }

    #[test]
    fn round_trips_only_canonical_json() {
        let proof = proof();
        let challenge_bytes = encode_wallet_auth_challenge_v1(&proof.challenge).unwrap();
        assert_eq!(
            decode_wallet_auth_challenge_v1(&challenge_bytes).unwrap(),
            proof.challenge
        );

        let proof_bytes = encode_wallet_auth_proof_v1(&proof).unwrap();
        assert_eq!(decode_wallet_auth_proof_v1(&proof_bytes).unwrap(), proof);

        let reordered = GOLDEN_JSON.replacen(
            r#"{"version":"1","domain":"stele.example:8443""#,
            r#"{"domain":"stele.example:8443","version":"1""#,
            1,
        );
        assert!(matches!(
            decode_wallet_auth_challenge_v1(reordered.as_bytes()),
            Err(WalletAuthError::NonCanonicalEncoding)
        ));

        let with_extra =
            GOLDEN_JSON.replacen(r#"{"version":"1""#, r#"{"version":"1","extra":true"#, 1);
        assert!(matches!(
            decode_wallet_auth_challenge_v1(with_extra.as_bytes()),
            Err(WalletAuthError::Json(_))
        ));
    }

    #[test]
    fn rejects_tampering_and_address_mismatch() {
        let mut tampered = proof();
        tampered.challenge.chain_id = "1338".to_owned();
        assert!(matches!(
            verify_wallet_auth_proof_signature_v1(&tampered),
            Err(WalletAuthError::InvalidSignature)
        ));

        let mut tampered = proof();
        let replacement = if &tampered.signature[2..4] == "00" {
            "01"
        } else {
            "00"
        };
        tampered.signature.replace_range(2..4, replacement);
        assert!(matches!(
            verify_wallet_auth_proof_signature_v1(&tampered),
            Err(WalletAuthError::InvalidSignature)
        ));

        let mut mismatched = proof();
        let (other_key, _) = ml_dsa_65::KG::keygen_from_seed(&[8u8; 32]);
        mismatched.public_key = lower_hex(&other_key.into_bytes());
        assert!(matches!(
            verify_wallet_auth_proof_signature_v1(&mismatched),
            Err(WalletAuthError::AddressMismatch)
        ));
    }

    #[test]
    fn rejects_noncanonical_and_malformed_challenges() {
        let base = proof().challenge;

        let mut value = base.clone();
        value.chain_id = "01337".to_owned();
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.genesis_hash = value.genesis_hash.to_uppercase();
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.nonce.push('=');
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.issued_at = "2030-01-02T03:04:05Z".to_owned();
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.issued_at = "2030-02-30T03:04:05.006Z".to_owned();
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.expiration_time = "2030-01-02T03:08:05.007Z".to_owned();
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.scopes.swap(0, 1);
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base.clone();
        value.scopes = vec!["services:read".to_owned(), "services:read".to_owned()];
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = base;
        value.origin = "https://stele.example:443".to_owned();
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let mut value = proof().challenge;
        value.origin = format!("https://{}", "a".repeat(100_000));
        assert!(validate_wallet_auth_challenge_v1(&value).is_err());

        let oversized = vec![b' '; WALLET_AUTH_MAX_CHALLENGE_JSON_BYTES + 1];
        assert!(decode_wallet_auth_challenge_v1(&oversized).is_err());
    }

    #[test]
    fn rejects_malformed_proof_fields() {
        let base = proof();

        let mut value = base.clone();
        value.algorithm = "ML-DSA-65".to_owned();
        assert!(validate_wallet_auth_proof_v1(&value).is_err());

        let mut value = base.clone();
        value.public_key.pop();
        assert!(validate_wallet_auth_proof_v1(&value).is_err());

        let mut value = base.clone();
        value.public_key = value.public_key.to_uppercase();
        assert!(validate_wallet_auth_proof_v1(&value).is_err());

        let mut value = base;
        value.signature.pop();
        assert!(validate_wallet_auth_proof_v1(&value).is_err());
    }

    #[test]
    fn enforces_freshness_with_explicit_clock_skew() {
        let proof = proof();
        let early = parse_canonical_timestamp("2030-01-02T03:04:00.000Z", "now").unwrap();
        assert!(matches!(
            verify_wallet_auth_proof_v1_at(&proof, early, 0),
            Err(WalletAuthError::NotYetValid)
        ));
        let late = parse_canonical_timestamp("2030-01-02T03:07:06.000Z", "now").unwrap();
        assert!(matches!(
            verify_wallet_auth_proof_v1_at(&proof, late, 0),
            Err(WalletAuthError::Expired)
        ));
        verify_wallet_auth_proof_v1_at(&proof, late, 1).unwrap();
        assert!(matches!(
            verify_wallet_auth_proof_v1_at(&proof, late, WALLET_AUTH_MAX_CLOCK_SKEW_SECONDS + 1,),
            Err(WalletAuthError::InvalidField {
                field: "clockSkewSeconds",
                ..
            })
        ));
    }

    #[test]
    fn freshness_errors_win_over_an_invalid_signature() {
        let mut proof = proof();
        let replacement = if &proof.signature[2..4] == "00" {
            "01"
        } else {
            "00"
        };
        proof.signature.replace_range(2..4, replacement);

        let early = parse_canonical_timestamp("2030-01-02T03:03:00.000Z", "now").unwrap();
        assert!(matches!(
            verify_wallet_auth_proof_v1_at(&proof, early, 0),
            Err(WalletAuthError::NotYetValid)
        ));
        let late = parse_canonical_timestamp("2030-01-02T03:08:00.000Z", "now").unwrap();
        assert!(matches!(
            verify_wallet_auth_proof_v1_at(&proof, late, 0),
            Err(WalletAuthError::Expired)
        ));
        let current = parse_canonical_timestamp("2030-01-02T03:05:00.000Z", "now").unwrap();
        assert!(matches!(
            verify_wallet_auth_proof_v1_at(&proof, current, 0),
            Err(WalletAuthError::InvalidSignature)
        ));
    }
}
