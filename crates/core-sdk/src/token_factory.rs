//! Token-factory precompile (`0x1000`) calldata helpers.
//!
//! Mirrors `packages/ts/src/token-factory.ts`. The factory uses
//! Solidity-style 4-byte selectors with ABI v2 word encoding. These
//! helpers cover the current MRC20-like factory surface so callers do not
//! maintain their own selector table.

use sha3::{Digest, Keccak256};

use crate::consts::precompile_addresses::TOKEN_FACTORY;

/// Token-factory precompile address (`0x1000`).
pub const TOKEN_FACTORY_ADDRESS: [u8; 20] = TOKEN_FACTORY;

/// Native deposit (lythoshi) attached to `createToken`. 0.003 LYTH.
pub const TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI: u128 = 3_000_000_000_000_000;
/// Maximum UTF-8 name length.
pub const TOKEN_FACTORY_NAME_MAX_BYTES: usize = 256;
/// Maximum UTF-8 symbol length.
pub const TOKEN_FACTORY_SYMBOL_MAX_BYTES: usize = 256;
/// Maximum decimals.
pub const TOKEN_FACTORY_MAX_DECIMALS: u8 = 30;
/// Maximum creator fee in basis points.
pub const TOKEN_FACTORY_MAX_CREATOR_FEE_BPS: u16 = 10_000;
/// Domain tag for `tokenId` derivation.
pub const TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG: u8 = 0xfa;

/// Token capability flag bits (mirror `TOKEN_FACTORY_FLAGS`).
pub mod flags {
    /// Token may mint new supply.
    pub const MINTABLE: u32 = 1 << 0;
    /// Holders may burn.
    pub const BURNABLE: u32 = 1 << 1;
    /// Owner may pause transfers.
    pub const PAUSABLE: u32 = 1 << 2;
    /// Supply is fixed at creation.
    pub const FIXED_SUPPLY: u32 = 1 << 3;
    /// Creator opts into a per-transfer fee.
    pub const CREATOR_FEE_OPT_IN: u32 = 1 << 4;
    /// Token may be destroyed.
    pub const DESTRUCTIBLE: u32 = 1 << 5;
    /// Every known flag bit.
    pub const KNOWN_MASK: u32 =
        MINTABLE | BURNABLE | PAUSABLE | FIXED_SUPPLY | CREATOR_FEE_OPT_IN | DESTRUCTIBLE;
}

/// Canonical token-factory op signatures.
pub const SIG_CREATE_TOKEN: &str = "createToken(string,string,uint8,uint256,uint256,uint32,uint16)";
/// `transfer(bytes32,address,uint256)`.
pub const SIG_TRANSFER: &str = "transfer(bytes32,address,uint256)";
/// `transferFrom(bytes32,address,address,uint256)`.
pub const SIG_TRANSFER_FROM: &str = "transferFrom(bytes32,address,address,uint256)";
/// `approve(bytes32,address,uint256)`.
pub const SIG_APPROVE: &str = "approve(bytes32,address,uint256)";
/// `increaseAllowance(bytes32,address,uint256)`.
pub const SIG_INCREASE_ALLOWANCE: &str = "increaseAllowance(bytes32,address,uint256)";
/// `decreaseAllowance(bytes32,address,uint256)`.
pub const SIG_DECREASE_ALLOWANCE: &str = "decreaseAllowance(bytes32,address,uint256)";
/// `balanceOf(bytes32,address)`.
pub const SIG_BALANCE_OF: &str = "balanceOf(bytes32,address)";
/// `allowance(bytes32,address,address)`.
pub const SIG_ALLOWANCE: &str = "allowance(bytes32,address,address)";
/// `totalSupply(bytes32)`.
pub const SIG_TOTAL_SUPPLY: &str = "totalSupply(bytes32)";
/// `metadata(bytes32)`.
pub const SIG_METADATA: &str = "metadata(bytes32)";
/// `mint(bytes32,address,uint256)`.
pub const SIG_MINT: &str = "mint(bytes32,address,uint256)";
/// `burn(bytes32,uint256)`.
pub const SIG_BURN: &str = "burn(bytes32,uint256)";
/// `setPaused(bytes32,bool)`.
pub const SIG_SET_PAUSED: &str = "setPaused(bytes32,bool)";
/// `transferOwnership(bytes32,address)`.
pub const SIG_TRANSFER_OWNERSHIP: &str = "transferOwnership(bytes32,address)";
/// `destroyToken(bytes32)`.
pub const SIG_DESTROY_TOKEN: &str = "destroyToken(bytes32)";

