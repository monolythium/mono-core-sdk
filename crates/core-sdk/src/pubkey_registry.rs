//! Pubkey-registry precompile ABI helpers.
//!
//! The pubkey-registry at `0x110D` lets an account publish its primary
//! ML-DSA-65 public key once, so later contract-context verification can
//! look the key up by address.

use sha3::{Digest, Keccak256};

use crate::address::{address_to_hex, hex_to_address, AddressError};
use crate::consts::precompile_addresses;

/// ML-DSA-65 public key byte length.
pub const ML_DSA_65_PUBLIC_KEY_LEN: usize = 1952;

/// `registerPubkey(bytes)`.
pub const SIGHASH_REGISTER_PUBKEY: &str = "registerPubkey(bytes)";

/// `lookupPubkey(address)`.
pub const SIGHASH_LOOKUP_PUBKEY: &str = "lookupPubkey(address)";

/// `hasPubkey(address)`.
pub const SIGHASH_HAS_PUBKEY: &str = "hasPubkey(address)";

/// Decoded `lookupPubkey(address)` return.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PubkeyLookup {
    /// Registered ML-DSA-65 pubkey, empty when no key is on file.
    pub pubkey: Vec<u8>,
    /// Block height at which the pubkey was registered. Zero when absent.
    pub set_block: u64,
}

