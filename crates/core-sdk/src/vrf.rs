//! VRF precompile (`0x1101`) calldata helpers.
//!
//! Mirrors `packages/ts/src/vrf.ts`. The precompile is selectorless:
//! calldata is a 32-byte big-endian block height followed by a
//! caller-chosen domain tag (up to 256 bytes). Successful return data is
//! exactly 32 bytes. Reading an unfinalized height reverts with
//! [`VRF_HEIGHT_NOT_FINALIZED_REVERT`].
//!
//! The historical leader seed is also exposed as
//! `lyth_getRoundCertificate(round).signature` (the ML-DSA-65 leader-seed
//! digest); see [`crate::RoundCertificateResponse`].

use crate::consts::precompile_addresses::VRF;

/// VRF precompile address (`0x1101`).
pub const VRF_ADDRESS: [u8; 20] = VRF;

/// Successful VRF return-data width.
pub const VRF_OUTPUT_BYTES: usize = 32;
/// Maximum caller domain-tag width.
pub const VRF_DOMAIN_TAG_MAX_BYTES: usize = 256;
/// Revert message returned when the requested height has not finalized.
pub const VRF_HEIGHT_NOT_FINALIZED_REVERT: &str = "vrf: height not finalized";

/// Error from the VRF calldata helpers.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum VrfCallError {
    /// The domain tag exceeds [`VRF_DOMAIN_TAG_MAX_BYTES`].
    #[error("domainTag exceeds {VRF_DOMAIN_TAG_MAX_BYTES} bytes")]
    DomainTagTooLong,
    /// VRF return data was not exactly [`VRF_OUTPUT_BYTES`] bytes.
    #[error("VRF output must be {VRF_OUTPUT_BYTES} bytes, got {0}")]
    BadOutputLen(usize),
}

/// Return the VRF precompile address (`0x1101`) as lower-case hex.
#[must_use]
pub fn vrf_address_hex() -> String {
    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for b in &VRF_ADDRESS {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Encode selectorless VRF calldata: `uint256 block_height || domain_tag`.
///
/// `block_height` is the finalized height to read randomness from;
/// `domain_tag` is an independent namespace for the consumer.
///
/// # Errors
/// [`VrfCallError::DomainTagTooLong`] when `domain_tag` exceeds
/// [`VRF_DOMAIN_TAG_MAX_BYTES`].
pub fn encode_vrf_evaluate_calldata(
    block_height: u64,
    domain_tag: &[u8],
) -> Result<Vec<u8>, VrfCallError> {
    if domain_tag.len() > VRF_DOMAIN_TAG_MAX_BYTES {
        return Err(VrfCallError::DomainTagTooLong);
    }
    let mut out = Vec::with_capacity(32 + domain_tag.len());
    let mut word = [0u8; 32];
    word[24..32].copy_from_slice(&block_height.to_be_bytes());
    out.extend_from_slice(&word);
    out.extend_from_slice(domain_tag);
    Ok(out)
}

/// Encode selectorless VRF calldata as lower-case `0x` hex.
///
/// # Errors
/// [`VrfCallError::DomainTagTooLong`] when `domain_tag` is too long.
pub fn encode_vrf_evaluate_calldata_hex(
    block_height: u64,
    domain_tag: &[u8],
) -> Result<String, VrfCallError> {
    Ok(calldata_to_hex(&encode_vrf_evaluate_calldata(
        block_height,
        domain_tag,
    )?))
}

/// Decode a successful VRF return payload into its 32 randomness bytes.
///
/// # Errors
/// [`VrfCallError::BadOutputLen`] when `output` is not 32 bytes.
pub fn decode_vrf_output(output: &[u8]) -> Result<[u8; VRF_OUTPUT_BYTES], VrfCallError> {
    if output.len() != VRF_OUTPUT_BYTES {
        return Err(VrfCallError::BadOutputLen(output.len()));
    }
    let mut out = [0u8; VRF_OUTPUT_BYTES];
    out.copy_from_slice(output);
    Ok(out)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vrf_address_matches_consts() {
        assert_eq!(VRF_ADDRESS, crate::consts::precompile_addresses::VRF);
        assert_eq!(
            vrf_address_hex(),
            "0x0000000000000000000000000000000000001101"
        );
    }

    #[test]
    fn encodes_selectorless_finalized_height_calldata() {
        // Golden vector reused from packages/ts/tests/vrf.test.ts.
        assert_eq!(
            encode_vrf_evaluate_calldata_hex(42, b"dice").unwrap(),
            "0x000000000000000000000000000000000000000000000000000000000000002a64696365",
        );
        assert_eq!(
            encode_vrf_evaluate_calldata_hex(0x2a, &[0x01, 0x02]).unwrap(),
            "0x000000000000000000000000000000000000000000000000000000000000002a0102",
        );
    }

    #[test]
    fn rejects_oversized_domain_tag() {
        let tag = vec![0u8; VRF_DOMAIN_TAG_MAX_BYTES + 1];
        assert_eq!(
            encode_vrf_evaluate_calldata(1, &tag),
            Err(VrfCallError::DomainTagTooLong)
        );
        // Exactly at the cap is accepted.
        assert!(encode_vrf_evaluate_calldata(1, &vec![0u8; VRF_DOMAIN_TAG_MAX_BYTES]).is_ok());
    }

    #[test]
    fn decodes_32_byte_output() {
        let out = decode_vrf_output(&[0xab; 32]).unwrap();
        assert_eq!(out, [0xab; 32]);
        assert_eq!(
            decode_vrf_output(&[0x12, 0x34]),
            Err(VrfCallError::BadOutputLen(2))
        );
    }
}