/// Error from the token-factory helpers.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum TokenFactoryError {
    /// A flag bit outside [`flags::KNOWN_MASK`] was set.
    #[error("flags contain an unknown bit")]
    UnknownFlag,
    /// `MINTABLE` and `FIXED_SUPPLY` were both set.
    #[error("MINTABLE and FIXED_SUPPLY are mutually exclusive")]
    MintableFixedSupply,
    /// `CREATOR_FEE_OPT_IN` set but `creator_fee_bps` is zero.
    #[error("CREATOR_FEE_OPT_IN requires non-zero creatorFeeBps")]
    CreatorFeeRequired,
    /// `creator_fee_bps` non-zero without `CREATOR_FEE_OPT_IN`.
    #[error("creatorFeeBps must be 0 when CREATOR_FEE_OPT_IN is unset")]
    CreatorFeeUnexpected,
    /// `creator_fee_bps` exceeds [`TOKEN_FACTORY_MAX_CREATOR_FEE_BPS`].
    #[error("creatorFeeBps exceeds {TOKEN_FACTORY_MAX_CREATOR_FEE_BPS}")]
    CreatorFeeTooHigh,
    /// `decimals` exceeds [`TOKEN_FACTORY_MAX_DECIMALS`].
    #[error("decimals must be 0..={TOKEN_FACTORY_MAX_DECIMALS}")]
    DecimalsTooHigh,
    /// `name` or `symbol` is empty or exceeds its byte cap.
    #[error("{0} must be 1..=256 UTF-8 bytes")]
    TextRange(&'static str),
}

/// Arguments for [`encode_create_token_calldata`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateTokenArgs {
    /// Token name (1..=256 UTF-8 bytes).
    pub name: String,
    /// Token symbol (1..=256 UTF-8 bytes).
    pub symbol: String,
    /// Decimals (0..=30).
    pub decimals: u8,
    /// Initial minted supply.
    pub initial_supply: u128,
    /// Max supply; 0 means uncapped unless `FIXED_SUPPLY` is set.
    pub max_supply: u128,
    /// Capability flag bitfield (see [`flags`]).
    pub flags: u32,
    /// Creator fee in basis points (only with `CREATOR_FEE_OPT_IN`).
    pub creator_fee_bps: u16,
}

/// Return the token-factory precompile address (`0x1000`) as lower-case hex.
#[must_use]
pub fn token_factory_address_hex() -> String {
    addr_hex(&TOKEN_FACTORY_ADDRESS)
}

/// 4-byte selector (`keccak256(sig)[..4]`).
#[must_use]
pub fn selector_for(sig: &str) -> [u8; 4] {
    let digest = Keccak256::digest(sig.as_bytes());
    [digest[0], digest[1], digest[2], digest[3]]
}

/// Derive `token_id = keccak256(0xFA || creator[20] || nonce_be[8])`.
#[must_use]
pub fn derive_token_id(creator: [u8; 20], creator_token_nonce: u64) -> [u8; 32] {
    let mut buf = Vec::with_capacity(1 + 20 + 8);
    buf.push(TOKEN_FACTORY_TOKEN_ID_DOMAIN_TAG);
    buf.extend_from_slice(&creator);
    buf.extend_from_slice(&creator_token_nonce.to_be_bytes());
    Keccak256::digest(&buf).into()
}