/// Errors returned by pubkey-registry helpers.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum PubkeyRegistryError {
    /// Address parsing failed.
    #[error(transparent)]
    Address(#[from] AddressError),

    /// Pubkey length does not match ML-DSA-65.
    #[error("pubkey must be {expected} bytes, got {got}")]
    PublicKeyLength {
        /// Expected byte length.
        expected: usize,
        /// Supplied byte length.
        got: usize,
    },

    /// ABI return data is malformed.
    #[error("malformed ABI return: {0}")]
    MalformedReturn(&'static str),
}

/// Return the first four bytes of `keccak256(sighash)`.
#[must_use]
pub fn selector_for(sighash: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sighash.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Selector for `registerPubkey`.
#[must_use]
pub fn selector_register_pubkey() -> [u8; 4] {
    selector_for(SIGHASH_REGISTER_PUBKEY)
}

/// Selector for `lookupPubkey`.
#[must_use]
pub fn selector_lookup_pubkey() -> [u8; 4] {
    selector_for(SIGHASH_LOOKUP_PUBKEY)
}

/// Selector for `hasPubkey`.
#[must_use]
pub fn selector_has_pubkey() -> [u8; 4] {
    selector_for(SIGHASH_HAS_PUBKEY)
}

/// Encode `registerPubkey(bytes)` calldata.
///
/// # Errors
/// Returns [`PubkeyRegistryError`] if `pubkey` is not ML-DSA-65 length.
pub fn encode_register_pubkey_calldata(pubkey: &[u8]) -> Result<Vec<u8>, PubkeyRegistryError> {
    if pubkey.len() != ML_DSA_65_PUBLIC_KEY_LEN {
        return Err(PubkeyRegistryError::PublicKeyLength {
            expected: ML_DSA_65_PUBLIC_KEY_LEN,
            got: pubkey.len(),
        });
    }
    let mut out = Vec::with_capacity(4 + 32 + 32 + ML_DSA_65_PUBLIC_KEY_LEN);
    out.extend_from_slice(&selector_register_pubkey());
    encode_u256_word(&mut out, 32);
    encode_u256_word(&mut out, pubkey.len() as u64);
    out.extend_from_slice(pubkey);
    Ok(out)
}

/// Encode `lookupPubkey(address)` calldata.
#[must_use]
pub fn encode_lookup_pubkey_calldata(address: [u8; 20]) -> Vec<u8> {
    encode_single_address_call(selector_lookup_pubkey(), address)
}

/// Encode `lookupPubkey(address)` calldata from a hex address string.
///
/// # Errors
/// Returns [`PubkeyRegistryError`] if the address is malformed.
pub fn encode_lookup_pubkey_calldata_hex(address: &str) -> Result<Vec<u8>, PubkeyRegistryError> {
    Ok(encode_lookup_pubkey_calldata(hex_to_address(address)?))
}

/// Encode `hasPubkey(address)` calldata.
#[must_use]
pub fn encode_has_pubkey_calldata(address: [u8; 20]) -> Vec<u8> {
    encode_single_address_call(selector_has_pubkey(), address)
}

/// Encode `hasPubkey(address)` calldata from a hex address string.
///
/// # Errors
/// Returns [`PubkeyRegistryError`] if the address is malformed.
pub fn encode_has_pubkey_calldata_hex(address: &str) -> Result<Vec<u8>, PubkeyRegistryError> {
    Ok(encode_has_pubkey_calldata(hex_to_address(address)?))
}

/// Decode `lookupPubkey(address)` return data.
///
/// # Errors
/// Returns [`PubkeyRegistryError`] when the ABI tuple is malformed.
pub fn decode_lookup_pubkey_return(data: &[u8]) -> Result<PubkeyLookup, PubkeyRegistryError> {
    if data.len() < 96 {
        return Err(PubkeyRegistryError::MalformedReturn(
            "lookup return < 96 bytes",
        ));
    }
    let offset = decode_word_usize(&data[0..32])?;
    if offset != 64 {
        return Err(PubkeyRegistryError::MalformedReturn(
            "lookup pubkey offset must be 0x40",
        ));
    }
    let set_block = decode_word_u64(&data[32..64])?;
    let len_pos = offset;
    if data.len() < len_pos + 32 {
        return Err(PubkeyRegistryError::MalformedReturn("missing bytes length"));
    }
    let body_len = decode_word_usize(&data[len_pos..len_pos + 32])?;
    let body_start = len_pos + 32;
    let padded = body_len.div_ceil(32) * 32;
    if data.len() < body_start + padded {
        return Err(PubkeyRegistryError::MalformedReturn("short bytes body"));
    }
    Ok(PubkeyLookup {
        pubkey: data[body_start..body_start + body_len].to_vec(),
        set_block,
    })
}

/// Decode `hasPubkey(address)` return data.
///
/// # Errors
/// Returns [`PubkeyRegistryError`] when the ABI bool word is malformed.
pub fn decode_has_pubkey_return(data: &[u8]) -> Result<bool, PubkeyRegistryError> {
    if data.len() != 32 {
        return Err(PubkeyRegistryError::MalformedReturn(
            "bool return must be 32 bytes",
        ));
    }
    if data[..31].iter().any(|b| *b != 0) {
        return Err(PubkeyRegistryError::MalformedReturn(
            "bool high bytes non-zero",
        ));
    }
    match data[31] {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(PubkeyRegistryError::MalformedReturn("bool must be 0 or 1")),
    }
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

/// Return the pubkey-registry precompile address as lower-case hex.
#[must_use]
pub fn pubkey_registry_address_hex() -> String {
    address_to_hex(precompile_addresses::PUBKEY_REGISTRY)
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

fn encode_u256_word(out: &mut Vec<u8>, value: u64) {
    out.extend_from_slice(&[0u8; 24]);
    out.extend_from_slice(&value.to_be_bytes());
}

fn decode_word_usize(word: &[u8]) -> Result<usize, PubkeyRegistryError> {
    let v = decode_word_u64(word)?;
    usize::try_from(v).map_err(|_| PubkeyRegistryError::MalformedReturn("word overflows usize"))
}

fn decode_word_u64(word: &[u8]) -> Result<u64, PubkeyRegistryError> {
    if word.len() != 32 {
        return Err(PubkeyRegistryError::MalformedReturn(
            "word must be 32 bytes",
        ));
    }
    if word[..24].iter().any(|b| *b != 0) {
        return Err(PubkeyRegistryError::MalformedReturn("word exceeds uint64"));
    }
    let mut out = [0u8; 8];
    out.copy_from_slice(&word[24..32]);
    Ok(u64::from_be_bytes(out))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selectors_match_mono_core() {
        assert_eq!(selector_register_pubkey(), [0x5f, 0xe9, 0x84, 0xe7]);
        assert_eq!(selector_lookup_pubkey(), [0x87, 0xc4, 0x20, 0x01]);
        assert_eq!(selector_has_pubkey(), [0x01, 0xc0, 0xd1, 0x67]);
    }

    #[test]
    fn register_calldata_has_solidity_bytes_shape() {
        let pubkey = vec![0xAB; ML_DSA_65_PUBLIC_KEY_LEN];
        let calldata = encode_register_pubkey_calldata(&pubkey).unwrap();
        assert_eq!(calldata.len(), 4 + 32 + 32 + ML_DSA_65_PUBLIC_KEY_LEN);
        assert_eq!(&calldata[..4], &selector_register_pubkey());
        assert_eq!(&calldata[28..36], &32_u64.to_be_bytes());
        assert_eq!(
            &calldata[60..68],
            &(ML_DSA_65_PUBLIC_KEY_LEN as u64).to_be_bytes()
        );
        assert_eq!(&calldata[68..], &pubkey);
    }

    #[test]
    fn view_calldata_has_one_address_word() {
        let address = [0x11; 20];
        assert_eq!(encode_lookup_pubkey_calldata(address).len(), 36);
        assert_eq!(encode_has_pubkey_calldata(address).len(), 36);
    }

    #[test]
    fn decodes_lookup_return() {
        let pubkey = vec![0xAB; ML_DSA_65_PUBLIC_KEY_LEN];
        let mut data = Vec::new();
        encode_u256_word(&mut data, 64);
        encode_u256_word(&mut data, 1_234_567);
        encode_u256_word(&mut data, ML_DSA_65_PUBLIC_KEY_LEN as u64);
        data.extend_from_slice(&pubkey);
        let decoded = decode_lookup_pubkey_return(&data).unwrap();
        assert_eq!(decoded.pubkey, pubkey);
        assert_eq!(decoded.set_block, 1_234_567);
    }

    #[test]
    fn decodes_has_pubkey_bool() {
        let mut yes = [0u8; 32];
        yes[31] = 1;
        assert!(decode_has_pubkey_return(&yes).unwrap());
        assert!(!decode_has_pubkey_return(&[0u8; 32]).unwrap());
    }
}
