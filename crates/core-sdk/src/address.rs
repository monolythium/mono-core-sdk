//! Address display helpers.
//!
//! Monolythium keeps 20-byte account identifiers on the wire, but
//! user-facing surfaces display them as `mono1...` bech32m strings.

use bech32::primitives::decode::CheckedHrpstring;
use bech32::{Bech32m, Hrp};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Human-readable prefix for Monolythium bech32m addresses.
pub const ADDRESS_HRP: &str = "mono";

/// Allocated v4.1 typed address HRPs.
pub const ADDRESS_HRPS: [&str; 6] = ["mono", "monos", "monoc", "monok", "monom", "monox"];

/// Reserved typed address HRPs. Decoders reject these with a reserved-HRP error.
pub const RESERVED_ADDRESS_HRPS: [&str; 4] = ["monor", "monop", "monoi", "monoa"];

/// Typed address discriminator from ADR-0038.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum AddressKind {
    /// User externally-owned account (`mono`).
    #[serde(rename = "user")]
    User,
    /// Smart account (`monos`).
    #[serde(rename = "smartAccount")]
    SmartAccount,
    /// RISC-V contract account (`monoc`).
    #[serde(rename = "contract")]
    Contract,
    /// Operator cluster identity (`monok`).
    #[serde(rename = "cluster")]
    Cluster,
    /// Multisig identity (`monom`).
    #[serde(rename = "multisig")]
    Multisig,
    /// System native module identity (`monox`).
    #[serde(rename = "systemModule")]
    SystemModule,
}

impl AddressKind {
    /// Stable bech32m HRP for this address kind.
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

    /// Resolve an allocated HRP to an address kind.
    #[must_use]
    pub fn from_hrp(hrp: &str) -> Option<Self> {
        match hrp {
            "mono" => Some(Self::User),
            "monos" => Some(Self::SmartAccount),
            "monoc" => Some(Self::Contract),
            "monok" => Some(Self::Cluster),
            "monom" => Some(Self::Multisig),
            "monox" => Some(Self::SystemModule),
            _ => None,
        }
    }
}

/// Errors returned by address parsing and display helpers.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum AddressError {
    /// Hex input did not have the expected `0x` + 40 hex-nibble shape.
    #[error("expected 0x-prefixed 20-byte hex address")]
    InvalidHexShape,

    /// Hex input contained a non-hex character.
    #[error("invalid hex character in address")]
    InvalidHex,

    /// Bech32m parser or checksum failure.
    #[error("bech32m parse/checksum error: {0}")]
    Bech32Decode(String),

    /// The bech32m HRP was not `mono`.
    #[error("unexpected hrp '{got}', expected '{expected}'")]
    WrongHrp {
        /// HRP in the supplied address.
        got: String,
        /// Required HRP.
        expected: &'static str,
    },

    /// The address used a reserved HRP.
    #[error("reserved address hrp '{0}'")]
    ReservedHrp(String),

    /// The address used an unknown HRP.
    #[error("unknown address hrp '{0}'")]
    UnknownHrp(String),

    /// The bech32m payload was not exactly 20 bytes.
    #[error("expected 20-byte payload, got {got} bytes")]
    WrongLength {
        /// Decoded payload length.
        got: usize,
    },
}

/// Encode raw 20-byte address bytes as `mono1...` bech32m.
#[must_use]
#[allow(clippy::expect_used)]
pub fn address_to_bech32(addr: [u8; 20]) -> String {
    address_to_typed_bech32(AddressKind::User, addr)
}

/// Encode raw 20-byte address bytes with the HRP for `kind`.
#[must_use]
#[allow(clippy::expect_used)]
pub fn address_to_typed_bech32(kind: AddressKind, addr: [u8; 20]) -> String {
    let hrp = Hrp::parse(kind.hrp()).expect("AddressKind HRP is valid");
    bech32::encode::<Bech32m>(hrp, &addr).expect("20-byte bech32m encode cannot fail")
}

/// Decode a `mono1...` bech32m address into raw 20-byte address bytes.
///
/// # Errors
/// Returns [`AddressError`] for checksum, HRP, or payload-length failures.
pub fn bech32_to_address(s: &str) -> Result<[u8; 20], AddressError> {
    typed_bech32_to_address_kind(s, AddressKind::User)
}

/// Decode any allocated typed bech32m address.
///
/// # Errors
/// Returns [`AddressError`] for checksum, HRP, or payload-length failures.
pub fn typed_bech32_to_address(s: &str) -> Result<(AddressKind, [u8; 20]), AddressError> {
    let parsed = CheckedHrpstring::new::<Bech32m>(s)
        .map_err(|e| AddressError::Bech32Decode(e.to_string()))?;
    let hrp = parsed.hrp().as_str().to_lowercase();
    if RESERVED_ADDRESS_HRPS.contains(&hrp.as_str()) {
        return Err(AddressError::ReservedHrp(hrp));
    }
    let kind = AddressKind::from_hrp(&hrp).ok_or_else(|| AddressError::UnknownHrp(hrp.clone()))?;
    let bytes: Vec<u8> = parsed.byte_iter().collect();
    if bytes.len() != 20 {
        return Err(AddressError::WrongLength { got: bytes.len() });
    }
    let mut out = [0u8; 20];
    out.copy_from_slice(&bytes);
    Ok((kind, out))
}