/// Validate a flag bitfield + creator-fee pairing.
///
/// # Errors
/// Returns the matching [`TokenFactoryError`] variant on any violation.
pub fn validate_flags(flags_value: u32, creator_fee_bps: u16) -> Result<(), TokenFactoryError> {
    if flags_value & !flags::KNOWN_MASK != 0 {
        return Err(TokenFactoryError::UnknownFlag);
    }
    if flags_value & flags::MINTABLE != 0 && flags_value & flags::FIXED_SUPPLY != 0 {
        return Err(TokenFactoryError::MintableFixedSupply);
    }
    if flags_value & flags::CREATOR_FEE_OPT_IN != 0 {
        if creator_fee_bps == 0 {
            return Err(TokenFactoryError::CreatorFeeRequired);
        }
    } else if creator_fee_bps != 0 {
        return Err(TokenFactoryError::CreatorFeeUnexpected);
    }
    if creator_fee_bps > TOKEN_FACTORY_MAX_CREATOR_FEE_BPS {
        return Err(TokenFactoryError::CreatorFeeTooHigh);
    }
    Ok(())
}

/// Encode `createToken(...)` calldata. Submit with value
/// [`TOKEN_FACTORY_CREATE_DEPOSIT_LYTHOSHI`].
///
/// # Errors
/// Returns a [`TokenFactoryError`] on invalid text, decimals, flags, or fee.
pub fn encode_create_token_calldata(args: &CreateTokenArgs) -> Result<Vec<u8>, TokenFactoryError> {
    let name = text_bytes(&args.name, "name")?;
    let symbol = text_bytes(&args.symbol, "symbol")?;
    if args.decimals > TOKEN_FACTORY_MAX_DECIMALS {
        return Err(TokenFactoryError::DecimalsTooHigh);
    }
    validate_flags(args.flags, args.creator_fee_bps)?;

    let head_len = 7 * 32;
    let name_tail = dynamic_bytes_tail(&name);
    let symbol_offset = (head_len + name_tail.len()) as u128;

    let mut out = Vec::new();
    out.extend_from_slice(&selector_for(SIG_CREATE_TOKEN));
    out.extend_from_slice(&u256_word_u128(head_len as u128)); // name offset
    out.extend_from_slice(&u256_word_u128(symbol_offset));
    out.extend_from_slice(&u256_word_u128(u128::from(args.decimals)));
    out.extend_from_slice(&u256_word_u128(args.initial_supply));
    out.extend_from_slice(&u256_word_u128(args.max_supply));
    out.extend_from_slice(&u256_word_u128(u128::from(args.flags)));
    out.extend_from_slice(&u256_word_u128(u128::from(args.creator_fee_bps)));
    out.extend_from_slice(&name_tail);
    out.extend_from_slice(&dynamic_bytes_tail(&symbol));
    Ok(out)
}

/// `transfer(bytes32,address,uint256)`.
#[must_use]
pub fn encode_transfer_calldata(token_id: [u8; 32], to: [u8; 20], amount: u128) -> Vec<u8> {
    encode_bytes32_address_uint(SIG_TRANSFER, token_id, to, amount)
}

/// `transferFrom(bytes32,address,address,uint256)`.
#[must_use]
pub fn encode_transfer_from_calldata(
    token_id: [u8; 32],
    from: [u8; 20],
    to: [u8; 20],
    amount: u128,
) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 4 * 32);
    out.extend_from_slice(&selector_for(SIG_TRANSFER_FROM));
    out.extend_from_slice(&token_id);
    out.extend_from_slice(&address_word(from));
    out.extend_from_slice(&address_word(to));
    out.extend_from_slice(&u256_word_u128(amount));
    out
}

/// `approve(bytes32,address,uint256)`.
#[must_use]
pub fn encode_approve_calldata(token_id: [u8; 32], spender: [u8; 20], amount: u128) -> Vec<u8> {
    encode_bytes32_address_uint(SIG_APPROVE, token_id, spender, amount)
}

/// `increaseAllowance(bytes32,address,uint256)`.
#[must_use]
pub fn encode_increase_allowance_calldata(
    token_id: [u8; 32],
    spender: [u8; 20],
    delta: u128,
) -> Vec<u8> {
    encode_bytes32_address_uint(SIG_INCREASE_ALLOWANCE, token_id, spender, delta)
}

/// `decreaseAllowance(bytes32,address,uint256)`.
#[must_use]
pub fn encode_decrease_allowance_calldata(
    token_id: [u8; 32],
    spender: [u8; 20],
    delta: u128,
) -> Vec<u8> {
    encode_bytes32_address_uint(SIG_DECREASE_ALLOWANCE, token_id, spender, delta)
}

