//! Operator-fee router precompile (`0x100B`) ABI helpers + read types.
//!
//! Mirrors `mono-core/crates/precompiles/platform/operator-router`. The
//! router skims an operator surcharge from the quote escrow then re-enters
//! the CLOB `placeLimitOrder` op with `caller = user`, so the resting order
//! is owned + escrowed + cancellable by the user — identical to a direct
//! CLOB placement.
//!
//! ## Two-spender approval model
//!
//! A routed order needs **two** spender approvals to succeed: the user
//! approves the CLOB (`0x1001`) for the order's quote/base escrow, AND the
//! operator router (`0x100B`) for the fee skim. A wallet surfacing a routed
//! order should prompt both approvals (or one combined approval covering
//! `quote_basis + fee_amount`).

use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

use crate::consts::precompile_addresses::{OPERATOR_ROUTER, PROTOCOL_MAX_OPERATOR_FEE_BPS};

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// Operator-fee router precompile address (`0x100B`).
pub const OPERATOR_ROUTER_ADDRESS: [u8; 20] = OPERATOR_ROUTER;

/// `registerOperator(address recipient, uint16 feeBps)`.
pub const SIG_REGISTER_OPERATOR: &str = "registerOperator(address,uint16)";
/// `updateOperator(address recipient, uint16 feeBps)`.
pub const SIG_UPDATE_OPERATOR: &str = "updateOperator(address,uint16)";
/// `disableOperator(address operator)` — foundation-authorized.
pub const SIG_DISABLE_OPERATOR: &str = "disableOperator(address)";
/// `placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,uint256,uint64)`
/// → `bytes32 orderId`.
pub const SIG_PLACE_LIMIT_ORDER_VIA: &str =
    "placeLimitOrderVia(address,bytes32,bytes32,uint8,uint256,uint256,uint64)";

/// `OperatorFeeCharged(address,address,bytes32,address,bytes32,uint256,bytes32)`.
pub const EVENT_SIG_OPERATOR_FEE_CHARGED: &str =
    "OperatorFeeCharged(address,address,bytes32,address,bytes32,uint256,bytes32)";
/// `OperatorRegistered(address,address,uint16)`.
pub const EVENT_SIG_OPERATOR_REGISTERED: &str = "OperatorRegistered(address,address,uint16)";
/// `OperatorUpdated(address,address,uint16,bool)`.
pub const EVENT_SIG_OPERATOR_UPDATED: &str = "OperatorUpdated(address,address,uint16,bool)";

/// Return the first four bytes of `keccak256(sig)`.
#[must_use]
pub fn selector_for(sig: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sig.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Selector for `registerOperator(address,uint16)`.
#[must_use]
pub fn selector_register_operator() -> [u8; 4] {
    selector_for(SIG_REGISTER_OPERATOR)
}

/// Selector for `updateOperator(address,uint16)`.
#[must_use]
pub fn selector_update_operator() -> [u8; 4] {
    selector_for(SIG_UPDATE_OPERATOR)
}

/// Selector for `disableOperator(address)`.
#[must_use]
pub fn selector_disable_operator() -> [u8; 4] {
    selector_for(SIG_DISABLE_OPERATOR)
}

/// Selector for `placeLimitOrderVia(...)`.
#[must_use]
pub fn selector_place_limit_order_via() -> [u8; 4] {
    selector_for(SIG_PLACE_LIMIT_ORDER_VIA)
}

/// `keccak256` topic0 for `OperatorFeeCharged`.
#[must_use]
pub fn topic_operator_fee_charged() -> [u8; 32] {
    Keccak256::digest(EVENT_SIG_OPERATOR_FEE_CHARGED.as_bytes()).into()
}

/// Side of a limit order: `Buy` → side byte `0`, `Sell` → `1`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LimitOrderSide {
    /// Bid — side byte `0`.
    Buy,
    /// Ask — side byte `1`.
    Sell,
}

impl LimitOrderSide {
    /// Wire side byte.
    #[must_use]
    pub const fn as_byte(self) -> u8 {
        match self {
            Self::Buy => 0,
            Self::Sell => 1,
        }
    }
}

