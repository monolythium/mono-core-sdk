//! CLOB precompile (`0x1001`) calldata helpers.
//!
//! Mirrors the precompile encoders in `packages/ts/src/market-actions.ts`
//! (the `0x1001` selectors + market-id derivation). The native-module
//! bincode path (`encodeNativeSpot*`) is out of scope here; this module
//! covers the precompile calldata surface only.

use sha3::{Digest, Keccak256};

use crate::consts::precompile_addresses::CLOB;

/// CLOB precompile address (`0x1001`).
pub const CLOB_ADDRESS: [u8; 20] = CLOB;

/// Domain tag for `marketId` derivation.
pub const CLOB_MARKET_ID_DOMAIN_TAG: u8 = 0xc1;

/// `placeLimitOrder(bytes32,bytes32,uint8,uint256,uint256,uint64)`.
pub const SELECTOR_PLACE_LIMIT_ORDER: [u8; 4] = [0x24, 0x68, 0x78, 0x6f];
/// `placeMarketOrder(bytes32,bytes32,uint8,uint256,uint16)`.
pub const SELECTOR_PLACE_MARKET_ORDER: [u8; 4] = [0xb9, 0xb1, 0xfa, 0x86];
/// `placeMarketOrderEx(bytes32,bytes32,uint8,uint256,uint16,uint8)`.
pub const SELECTOR_PLACE_MARKET_ORDER_EX: [u8; 4] = [0xa6, 0xf0, 0x92, 0xf0];
/// `cancelOrder(bytes32)`.
pub const SELECTOR_CANCEL_ORDER: [u8; 4] = [0x74, 0x89, 0xec, 0x23];

/// Order side: `Buy` → side byte `0`; `Sell` → side byte `1`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpotSide {
    /// Bid — side byte `0`.
    Buy,
    /// Ask — side byte `1`.
    Sell,
}

impl SpotSide {
    /// Wire side byte.
    #[must_use]
    pub const fn as_byte(self) -> u8 {
        match self {
            Self::Buy => 0,
            Self::Sell => 1,
        }
    }
}

/// Market-order remainder handling for `placeMarketOrderEx`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarketOrderMode {
    /// Refund the unfilled remainder (legacy semantics) — mode byte `0`.
    FillOrRefund,
    /// Rest the unfilled remainder at the slippage cap — mode byte `1`.
    FillOrRestAtCap,
}

impl MarketOrderMode {
    /// Wire mode byte.
    #[must_use]
    pub const fn as_byte(self) -> u8 {
        match self {
            Self::FillOrRefund => 0,
            Self::FillOrRestAtCap => 1,
        }
    }
}

/// Arguments for [`encode_place_limit_order_calldata`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaceLimitOrderArgs {
    /// 32-byte base token id.
    pub base_token_id: [u8; 32],
    /// 32-byte quote token id.
    pub quote_token_id: [u8; 32],
    /// Order side.
    pub side: SpotSide,
    /// Limit price (`uint256`).
    pub price: u128,
    /// Order quantity (`uint256`).
    pub quantity: u128,
    /// Expiry block (`uint64`); `0` means no explicit expiry.
    pub expiry_block: u64,
}

/// Arguments for [`encode_place_market_order_calldata`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaceMarketOrderArgs {
    /// 32-byte base token id.
    pub base_token_id: [u8; 32],
    /// 32-byte quote token id.
    pub quote_token_id: [u8; 32],
    /// Order side.
    pub side: SpotSide,
    /// Order quantity (`uint256`).
    pub quantity: u128,
    /// Slippage bound in basis points (`uint16`).
    pub max_slippage_bps: u16,
}

