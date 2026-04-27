//! Canonical chain constants for `monolythium-core-sdk`.
//!
//! These values mirror what `mono-core` wires at the runtime layer; the
//! mono-core paths are cited inline so any drift fails the same place.
//!
//! The TypeScript surface lives in `packages/ts/src/consts.ts` and is
//! kept byte-for-byte aligned with the values below — surface workers
//! consume the TS package, so the JS-side test
//! (`packages/ts/tests/consts.test.ts`) is the load-bearing assertion
//! for downstream surfaces. The Rust side is the authoritative form.

/// EIP-1559 base-fee burn destination (Law §5.2).
///
/// The canonical zero address: every base-fee unit consumed by a
/// transaction is sent here and removed from circulating supply. There
/// is no private key for this address on any chain, so funds routed
/// here are unrecoverable by construction.
///
/// Use [`burn_addr_hex`] when a `0x`-prefixed string is needed.
pub const BURN_ADDR: [u8; 20] = [0u8; 20];

/// `0x`-prefixed lower-case hex form of [`BURN_ADDR`].
///
/// Surfaces that talk to the SDK over JSON-RPC compare on the string
/// form; this accessor avoids hand-rolling a hex encoder at every
/// call site.
#[must_use]
pub fn burn_addr_hex() -> String {
    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for b in &BURN_ADDR {
        // {:02x} — lower-case zero-padded hex matches the JSON-RPC
        // shape served by `eth_*` methods.
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Canonical precompile address map (Law §5.4).
///
/// Sourced 1:1 from `mono-core/crates/runtime/src/precompiles.rs` and
/// pinned by `mono-core/crates/runtime/tests/precompile_wiring.rs`.
///
/// Two slots in the Law §5.4 layout are intentionally absent:
///
/// - `0x1006` — governance / deliberation reserved by Law §5.4 but
///   explicitly unwired after the OI-0140 memo-signalling pivot.
/// - `0x1101` — VRF slot mandated by Law §5.4 §5.6 but research-gated
///   on threshold-BLS; the crate has not landed and the address falls
///   through as a plain EOA today.
pub mod precompile_addresses {
    /// Native fungible-token factory — non-gateable (Law §5.4, foundational).
    pub const TOKEN_FACTORY: [u8; 20] = address([0x10, 0x00]);
    /// Native central-limit order book — gateable.
    pub const CLOB: [u8; 20] = address([0x10, 0x01]);
    /// Cross-margin perp engine — gateable.
    pub const MARGIN: [u8; 20] = address([0x10, 0x02]);
    /// Agent execution surface (zkML-gated, ADR-0011/ADR-0020) — gateable.
    pub const AGENT: [u8; 20] = address([0x10, 0x03]);
    /// Account privacy policy + stealth/confidential ops — gateable.
    pub const PRIVACY: [u8; 20] = address([0x10, 0x04]);
    /// Validator + RPC node registry — non-gateable (consensus invariant).
    pub const NODE_REGISTRY: [u8; 20] = address([0x10, 0x05]);
    /// IBC light-client + packet routing — gateable.
    pub const IBC: [u8; 20] = address([0x10, 0x07]);
    /// Native zk-light-client bridge — gateable.
    pub const BRIDGE: [u8; 20] = address([0x10, 0x08]);
    /// Decentralized multi-signer oracle (OI-0036) — non-gateable.
    pub const ORACLE: [u8; 20] = address([0x10, 0x09]);
    /// Distributed delegation primitive (Stage E.5a, Law §7.6) — gateable.
    pub const DELEGATION: [u8; 20] = address([0x10, 0x0A]);
    /// One-time emergency-key registry (Law §5.4 / §2.9) — non-gateable.
    pub const EMERGENCY_KEY: [u8; 20] = address([0x11, 0x00]);
    /// Streaming-payments primitive (Law §5.4 / §5.7) — gateable.
    pub const STREAMING_PAYMENTS: [u8; 20] = address([0x11, 0x02]);
    /// Human-readable name registry (Law §5.4 / §5.8) — gateable.
    pub const NAME_REGISTRY: [u8; 20] = address([0x11, 0x03]);

    /// Build a precompile address from its trailing two bytes. The first
    /// 18 bytes are zero — the runtime address layout always pins
    /// precompiles into the low band.
    const fn address(low_two: [u8; 2]) -> [u8; 20] {
        let mut out = [0u8; 20];
        out[18] = low_two[0];
        out[19] = low_two[1];
        out
    }

    /// Every wired precompile address paired with its functional name.
    /// Surfaces iterate this when rendering precompile traffic by name.
    pub const ALL: &[(&str, [u8; 20])] = &[
        ("TOKEN_FACTORY", TOKEN_FACTORY),
        ("CLOB", CLOB),
        ("MARGIN", MARGIN),
        ("AGENT", AGENT),
        ("PRIVACY", PRIVACY),
        ("NODE_REGISTRY", NODE_REGISTRY),
        ("IBC", IBC),
        ("BRIDGE", BRIDGE),
        ("ORACLE", ORACLE),
        ("DELEGATION", DELEGATION),
        ("EMERGENCY_KEY", EMERGENCY_KEY),
        ("STREAMING_PAYMENTS", STREAMING_PAYMENTS),
        ("NAME_REGISTRY", NAME_REGISTRY),
    ];
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn burn_addr_is_canonical_zero_address() {
        assert_eq!(BURN_ADDR, [0u8; 20]);
        assert_eq!(
            burn_addr_hex(),
            "0x0000000000000000000000000000000000000000"
        );
    }

    #[test]
    fn burn_addr_hex_matches_json_rpc_shape() {
        let s = burn_addr_hex();
        assert_eq!(s.len(), 42, "0x + 40 hex nibbles");
        assert!(s.starts_with("0x"));
        assert!(s[2..]
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    }

    #[test]
    fn precompile_addresses_match_runtime_constants() {
        // Hand-pinned from
        //   mono-core/crates/runtime/src/precompiles.rs (header table)
        //   mono-core/crates/runtime/tests/precompile_wiring.rs::WIRED_SLOTS
        use precompile_addresses::*;

        let expected: &[(&str, [u8; 20])] = &[
            ("TOKEN_FACTORY", expected_addr(0x1000)),
            ("CLOB", expected_addr(0x1001)),
            ("MARGIN", expected_addr(0x1002)),
            ("AGENT", expected_addr(0x1003)),
            ("PRIVACY", expected_addr(0x1004)),
            ("NODE_REGISTRY", expected_addr(0x1005)),
            ("IBC", expected_addr(0x1007)),
            ("BRIDGE", expected_addr(0x1008)),
            ("ORACLE", expected_addr(0x1009)),
            ("DELEGATION", expected_addr(0x100A)),
            ("EMERGENCY_KEY", expected_addr(0x1100)),
            ("STREAMING_PAYMENTS", expected_addr(0x1102)),
            ("NAME_REGISTRY", expected_addr(0x1103)),
        ];
        for ((_, want), &(name, got)) in expected.iter().zip(ALL.iter()) {
            assert_eq!(got, *want, "{name}: address must match runtime");
        }

        // Spot-check the slots that drifted between the task spec and
        // chain reality — these are the ones a downstream surface is
        // most likely to confuse.
        assert_eq!(NODE_REGISTRY, expected_addr(0x1005));
        assert_eq!(IBC, expected_addr(0x1007));
        assert_eq!(BRIDGE, expected_addr(0x1008));
        assert_eq!(PRIVACY, expected_addr(0x1004));
    }

    #[test]
    fn precompile_address_map_size_is_thirteen() {
        // Mirrors the runtime test assertion `expected 13 wired
        // precompiles` — adding without parallel runtime registration
        // is a drift.
        assert_eq!(precompile_addresses::ALL.len(), 13);
    }

    #[test]
    fn unwired_slots_are_not_exposed() {
        // 0x1006 (governance, OI-0140 pivot) and 0x1101 (VRF, research-
        // gated) must NOT appear in the address map.
        let unwired_1006 = expected_addr(0x1006);
        let unwired_1101 = expected_addr(0x1101);
        for &(_, addr) in precompile_addresses::ALL {
            assert_ne!(addr, unwired_1006, "0x1006 must stay unwired");
            assert_ne!(addr, unwired_1101, "0x1101 must stay unwired");
        }
    }

    fn expected_addr(low_u16: u16) -> [u8; 20] {
        let mut out = [0u8; 20];
        out[18] = (low_u16 >> 8) as u8;
        out[19] = (low_u16 & 0xff) as u8;
        out
    }
}