/// Arguments for [`encode_place_limit_order_via_calldata`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaceLimitOrderViaArgs {
    /// Operator the order routes through (20-byte `mono` user address).
    pub operator: [u8; 20],
    /// 32-byte base token id accepted by the CLOB precompile.
    pub base: [u8; 32],
    /// 32-byte quote token id accepted by the CLOB precompile.
    pub quote: [u8; 32],
    /// `Buy` → side byte `0`; `Sell` → side byte `1`.
    pub side: LimitOrderSide,
    /// Limit price encoded as `uint256`.
    pub price: u128,
    /// Order amount encoded as `uint256`.
    pub amount: u128,
    /// `uint64` expiry block; `0` means no explicit expiry.
    pub expires_at_block: u64,
}

/// Encode `placeLimitOrderVia(...)` calldata for the operator-fee router
/// (`0x100B`).
///
/// The argument layout mirrors the direct CLOB `placeLimitOrder` encoder
/// exactly, prefixed with the left-padded `operator` address word. The
/// router strips that leading word and forwards the remaining six fields
/// to the CLOB unchanged.
#[must_use]
pub fn encode_place_limit_order_via_calldata(args: &PlaceLimitOrderViaArgs) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 7 * 32);
    out.extend_from_slice(&selector_place_limit_order_via());
    out.extend_from_slice(&address_word(args.operator));
    out.extend_from_slice(&args.base);
    out.extend_from_slice(&args.quote);
    out.extend_from_slice(&u256_word_u8(args.side.as_byte()));
    out.extend_from_slice(&u256_word_u128(args.price));
    out.extend_from_slice(&u256_word_u128(args.amount));
    out.extend_from_slice(&u256_word_u64(args.expires_at_block));
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

/// Encode `placeLimitOrderVia(...)` calldata as lower-case hex.
#[must_use]
pub fn encode_place_limit_order_via_calldata_hex(args: &PlaceLimitOrderViaArgs) -> String {
    calldata_to_hex(&encode_place_limit_order_via_calldata(args))
}

/// Off-chain declared operator-fee projection for wallet display.
///
/// `fee_amount = quote_basis * fee_bps / 10_000` (floored) where
/// `quote_basis = price * amount`. Advisory only — the binding fee is
/// skimmed on-chain at execution time from the same basis. Denominated in
/// the quote token.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OperatorFeeQuote {
    /// Declared operator fee in basis points.
    pub fee_bps: u16,
    /// `price * amount`, the quote-token basis the fee is skimmed from.
    pub quote_basis: u128,
    /// `quote_basis * fee_bps / 10_000`, floored — quote-token atoms.
    pub fee_amount: u128,
}

/// Error from [`quote_operator_fee`].
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum OperatorRouterError {
    /// `fee_bps` exceeds [`PROTOCOL_MAX_OPERATOR_FEE_BPS`].
    #[error("fee_bps {0} exceeds protocol ceiling {PROTOCOL_MAX_OPERATOR_FEE_BPS}")]
    FeeBpsTooHigh(u16),
    /// `price * amount` overflows `u128`.
    #[error("quote basis (price * amount) overflows u128")]
    QuoteBasisOverflow,
}

/// Compute the declared operator fee for a routed order. `fee_bps` is the
/// operator's registered fee (`lyth_operatorFeeConfig`). Rejects a
/// `fee_bps` above the protocol ceiling so a stale / hostile registration
/// can't be displayed as valid.
///
/// # Errors
/// - [`OperatorRouterError::FeeBpsTooHigh`] when `fee_bps` exceeds the cap.
/// - [`OperatorRouterError::QuoteBasisOverflow`] when `price * amount`
///   overflows `u128`.
pub fn quote_operator_fee(
    price: u128,
    amount: u128,
    fee_bps: u16,
) -> Result<OperatorFeeQuote, OperatorRouterError> {
    if fee_bps > PROTOCOL_MAX_OPERATOR_FEE_BPS {
        return Err(OperatorRouterError::FeeBpsTooHigh(fee_bps));
    }
    let quote_basis = price
        .checked_mul(amount)
        .ok_or(OperatorRouterError::QuoteBasisOverflow)?;
    // quote_basis * fee_bps fits in u256-space; widen to u128 math via the
    // bps cap (<= 100), so the product stays within u128 for any realistic
    // basis. Use u128 wrapping-free math: basis <= u128::MAX, bps <= 100.
    let fee_amount = quote_basis
        .checked_mul(u128::from(fee_bps))
        .ok_or(OperatorRouterError::QuoteBasisOverflow)?
        / 10_000;
    Ok(OperatorFeeQuote {
        fee_bps,
        quote_basis,
        fee_amount,
    })
}