/// Return the CLOB precompile address (`0x1001`) as lower-case hex.
#[must_use]
pub fn clob_address_hex() -> String {
    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for b in &CLOB_ADDRESS {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Derive `market_id = keccak256(0xC1 || base_token_id || quote_token_id)`.
#[must_use]
pub fn derive_clob_market_id(base_token_id: [u8; 32], quote_token_id: [u8; 32]) -> [u8; 32] {
    let mut buf = Vec::with_capacity(1 + 32 + 32);
    buf.push(CLOB_MARKET_ID_DOMAIN_TAG);
    buf.extend_from_slice(&base_token_id);
    buf.extend_from_slice(&quote_token_id);
    Keccak256::digest(&buf).into()
}

/// Encode `placeLimitOrder(...)` calldata for the CLOB (`0x1001`).
#[must_use]
pub fn encode_place_limit_order_calldata(args: &PlaceLimitOrderArgs) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 6 * 32);
    out.extend_from_slice(&SELECTOR_PLACE_LIMIT_ORDER);
    out.extend_from_slice(&args.base_token_id);
    out.extend_from_slice(&args.quote_token_id);
    out.extend_from_slice(&u256_word_u8(args.side.as_byte()));
    out.extend_from_slice(&u256_word_u128(args.price));
    out.extend_from_slice(&u256_word_u128(args.quantity));
    out.extend_from_slice(&u256_word_u64(args.expiry_block));
    out
}

/// Encode `placeMarketOrder(...)` calldata for the CLOB (`0x1001`).
#[must_use]
pub fn encode_place_market_order_calldata(args: &PlaceMarketOrderArgs) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 5 * 32);
    out.extend_from_slice(&SELECTOR_PLACE_MARKET_ORDER);
    out.extend_from_slice(&args.base_token_id);
    out.extend_from_slice(&args.quote_token_id);
    out.extend_from_slice(&u256_word_u8(args.side.as_byte()));
    out.extend_from_slice(&u256_word_u128(args.quantity));
    out.extend_from_slice(&u256_word_u16(args.max_slippage_bps));
    out
}

/// Encode `placeMarketOrderEx(...)` calldata for the CLOB (`0x1001`).
#[must_use]
pub fn encode_place_market_order_ex_calldata(
    args: &PlaceMarketOrderArgs,
    mode: MarketOrderMode,
) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 6 * 32);
    out.extend_from_slice(&SELECTOR_PLACE_MARKET_ORDER_EX);
    out.extend_from_slice(&args.base_token_id);
    out.extend_from_slice(&args.quote_token_id);
    out.extend_from_slice(&u256_word_u8(args.side.as_byte()));
    out.extend_from_slice(&u256_word_u128(args.quantity));
    out.extend_from_slice(&u256_word_u16(args.max_slippage_bps));
    out.extend_from_slice(&u256_word_u8(mode.as_byte()));
    out
}

/// Encode `cancelOrder(bytes32)` calldata for the CLOB (`0x1001`).
#[must_use]
pub fn encode_cancel_order_calldata(order_id: [u8; 32]) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 32);
    out.extend_from_slice(&SELECTOR_CANCEL_ORDER);
    out.extend_from_slice(&order_id);
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

fn u256_word_u8(value: u8) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[31] = value;
    out
}

fn u256_word_u16(value: u16) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[30..32].copy_from_slice(&value.to_be_bytes());
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

#[cfg(test)]
mod tests {
    use super::*;

    fn rep(byte: u8) -> [u8; 32] {
        [byte; 32]
    }

    #[test]
    fn address_and_selectors_pinned() {
        assert_eq!(CLOB_ADDRESS, CLOB);
        assert_eq!(
            clob_address_hex(),
            "0x0000000000000000000000000000000000001001"
        );
        // Golden selectors reused from packages/ts/tests/market-actions.test.ts.
        assert_eq!(calldata_to_hex(&SELECTOR_PLACE_LIMIT_ORDER), "0x2468786f");
        assert_eq!(calldata_to_hex(&SELECTOR_PLACE_MARKET_ORDER), "0xb9b1fa86");
        assert_eq!(
            calldata_to_hex(&SELECTOR_PLACE_MARKET_ORDER_EX),
            "0xa6f092f0"
        );
        assert_eq!(calldata_to_hex(&SELECTOR_CANCEL_ORDER), "0x7489ec23");
    }