/// `balanceOf(bytes32,address)`.
#[must_use]
pub fn encode_balance_of_calldata(token_id: [u8; 32], holder: [u8; 20]) -> Vec<u8> {
    encode_bytes32_address(SIG_BALANCE_OF, token_id, holder)
}

/// `allowance(bytes32,address,address)`.
#[must_use]
pub fn encode_allowance_calldata(
    token_id: [u8; 32],
    owner: [u8; 20],
    spender: [u8; 20],
) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 3 * 32);
    out.extend_from_slice(&selector_for(SIG_ALLOWANCE));
    out.extend_from_slice(&token_id);
    out.extend_from_slice(&address_word(owner));
    out.extend_from_slice(&address_word(spender));
    out
}

/// `totalSupply(bytes32)`.
#[must_use]
pub fn encode_total_supply_calldata(token_id: [u8; 32]) -> Vec<u8> {
    encode_bytes32(SIG_TOTAL_SUPPLY, token_id)
}

/// `metadata(bytes32)`.
#[must_use]
pub fn encode_metadata_calldata(token_id: [u8; 32]) -> Vec<u8> {
    encode_bytes32(SIG_METADATA, token_id)
}

/// `mint(bytes32,address,uint256)`.
#[must_use]
pub fn encode_mint_calldata(token_id: [u8; 32], to: [u8; 20], amount: u128) -> Vec<u8> {
    encode_bytes32_address_uint(SIG_MINT, token_id, to, amount)
}

/// `burn(bytes32,uint256)`.
#[must_use]
pub fn encode_burn_calldata(token_id: [u8; 32], amount: u128) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 2 * 32);
    out.extend_from_slice(&selector_for(SIG_BURN));
    out.extend_from_slice(&token_id);
    out.extend_from_slice(&u256_word_u128(amount));
    out
}

/// `setPaused(bytes32,bool)`.
#[must_use]
pub fn encode_set_paused_calldata(token_id: [u8; 32], paused: bool) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 2 * 32);
    out.extend_from_slice(&selector_for(SIG_SET_PAUSED));
    out.extend_from_slice(&token_id);
    let mut bool_word = [0u8; 32];
    bool_word[31] = u8::from(paused);
    out.extend_from_slice(&bool_word);
    out
}

/// `transferOwnership(bytes32,address)`.
#[must_use]
pub fn encode_transfer_ownership_calldata(token_id: [u8; 32], new_owner: [u8; 20]) -> Vec<u8> {
    encode_bytes32_address(SIG_TRANSFER_OWNERSHIP, token_id, new_owner)
}

/// `destroyToken(bytes32)`.
#[must_use]
pub fn encode_destroy_calldata(token_id: [u8; 32]) -> Vec<u8> {
    encode_bytes32(SIG_DESTROY_TOKEN, token_id)
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

// --- internals -------------------------------------------------------

fn text_bytes(value: &str, label: &'static str) -> Result<Vec<u8>, TokenFactoryError> {
    let bytes = value.as_bytes();
    if bytes.is_empty() || bytes.len() > TOKEN_FACTORY_NAME_MAX_BYTES {
        return Err(TokenFactoryError::TextRange(label));
    }
    Ok(bytes.to_vec())
}

fn dynamic_bytes_tail(bytes: &[u8]) -> Vec<u8> {
    let mut out = u256_word_u128(bytes.len() as u128).to_vec();
    out.extend_from_slice(bytes);
    let pad = (32 - (bytes.len() % 32)) % 32;
    out.extend(std::iter::repeat_n(0u8, pad));
    out
}

fn encode_bytes32(sig: &str, token_id: [u8; 32]) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 32);
    out.extend_from_slice(&selector_for(sig));
    out.extend_from_slice(&token_id);
    out
}

fn encode_bytes32_address(sig: &str, token_id: [u8; 32], address: [u8; 20]) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 2 * 32);
    out.extend_from_slice(&selector_for(sig));
    out.extend_from_slice(&token_id);
    out.extend_from_slice(&address_word(address));
    out
}