/// `lyth_operatorRouterConfig` response — the router's static posture.
///
/// Mirrors the chain JSON exactly (camelCase). `enabled` reflects whether
/// the gateable router precompile is currently milestone-activated; the
/// read surfaces work regardless.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "OperatorRouterConfig.ts")
)]
pub struct OperatorRouterConfig {
    /// Response schema version (`1`).
    pub schema_version: u32,
    /// Data source — `"native_state_storage"`.
    pub source: String,
    /// Router precompile address (`0x100B`).
    pub router_address: String,
    /// On-chain protocol fee ceiling in bps (`100` = 1.00%).
    pub protocol_max_operator_fee_bps: u16,
    /// `true` when the router precompile is milestone-activated.
    pub enabled: bool,
}

/// `lyth_operatorFeeConfig` response — one operator's fee registration.
///
/// Mirrors the chain JSON exactly (camelCase). A zero recipient is the
/// "operator not registered" sentinel on-chain, so the chain returns a
/// not-found error rather than this shape in that case.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "OperatorFeeConfig.ts")
)]
pub struct OperatorFeeConfig {
    /// Response schema version (`1`).
    pub schema_version: u32,
    /// Data source — `"native_state_storage"`.
    pub source: String,
    /// Router precompile address (`0x100B`).
    pub precompile: String,
    /// Operator the registration belongs to (`mono` bech32m).
    pub operator: String,
    /// Configured fee recipient (`mono` bech32m).
    pub recipient: String,
    /// Operator surcharge in basis points.
    pub fee_bps: u16,
    /// `true` when the operator's surcharge is active.
    pub enabled: bool,
    /// Block height the operator was first registered at.
    pub registered_at_block: u64,
}

/// Decoded `OperatorFeeCharged` log (`0x100B`).
///
/// Mirrors `operator-router/src/events.rs::emit_operator_fee_charged_to_host`:
/// indexed `operator` / `user` / `market_id`; body `recipient`,
/// `quote_token`, `fee_amount`, `clob_order_id`. `clob_order_id` joins the
/// router fee to the CLOB `OrderPlaced` / `OrderMatched` rows.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "OperatorFeeChargedEvent.ts")
)]
pub struct OperatorFeeChargedEvent {
    /// Operator that charged the fee (`0x` 20-byte hex).
    pub operator: String,
    /// User that paid the fee (`0x` 20-byte hex).
    pub user: String,
    /// CLOB market id the order targets (`0x` 32 bytes).
    pub market_id: String,
    /// Fee recipient configured by the operator (`0x` 20-byte hex).
    pub recipient: String,
    /// Quote token the fee was skimmed in (`0x` 32 bytes).
    pub quote_token: String,
    /// Fee amount skimmed (quote-token atoms, decimal string).
    pub fee_amount: String,
    /// CLOB order id the routed placement produced (`0x` 32 bytes).
    pub clob_order_id: String,
}

/// Event-decode error.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum OperatorEventDecodeError {
    /// `topics.len()` is not `4`.
    #[error("OperatorFeeCharged expects 4 topics, got {0}")]
    TopicArity(usize),
    /// `topic0` is not `OperatorFeeCharged`.
    #[error("topic0 is not OperatorFeeCharged")]
    WrongTopic,
    /// A topic word is not 32 bytes.
    #[error("topic word must be 32 bytes")]
    BadTopicLen,
    /// `data.len()` is not `128`.
    #[error("OperatorFeeCharged expects 128 data bytes, got {0}")]
    BadDataLen(usize),
}

/// Decode an `OperatorFeeCharged` log into a typed
/// [`OperatorFeeChargedEvent`]. `topics` is the topic vector (`topic0`,
/// indexed `operator`, `user`, `market_id`); `data` is the non-indexed ABI
/// body `(address recipient, bytes32 quote_token, uint256 fee_amount,
/// bytes32 clob_order_id)`.
///
/// # Errors
/// Returns [`OperatorEventDecodeError`] on topic-arity, topic0,
/// topic-length, or data-length mismatch.
pub fn decode_operator_fee_charged_event(
    topics: &[[u8; 32]],
    data: &[u8],
) -> Result<OperatorFeeChargedEvent, OperatorEventDecodeError> {
    if topics.len() != 4 {
        return Err(OperatorEventDecodeError::TopicArity(topics.len()));
    }
    if topics[0] != topic_operator_fee_charged() {
        return Err(OperatorEventDecodeError::WrongTopic);
    }
    if data.len() != 4 * 32 {
        return Err(OperatorEventDecodeError::BadDataLen(data.len()));
    }
    Ok(OperatorFeeChargedEvent {
        operator: hex20_from_topic(&topics[1]),
        user: hex20_from_topic(&topics[2]),
        market_id: hex32(&topics[3]),
        recipient: hex20_from_topic_slice(&data[0..32]),
        quote_token: hex32_slice(&data[32..64]),
        fee_amount: u256_decimal(&data[64..96]),
        clob_order_id: hex32_slice(&data[96..128]),
    })
}