    #[test]
    fn derives_market_id_like_ts_golden() {
        // Golden vector reused from packages/ts/tests/market-actions.test.ts:
        // deriveClobMarketId(0xa1*32, 0xa2*32).
        let base = rep(0xa1);
        let quote = rep(0xa2);
        let market_id = derive_clob_market_id(base, quote);
        assert_eq!(
            calldata_to_hex(&market_id),
            "0xc707fbb655b8ef26fadeff8808adc1206317f5b392ee7ab76a5e6b2f8f8b32b9"
        );
        // Order-sensitive: swapping base/quote changes the id.
        assert_ne!(derive_clob_market_id(quote, base), market_id);
    }

    #[test]
    fn encodes_place_limit_order_like_ts_golden() {
        // Golden layout reused from packages/ts/tests/market-actions.test.ts:
        // base 0xa1*32, quote 0xa2*32, buy, price 123456789, qty 42, expiry 500.
        let calldata = encode_place_limit_order_calldata(&PlaceLimitOrderArgs {
            base_token_id: rep(0xa1),
            quote_token_id: rep(0xa2),
            side: SpotSide::Buy,
            price: 123_456_789,
            quantity: 42,
            expiry_block: 500,
        });
        let hex = calldata_to_hex(&calldata);
        assert!(hex.starts_with("0x2468786f"));
        assert_eq!((hex.len() - 2) / 2, 4 + 6 * 32);
        // Slices mirror the TS golden assertions (hex offsets, sans "0x").
        let body = &hex[2..];
        assert_eq!(&body[8..72], &"a1".repeat(32));
        assert_eq!(&body[72..136], &"a2".repeat(32));
        assert_eq!(&body[136..200], &"0".repeat(64)); // side = buy (0)
        assert_eq!(&body[200..264], &(format!("{}075bcd15", "0".repeat(56)))); // price
        assert_eq!(&body[264..328], &(format!("{}2a", "0".repeat(62)))); // qty 42
        assert_eq!(&body[328..], &(format!("{}1f4", "0".repeat(61)))); // expiry 500
    }

    #[test]
    fn encodes_sell_side_and_default_expiry() {
        let calldata = encode_place_limit_order_calldata(&PlaceLimitOrderArgs {
            base_token_id: rep(0xa1),
            quote_token_id: rep(0xa2),
            side: SpotSide::Sell,
            price: 123_456_789,
            quantity: 42,
            expiry_block: 0,
        });
        let body = &calldata_to_hex(&calldata)[2..];
        assert_eq!(&body[136..200], &(format!("{}1", "0".repeat(63)))); // side = sell (1)
        assert_eq!(&body[328..], &"0".repeat(64)); // expiry 0
    }

    #[test]
    fn encodes_market_orders_and_cancel() {
        let market = encode_place_market_order_calldata(&PlaceMarketOrderArgs {
            base_token_id: rep(0xa1),
            quote_token_id: rep(0xa2),
            side: SpotSide::Sell,
            quantity: 42,
            max_slippage_bps: 250,
        });
        assert!(calldata_to_hex(&market).starts_with("0xb9b1fa86"));
        assert_eq!((market.len()), 4 + 5 * 32);

        let market_ex = encode_place_market_order_ex_calldata(
            &PlaceMarketOrderArgs {
                base_token_id: rep(0xa1),
                quote_token_id: rep(0xa2),
                side: SpotSide::Sell,
                quantity: 42,
                max_slippage_bps: 250,
            },
            MarketOrderMode::FillOrRestAtCap,
        );
        assert!(calldata_to_hex(&market_ex).starts_with("0xa6f092f0"));
        assert_eq!(market_ex.len(), 4 + 6 * 32);
        assert_eq!(market_ex[market_ex.len() - 1], 1); // mode = fill-or-rest-at-cap

        // cancelOrder golden: selector || 0xb3*32.
        assert_eq!(
            calldata_to_hex(&encode_cancel_order_calldata(rep(0xb3))),
            format!("0x7489ec23{}", "b3".repeat(32))
        );
    }
}