fn encode_bytes32_address_uint(
    sig: &str,
    token_id: [u8; 32],
    address: [u8; 20],
    amount: u128,
) -> Vec<u8> {
    let mut out = Vec::with_capacity(4 + 3 * 32);
    out.extend_from_slice(&selector_for(sig));
    out.extend_from_slice(&token_id);
    out.extend_from_slice(&address_word(address));
    out.extend_from_slice(&u256_word_u128(amount));
    out
}

fn address_word(addr: [u8; 20]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[12..32].copy_from_slice(&addr);
    out
}

fn u256_word_u128(value: u128) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[16..32].copy_from_slice(&value.to_be_bytes());
    out
}

fn addr_hex(addr: &[u8; 20]) -> String {
    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for b in addr {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hexb(s: &str) -> Vec<u8> {
        let body = s.strip_prefix("0x").unwrap_or(s);
        (0..body.len() / 2)
            .map(|i| u8::from_str_radix(&body[i * 2..i * 2 + 2], 16).unwrap())
            .collect()
    }

    #[test]
    fn address_and_selectors_match_ts_golden() {
        assert_eq!(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY);
        assert_eq!(
            token_factory_address_hex(),
            "0x0000000000000000000000000000000000001000"
        );
        // Golden selectors reused from packages/ts/tests/token-factory.test.ts.
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_CREATE_TOKEN)),
            "0x86538be6"
        );
        assert_eq!(calldata_to_hex(&selector_for(SIG_TRANSFER)), "0x3feb1bd8");
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_TRANSFER_FROM)),
            "0x500d2f6d"
        );
        assert_eq!(calldata_to_hex(&selector_for(SIG_APPROVE)), "0xbf1ed1eb");
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_INCREASE_ALLOWANCE)),
            "0x85aad644"
        );
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_DECREASE_ALLOWANCE)),
            "0x80a98026"
        );
        assert_eq!(calldata_to_hex(&selector_for(SIG_BALANCE_OF)), "0xc2038236");
        assert_eq!(calldata_to_hex(&selector_for(SIG_ALLOWANCE)), "0xe88a3178");
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_TOTAL_SUPPLY)),
            "0xb524abcf"
        );
        assert_eq!(calldata_to_hex(&selector_for(SIG_METADATA)), "0x7122ba06");
        assert_eq!(calldata_to_hex(&selector_for(SIG_MINT)), "0x7ed9db59");
        assert_eq!(calldata_to_hex(&selector_for(SIG_BURN)), "0x7a408454");
        assert_eq!(calldata_to_hex(&selector_for(SIG_SET_PAUSED)), "0x8ea9db9e");
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_TRANSFER_OWNERSHIP)),
            "0xef5d6bbb"
        );
        assert_eq!(
            calldata_to_hex(&selector_for(SIG_DESTROY_TOKEN)),
            "0xeebfb72f"
        );
    }

    #[test]
    fn derives_token_id_like_ts_golden() {
        // Golden vector reused from packages/ts/tests/token-factory.test.ts:
        // deriveTokenFactoryTokenId(0x11*20, 7).
        let token_id = derive_token_id([0x11; 20], 7);
        assert_eq!(
            calldata_to_hex(&token_id),
            "0x292c1c3bf8740a122c32639a4065f14f4b43487eb329202c683b2ad71f00c16c"
        );
    }

    #[test]
    fn encodes_create_token_abi_v2_like_ts_golden() {
        // Golden vector reused from packages/ts/tests/token-factory.test.ts:
        // encodeCreateFixedSupplyMrc20Calldata("Dice Token","DICE",18,1e24,burnable).
        let supply = 1_000_000_000_000_000_000_000_000u128;
        let calldata = encode_create_token_calldata(&CreateTokenArgs {
            name: "Dice Token".to_owned(),
            symbol: "DICE".to_owned(),
            decimals: 18,
            initial_supply: supply,
            max_supply: supply,
            flags: flags::FIXED_SUPPLY | flags::BURNABLE,
            creator_fee_bps: 0,
        })
        .unwrap();
        let expected = [
            "0x86538be6",
            "00000000000000000000000000000000000000000000000000000000000000e0",
            "0000000000000000000000000000000000000000000000000000000000000120",
            "0000000000000000000000000000000000000000000000000000000000000012",
            "00000000000000000000000000000000000000000000d3c21bcecceda1000000",
            "00000000000000000000000000000000000000000000d3c21bcecceda1000000",
            "000000000000000000000000000000000000000000000000000000000000000a",
            "0000000000000000000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000000000000000000a",
            "4469636520546f6b656e00000000000000000000000000000000000000000000",
            "0000000000000000000000000000000000000000000000000000000000000004",
            "4449434500000000000000000000000000000000000000000000000000000000",
        ]
        .concat();
        assert_eq!(calldata_to_hex(&calldata), expected);
    }

    #[test]
    fn read_write_calldata_helpers_match_ts_golden() {
        let token = [0x22u8; 32];
        let owner = [0x11u8; 20];
        let recipient = [0x33u8; 20];
        let spender = [0x44u8; 20];

        assert_eq!(
            calldata_to_hex(&encode_transfer_calldata(token, recipient, 5)),
            format!(
                "0x3feb1bd8{}000000000000000000000000{}{}",
                "22".repeat(32),
                "33".repeat(20),
                "0".repeat(63) + "5",
            )
        );
        assert_eq!(
            calldata_to_hex(&encode_transfer_from_calldata(token, owner, recipient, 5)),
            format!(
                "0x500d2f6d{}000000000000000000000000{}000000000000000000000000{}{}",
                "22".repeat(32),
                "11".repeat(20),
                "33".repeat(20),
                "0".repeat(63) + "5",
            )
        );
        assert_eq!(
            calldata_to_hex(&encode_balance_of_calldata(token, owner)),
            format!(
                "0xc2038236{}000000000000000000000000{}",
                "22".repeat(32),
                "11".repeat(20),
            )
        );
        assert_eq!(
            calldata_to_hex(&encode_total_supply_calldata(token)),
            format!("0xb524abcf{}", "22".repeat(32))
        );
        assert_eq!(
            calldata_to_hex(&encode_set_paused_calldata(token, true)),
            format!("0x8ea9db9e{}{}", "22".repeat(32), "0".repeat(63) + "1")
        );
        assert_eq!(
            calldata_to_hex(&encode_destroy_calldata(token)),
            format!("0xeebfb72f{}", "22".repeat(32))
        );
        // sanity: approve/allowance use the spender word.
        assert_eq!(
            &encode_approve_calldata(token, spender, 9)[..4],
            &selector_for(SIG_APPROVE)
        );
        assert_eq!(
            &encode_allowance_calldata(token, owner, spender)[..4],
            &selector_for(SIG_ALLOWANCE)
        );
    }

    #[test]
    fn validate_flags_matches_ts_rules() {
        assert_eq!(
            validate_flags(flags::MINTABLE | flags::FIXED_SUPPLY, 0),
            Err(TokenFactoryError::MintableFixedSupply)
        );
        assert_eq!(
            validate_flags(0, 1),
            Err(TokenFactoryError::CreatorFeeUnexpected)
        );
        assert_eq!(
            validate_flags(flags::CREATOR_FEE_OPT_IN, 0),
            Err(TokenFactoryError::CreatorFeeRequired)
        );
        assert!(validate_flags(flags::CREATOR_FEE_OPT_IN, 250).is_ok());
        assert_eq!(
            encode_create_token_calldata(&CreateTokenArgs {
                name: String::new(),
                symbol: "EMPTY".to_owned(),
                decimals: 18,
                initial_supply: 0,
                max_supply: 0,
                flags: 0,
                creator_fee_bps: 0,
            }),
            Err(TokenFactoryError::TextRange("name"))
        );
        assert_eq!(
            encode_create_token_calldata(&CreateTokenArgs {
                name: "Too Many Decimals".to_owned(),
                symbol: "TMD".to_owned(),
                decimals: 31,
                initial_supply: 0,
                max_supply: 0,
                flags: 0,
                creator_fee_bps: 0,
            }),
            Err(TokenFactoryError::DecimalsTooHigh)
        );
    }

    #[test]
    fn cross_check_against_hex_helper() {
        // hexb is exercised so the helper participates in the gate.
        assert_eq!(hexb("0x0102"), vec![0x01, 0x02]);
    }
}