/// Return the router precompile address as lower-case hex.
#[must_use]
pub fn operator_router_address_hex() -> String {
    crate::address::address_to_hex(OPERATOR_ROUTER_ADDRESS)
}

fn address_word(addr: [u8; 20]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[12..32].copy_from_slice(&addr);
    out
}

fn u256_word_u8(value: u8) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[31] = value;
    out
}

fn u256_word_u64(value: u64) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[24..32].copy_from_slice(&value.to_be_bytes());
    out
}

fn u256_word_u128(value: u128) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[16..32].copy_from_slice(&value.to_be_bytes());
    out
}

fn hex_lower(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(2 + bytes.len() * 2);
    out.push_str("0x");
    for b in bytes {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

fn hex20_from_topic(topic: &[u8; 32]) -> String {
    hex_lower(&topic[12..32])
}

fn hex20_from_topic_slice(word: &[u8]) -> String {
    hex_lower(&word[12..32])
}

fn hex32(topic: &[u8; 32]) -> String {
    hex_lower(&topic[..])
}

fn hex32_slice(word: &[u8]) -> String {
    hex_lower(word)
}

fn u256_decimal(word: &[u8]) -> String {
    let mut v: u128 = 0;
    // The on-chain fee fits in u128; fold the low 16 bytes (the high 16
    // are zero for any realistic fee). Saturate the rendering if a value
    // ever exceeds u128 rather than panicking.
    for &b in &word[16..32] {
        v = v.wrapping_mul(256).wrapping_add(u128::from(b));
    }
    if word[..16].iter().any(|&b| b != 0) {
        // High bits set — render the full 32-byte big-endian value as
        // decimal via successive division to avoid any precision loss.
        return big_be_to_decimal(word);
    }
    v.to_string()
}

/// Render a 32-byte big-endian integer as a decimal string (no external
/// bigint dep — long division by 10).
fn big_be_to_decimal(word: &[u8]) -> String {
    let mut bytes = word.to_vec();
    if bytes.iter().all(|&b| b == 0) {
        return "0".to_string();
    }
    let mut digits = Vec::new();
    while bytes.iter().any(|&b| b != 0) {
        let mut rem = 0u32;
        for b in &mut bytes {
            let cur = (rem << 8) | u32::from(*b);
            *b = (cur / 10) as u8;
            rem = cur % 10;
        }
        digits.push(b'0' + rem as u8);
    }
    digits.reverse();
    String::from_utf8(digits).unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn router_address_is_100b() {
        let mut expected = [0u8; 20];
        expected[18] = 0x10;
        expected[19] = 0x0B;
        assert_eq!(OPERATOR_ROUTER_ADDRESS, expected);
        assert_eq!(
            operator_router_address_hex(),
            "0x000000000000000000000000000000000000100b"
        );
    }

    #[test]
    fn selectors_are_distinct() {
        let all = [
            selector_register_operator(),
            selector_update_operator(),
            selector_disable_operator(),
            selector_place_limit_order_via(),
        ];
        let mut seen = std::collections::BTreeSet::new();
        for s in all {
            assert!(seen.insert(s), "duplicate selector {s:?}");
        }
    }

    #[test]
    fn place_limit_order_via_calldata_layout() {
        let args = PlaceLimitOrderViaArgs {
            operator: [0xAB; 20],
            base: [0x11; 32],
            quote: [0x22; 32],
            side: LimitOrderSide::Sell,
            price: 5,
            amount: 100,
            expires_at_block: 7,
        };
        let calldata = encode_place_limit_order_via_calldata(&args);
        // selector + 7 words.
        assert_eq!(calldata.len(), 4 + 7 * 32);
        assert_eq!(&calldata[..4], &selector_place_limit_order_via());
        // operator word: 12 zero bytes then the 20-byte address.
        assert_eq!(&calldata[4..16], &[0u8; 12]);
        assert_eq!(&calldata[16..36], &[0xAB; 20]);
        // base + quote.
        assert_eq!(&calldata[36..68], &[0x11; 32]);
        assert_eq!(&calldata[68..100], &[0x22; 32]);
        // side byte (Sell = 1) right-aligned.
        assert_eq!(calldata[131], 1);
        // price low byte.
        assert_eq!(calldata[163], 5);
        // amount low byte.
        assert_eq!(calldata[195], 100);
        // expires_at_block low byte.
        assert_eq!(calldata[227], 7);
    }

    #[test]
    fn fee_quote_matches_basis_points() {
        // 1.00% of 1_000_000 quote atoms = 10_000.
        let q = quote_operator_fee(1_000, 1_000, 100).unwrap();
        assert_eq!(q.quote_basis, 1_000_000);
        assert_eq!(q.fee_amount, 10_000);
        assert_eq!(q.fee_bps, 100);
        // 0 bps → no fee.
        assert_eq!(quote_operator_fee(1_000, 1_000, 0).unwrap().fee_amount, 0);
    }

    #[test]
    fn fee_quote_rejects_over_cap() {
        assert_eq!(
            quote_operator_fee(1, 1, 101),
            Err(OperatorRouterError::FeeBpsTooHigh(101))
        );
    }

    #[test]
    fn fee_quote_floors() {
        // 1 bp of 99 = 0.0099 → floors to 0.
        assert_eq!(quote_operator_fee(99, 1, 1).unwrap().fee_amount, 0);
        // 1 bp of 10_000 = 1.
        assert_eq!(quote_operator_fee(10_000, 1, 1).unwrap().fee_amount, 1);
    }

    #[test]
    fn decode_operator_fee_charged_round_trip() {
        let operator = [0xAA; 20];
        let user = [0xBB; 20];
        let market_id = [0xC1; 32];
        let recipient = [0xDD; 20];
        let quote_token = [0xEE; 32];
        let clob_order_id = [0xFF; 32];

        let mut t1 = [0u8; 32];
        t1[12..32].copy_from_slice(&operator);
        let mut t2 = [0u8; 32];
        t2[12..32].copy_from_slice(&user);
        let topics = [topic_operator_fee_charged(), t1, t2, market_id];

        let mut data = Vec::new();
        let mut rec_word = [0u8; 32];
        rec_word[12..32].copy_from_slice(&recipient);
        data.extend_from_slice(&rec_word);
        data.extend_from_slice(&quote_token);
        data.extend_from_slice(&u256_word_u128(12_345));
        data.extend_from_slice(&clob_order_id);

        let ev = decode_operator_fee_charged_event(&topics, &data).unwrap();
        assert_eq!(ev.operator, hex_lower(&operator));
        assert_eq!(ev.user, hex_lower(&user));
        assert_eq!(ev.market_id, hex_lower(&market_id));
        assert_eq!(ev.recipient, hex_lower(&recipient));
        assert_eq!(ev.quote_token, hex_lower(&quote_token));
        assert_eq!(ev.fee_amount, "12345");
        assert_eq!(ev.clob_order_id, hex_lower(&clob_order_id));
    }

    #[test]
    fn decode_rejects_bad_shapes() {
        let topics = [topic_operator_fee_charged(), [0u8; 32], [0u8; 32]];
        assert_eq!(
            decode_operator_fee_charged_event(&topics, &[0u8; 128]),
            Err(OperatorEventDecodeError::TopicArity(3))
        );
        let four = [[0u8; 32]; 4];
        assert_eq!(
            decode_operator_fee_charged_event(&four, &[0u8; 128]),
            Err(OperatorEventDecodeError::WrongTopic)
        );
        let good_topics = [
            topic_operator_fee_charged(),
            [0u8; 32],
            [0u8; 32],
            [0u8; 32],
        ];
        assert_eq!(
            decode_operator_fee_charged_event(&good_topics, &[0u8; 64]),
            Err(OperatorEventDecodeError::BadDataLen(64))
        );
    }

    #[test]
    fn big_decimal_handles_high_bits() {
        // 2^128 rendered as decimal.
        let mut word = [0u8; 32];
        word[15] = 1; // byte 15 (0-indexed) set → 2^(8*16) = 2^128.
        assert_eq!(
            u256_decimal(&word),
            "340282366920938463463374607431768211456"
        );
    }
}