/// Decode a typed bech32m address and require a specific address kind.
///
/// # Errors
/// Returns [`AddressError`] when the checksum, HRP, payload length, or expected
/// kind check fails.
pub fn typed_bech32_to_address_kind(
    s: &str,
    expected: AddressKind,
) -> Result<[u8; 20], AddressError> {
    let (kind, out) = typed_bech32_to_address(s)?;
    if kind != expected {
        return Err(AddressError::WrongHrp {
            got: kind.hrp().to_owned(),
            expected: expected.hrp(),
        });
    }
    Ok(out)
}

/// Parse a `0x`-prefixed 20-byte hex address into raw bytes.
///
/// # Errors
/// Returns [`AddressError`] when the string is not exactly 20 bytes of hex.
pub fn hex_to_address(s: &str) -> Result<[u8; 20], AddressError> {
    let body = s
        .strip_prefix("0x")
        .or_else(|| s.strip_prefix("0X"))
        .ok_or(AddressError::InvalidHexShape)?;
    if body.len() != 40 {
        return Err(AddressError::InvalidHexShape);
    }
    let mut out = [0u8; 20];
    for (i, slot) in out.iter_mut().enumerate() {
        let hi = decode_hex_nibble(body.as_bytes()[i * 2])?;
        let lo = decode_hex_nibble(body.as_bytes()[i * 2 + 1])?;
        *slot = (hi << 4) | lo;
    }
    Ok(out)
}

/// Format raw 20-byte address bytes as lower-case `0x...` hex.
#[must_use]
pub fn address_to_hex(addr: [u8; 20]) -> String {
    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for b in addr {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Parse either `0x...` hex or `mono1...` bech32m into raw bytes.
///
/// # Errors
/// Returns [`AddressError`] from the selected parser.
pub fn parse_address(s: &str) -> Result<[u8; 20], AddressError> {
    if s.starts_with("0x") || s.starts_with("0X") {
        hex_to_address(s)
    } else {
        bech32_to_address(s)
    }
}

fn decode_hex_nibble(b: u8) -> Result<u8, AddressError> {
    match b {
        b'0'..=b'9' => Ok(b - b'0'),
        b'a'..=b'f' => Ok(b - b'a' + 10),
        b'A'..=b'F' => Ok(b - b'A' + 10),
        _ => Err(AddressError::InvalidHex),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bech32_round_trip_matches_mono_core_golden_vector() {
        let addr = [
            0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66,
            0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC,
        ];
        let encoded = address_to_bech32(addr);
        assert_eq!(encoded, "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4");
        assert_eq!(bech32_to_address(&encoded).unwrap(), addr);
    }

    #[test]
    fn hex_round_trip_is_lowercase() {
        let addr = [0xAB; 20];
        let hex = address_to_hex(addr);
        assert_eq!(hex, "0xabababababababababababababababababababab");
        assert_eq!(hex_to_address(&hex).unwrap(), addr);
        assert_eq!(
            hex_to_address("0xABABABABABABABABABABABABABABABABABABABAB").unwrap(),
            addr
        );
    }

    #[test]
    fn parse_accepts_hex_or_bech32() {
        let addr = [0x42; 20];
        assert_eq!(parse_address(&address_to_hex(addr)).unwrap(), addr);
        assert_eq!(parse_address(&address_to_bech32(addr)).unwrap(), addr);
    }

    #[test]
    fn typed_bech32_round_trip_keeps_hrp_kind() {
        let addr = [0x33; 20];
        let display = address_to_typed_bech32(AddressKind::Contract, addr);
        assert!(display.starts_with("monoc1"));
        assert_eq!(
            typed_bech32_to_address(&display).unwrap(),
            (AddressKind::Contract, addr)
        );
        assert_eq!(
            typed_bech32_to_address_kind(&display, AddressKind::Contract).unwrap(),
            addr
        );
        assert!(matches!(
            typed_bech32_to_address_kind(&display, AddressKind::User),
            Err(AddressError::WrongHrp { .. })
        ));
    }

    #[test]
    fn typed_bech32_rejects_reserved_hrp() {
        let addr = [0x44; 20];
        let reserved = {
            let hrp = Hrp::parse("monor").unwrap();
            bech32::encode::<Bech32m>(hrp, &addr).unwrap()
        };
        assert_eq!(
            typed_bech32_to_address(&reserved),
            Err(AddressError::ReservedHrp("monor".to_owned()))
        );
    }
}
