//! Oracle-precompile (`0x1009`) event decode types + read-method
//! signatures (MB-6).
//!
//! Mirrors `mono-core/crates/precompiles/platform/oracle/src/events.rs`:
//! the canonical event signatures, the topic0 hashes, and a pure
//! decoder that turns one EVM log (topics + data) into a typed
//! [`OracleEvent`]. The decoder is the exact inverse of the chain-side
//! `emit_*` helpers.

use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

use crate::consts::precompile_addresses;

#[cfg(feature = "ts-bindings")]
use ts_rs::TS;

/// Canonical oracle event declaration strings — the wire surface.
pub const ORACLE_EVENT_SIGS: &[&str] = &[
    "OracleRoundFinalized(bytes32,uint64,uint256,uint64,uint32)",
    "ObservationSubmitted(bytes32,uint64,address,uint256,uint64)",
    "FeedAdded(bytes32,uint8,uint16,uint32,uint32)",
    "FeedUpdated(bytes32,uint8,uint16,uint32,uint32)",
    "OracleFraudSlashed(bytes32,uint64,address,bytes32)",
    "OracleAdminUpdated(address)",
    "OracleWriterAdded(address,address)",
    "OracleWriterRemoved(address,address)",
];

const SIG_ROUND_FINALIZED: &str = "OracleRoundFinalized(bytes32,uint64,uint256,uint64,uint32)";
const SIG_OBSERVATION_SUBMITTED: &str =
    "ObservationSubmitted(bytes32,uint64,address,uint256,uint64)";
const SIG_FEED_ADDED: &str = "FeedAdded(bytes32,uint8,uint16,uint32,uint32)";
const SIG_FEED_UPDATED: &str = "FeedUpdated(bytes32,uint8,uint16,uint32,uint32)";
const SIG_FRAUD_SLASHED: &str = "OracleFraudSlashed(bytes32,uint64,address,bytes32)";
const SIG_ADMIN_UPDATED: &str = "OracleAdminUpdated(address)";
const SIG_WRITER_ADDED: &str = "OracleWriterAdded(address,address)";
const SIG_WRITER_REMOVED: &str = "OracleWriterRemoved(address,address)";

/// Return the oracle precompile address (`0x1009`) as lower-case hex.
#[must_use]
pub fn oracle_address_hex() -> String {
    crate::address::address_to_hex(precompile_addresses::ORACLE)
}

/// topic0 (`keccak256(sig)`) for an event signature.
fn topic0(sig: &str) -> [u8; 32] {
    Keccak256::digest(sig.as_bytes()).into()
}

/// Typed view of one oracle-precompile log (MB-6).
///
/// One variant per chain-side emit helper. `feed_id`, `evidence_hash`,
/// and address fields are `0x`-prefixed hex; `computed_median` / `value`
/// are decimal strings of their on-chain `uint256` value.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[cfg_attr(feature = "ts-bindings", derive(TS))]
#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "OracleEvent.ts"))]
pub enum OracleEvent {
    /// `OracleRoundFinalized` — a round closed with a canonical median.
    #[serde(rename_all = "camelCase")]
    RoundFinalized {
        /// Feed the round belongs to (`0x` 32 bytes).
        feed_id: String,
        /// Round identifier.
        #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
        round_id: u64,
        /// Computed median price (decimal string).
        computed_median: String,
        /// Block at which the round finalized.
        #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
        finalized_at_block: u64,
        /// Number of observations contributing to the median.
        observations_len: u32,
    },
    /// `ObservationSubmitted` — one writer posted a signed share.
    #[serde(rename_all = "camelCase")]
    ObservationSubmitted {
        /// Feed the observation targets (`0x` 32 bytes).
        feed_id: String,
        /// Round the observation contributes to.
        #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
        round_id: u64,
        /// Writer that submitted the observation (`0x` address).
        writer: String,
        /// Reported price (decimal string).
        value: String,
        /// Writer-observed timestamp.
        #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
        observed_at: u64,
    },
    /// `OracleFraudSlashed` — a fraud proof fired the slashing hook.
    #[serde(rename_all = "camelCase")]
    FraudSlashed {
        /// Feed the slashed writer operated on (`0x` 32 bytes).
        feed_id: String,
        /// Round the fraud proof targeted.
        #[cfg_attr(feature = "ts-bindings", ts(type = "string"))]
        round_id: u64,
        /// Slashed writer (`0x` address).
        writer: String,
        /// Evidence hash carried in the slash record (`0x` 32 bytes).
        evidence_hash: String,
    },
    /// `FeedAdded` — a new feed was registered.
    #[serde(rename_all = "camelCase")]
    FeedAdded {
        /// Feed id (`0x` 32 bytes).
        feed_id: String,
        /// Price decimals.
        decimals: u8,
        /// Minimum signers to close a round.
        min_signers: u16,
        /// Circuit-breaker bound in basis points.
        circuit_breaker_bps: u32,
        /// Number of allowed writers at registration.
        allowed_writers_len: u32,
    },
    /// `FeedUpdated` — an existing feed's config changed.
    #[serde(rename_all = "camelCase")]
    FeedUpdated {
        /// Feed id (`0x` 32 bytes).
        feed_id: String,
        /// Price decimals.
        decimals: u8,
        /// Minimum signers to close a round.
        min_signers: u16,
        /// Circuit-breaker bound in basis points.
        circuit_breaker_bps: u32,
        /// Number of allowed writers after the update.
        allowed_writers_len: u32,
    },
    /// `OracleAdminUpdated` — the oracle admin address rotated.
    #[serde(rename_all = "camelCase")]
    AdminUpdated {
        /// New oracle admin (`0x` address).
        admin: String,
    },
    /// `OracleWriterAdded` — a writer joined the on-chain writer set.
    #[serde(rename_all = "camelCase")]
    WriterAdded {
        /// Admin that authorized the addition (`0x` address).
        admin: String,
        /// Writer that was added (`0x` address).
        writer: String,
    },
    /// `OracleWriterRemoved` — a writer left the on-chain writer set.
    #[serde(rename_all = "camelCase")]
    WriterRemoved {
        /// Admin that authorized the removal (`0x` address).
        admin: String,
        /// Writer that was removed (`0x` address).
        writer: String,
    },
}

/// Typed decode failure for [`decode_oracle_event`].
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum OracleEventDecodeError {
    /// The log carried no topics — every oracle event is at least `[topic0]`.
    #[error("event record has no topics")]
    NoTopics,
    /// `topic0` did not match any known oracle event signature.
    #[error("unknown oracle event topic0")]
    UnknownTopic,
    /// The topic count did not match the event's indexed-arg count.
    #[error("event {event} expected {expected} topics, found {found}")]
    TopicArity {
        /// Event name.
        event: &'static str,
        /// Expected topic count (topic0 + indexed args).
        expected: usize,
        /// Topic count actually present.
        found: usize,
    },
    /// The non-indexed data segment was the wrong length.
    #[error("event {event} expected {expected} data bytes, found {found}")]
    DataLength {
        /// Event name.
        event: &'static str,
        /// Expected data length in bytes.
        expected: usize,
        /// Data length actually present.
        found: usize,
    },
}

/// Decode one EVM log (32-byte `topics`, `data`) emitted by the oracle
/// precompile into a typed [`OracleEvent`].
///
/// Pure + deterministic: dispatches on `topic0`, then reads fixed-width
/// 32-byte words. The exact inverse of the chain-side `emit_*` helpers.
///
/// # Errors
/// Returns [`OracleEventDecodeError`] for a foreign `topic0`, a topic
/// arity mismatch, or a data-length mismatch.
pub fn decode_oracle_event(
    topics: &[[u8; 32]],
    data: &[u8],
) -> Result<OracleEvent, OracleEventDecodeError> {
    let topic = *topics.first().ok_or(OracleEventDecodeError::NoTopics)?;

    if topic == topic0(SIG_ROUND_FINALIZED) {
        check_arity("OracleRoundFinalized", 3, topics.len())?;
        check_data("OracleRoundFinalized", 3 * 32, data.len())?;
        return Ok(OracleEvent::RoundFinalized {
            feed_id: hex32(&topics[1]),
            round_id: u64_from_topic(&topics[2]),
            computed_median: u256_decimal(&data[0..32]),
            finalized_at_block: u64_from_word(&data[32..64]),
            observations_len: u32_from_word(&data[64..96]),
        });
    }
    if topic == topic0(SIG_OBSERVATION_SUBMITTED) {
        check_arity("ObservationSubmitted", 4, topics.len())?;
        check_data("ObservationSubmitted", 2 * 32, data.len())?;
        return Ok(OracleEvent::ObservationSubmitted {
            feed_id: hex32(&topics[1]),
            round_id: u64_from_topic(&topics[2]),
            writer: address_from_topic(&topics[3]),
            value: u256_decimal(&data[0..32]),
            observed_at: u64_from_word(&data[32..64]),
        });
    }
    if topic == topic0(SIG_FRAUD_SLASHED) {
        check_arity("OracleFraudSlashed", 4, topics.len())?;
        check_data("OracleFraudSlashed", 32, data.len())?;
        return Ok(OracleEvent::FraudSlashed {
            feed_id: hex32(&topics[1]),
            round_id: u64_from_topic(&topics[2]),
            writer: address_from_topic(&topics[3]),
            evidence_hash: hex_bytes(&data[0..32]),
        });
    }
    if topic == topic0(SIG_FEED_ADDED) {
        check_arity("FeedAdded", 2, topics.len())?;
        check_data("FeedAdded", 4 * 32, data.len())?;
        return Ok(OracleEvent::FeedAdded {
            feed_id: hex32(&topics[1]),
            decimals: data[31],
            min_signers: u16_from_word(&data[32..64]),
            circuit_breaker_bps: u32_from_word(&data[64..96]),
            allowed_writers_len: u32_from_word(&data[96..128]),
        });
    }
    if topic == topic0(SIG_FEED_UPDATED) {
        check_arity("FeedUpdated", 2, topics.len())?;
        check_data("FeedUpdated", 4 * 32, data.len())?;
        return Ok(OracleEvent::FeedUpdated {
            feed_id: hex32(&topics[1]),
            decimals: data[31],
            min_signers: u16_from_word(&data[32..64]),
            circuit_breaker_bps: u32_from_word(&data[64..96]),
            allowed_writers_len: u32_from_word(&data[96..128]),
        });
    }
    if topic == topic0(SIG_ADMIN_UPDATED) {
        check_arity("OracleAdminUpdated", 2, topics.len())?;
        check_data("OracleAdminUpdated", 0, data.len())?;
        return Ok(OracleEvent::AdminUpdated {
            admin: address_from_topic(&topics[1]),
        });
    }
    if topic == topic0(SIG_WRITER_ADDED) {
        check_arity("OracleWriterAdded", 3, topics.len())?;
        check_data("OracleWriterAdded", 0, data.len())?;
        return Ok(OracleEvent::WriterAdded {
            admin: address_from_topic(&topics[1]),
            writer: address_from_topic(&topics[2]),
        });
    }
    if topic == topic0(SIG_WRITER_REMOVED) {
        check_arity("OracleWriterRemoved", 3, topics.len())?;
        check_data("OracleWriterRemoved", 0, data.len())?;
        return Ok(OracleEvent::WriterRemoved {
            admin: address_from_topic(&topics[1]),
            writer: address_from_topic(&topics[2]),
        });
    }

    Err(OracleEventDecodeError::UnknownTopic)
}

fn check_arity(
    event: &'static str,
    expected: usize,
    found: usize,
) -> Result<(), OracleEventDecodeError> {
    if found == expected {
        Ok(())
    } else {
        Err(OracleEventDecodeError::TopicArity {
            event,
            expected,
            found,
        })
    }
}

fn check_data(
    event: &'static str,
    expected: usize,
    found: usize,
) -> Result<(), OracleEventDecodeError> {
    if found == expected {
        Ok(())
    } else {
        Err(OracleEventDecodeError::DataLength {
            event,
            expected,
            found,
        })
    }
}

fn hex_bytes(b: &[u8]) -> String {
    let mut out = String::with_capacity(2 + b.len() * 2);
    out.push_str("0x");
    for byte in b {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

fn hex32(word: &[u8; 32]) -> String {
    hex_bytes(word)
}

fn address_from_topic(word: &[u8; 32]) -> String {
    hex_bytes(&word[12..32])
}

fn u64_from_topic(word: &[u8; 32]) -> u64 {
    u64_from_word(&word[..])
}

fn u64_from_word(word: &[u8]) -> u64 {
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&word[24..32]);
    u64::from_be_bytes(buf)
}

fn u32_from_word(word: &[u8]) -> u32 {
    let mut buf = [0u8; 4];
    buf.copy_from_slice(&word[28..32]);
    u32::from_be_bytes(buf)
}

fn u16_from_word(word: &[u8]) -> u16 {
    let mut buf = [0u8; 2];
    buf.copy_from_slice(&word[30..32]);
    u16::from_be_bytes(buf)
}

/// Decode a big-endian 32-byte word into its decimal string. Uses
/// `u128` for the common case and a base-256 long-division fallback for
/// full `uint256` width.
fn u256_decimal(word: &[u8]) -> String {
    // Fast path: value fits in u128 (high 16 bytes zero).
    if word[..16].iter().all(|b| *b == 0) {
        let mut buf = [0u8; 16];
        buf.copy_from_slice(&word[16..32]);
        return u128::from_be_bytes(buf).to_string();
    }
    decimal_from_be_bytes(word)
}

/// Base-256 → decimal conversion for an arbitrary big-endian byte
/// string (used for full `uint256` width).
fn decimal_from_be_bytes(word: &[u8]) -> String {
    let mut bytes = word.to_vec();
    let mut out = Vec::new();
    while bytes.iter().any(|b| *b != 0) {
        let mut rem: u32 = 0;
        for b in bytes.iter_mut() {
            let acc = (rem << 8) | u32::from(*b);
            *b = u8::try_from(acc / 10).unwrap_or(0);
            rem = acc % 10;
        }
        out.push(b'0' + u8::try_from(rem).unwrap_or(0));
    }
    if out.is_empty() {
        return "0".to_string();
    }
    out.reverse();
    String::from_utf8(out).unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn topic_u64(v: u64) -> [u8; 32] {
        let mut out = [0u8; 32];
        out[24..32].copy_from_slice(&v.to_be_bytes());
        out
    }

    fn topic_address(byte: u8) -> [u8; 32] {
        let mut out = [0u8; 32];
        out[12..32].copy_from_slice(&[byte; 20]);
        out
    }

    fn word_u64(v: u64) -> [u8; 32] {
        topic_u64(v)
    }

    #[test]
    fn oracle_address_is_0x1009() {
        assert_eq!(
            oracle_address_hex(),
            "0x0000000000000000000000000000000000001009"
        );
    }

    #[test]
    fn decode_round_finalized_round_trips() {
        let feed = [0x11u8; 32];
        let topics = [topic0(SIG_ROUND_FINALIZED), feed, topic_u64(42)];
        let mut data = Vec::new();
        data.extend_from_slice(&word_u64(60_000));
        data.extend_from_slice(&word_u64(99));
        let mut obs = [0u8; 32];
        obs[28..32].copy_from_slice(&3u32.to_be_bytes());
        data.extend_from_slice(&obs);
        let ev = decode_oracle_event(&topics, &data).unwrap();
        assert_eq!(
            ev,
            OracleEvent::RoundFinalized {
                feed_id: hex32(&feed),
                round_id: 42,
                computed_median: "60000".to_string(),
                finalized_at_block: 99,
                observations_len: 3,
            }
        );
    }

    #[test]
    fn decode_observation_submitted_round_trips() {
        let feed = [0x22u8; 32];
        let topics = [
            topic0(SIG_OBSERVATION_SUBMITTED),
            feed,
            topic_u64(7),
            topic_address(0x33),
        ];
        let mut data = Vec::new();
        data.extend_from_slice(&word_u64(123));
        data.extend_from_slice(&word_u64(1_700));
        let ev = decode_oracle_event(&topics, &data).unwrap();
        assert_eq!(
            ev,
            OracleEvent::ObservationSubmitted {
                feed_id: hex32(&feed),
                round_id: 7,
                writer: "0x3333333333333333333333333333333333333333".to_string(),
                value: "123".to_string(),
                observed_at: 1_700,
            }
        );
    }

    #[test]
    fn decode_writer_events_round_trip() {
        let topics = [
            topic0(SIG_WRITER_ADDED),
            topic_address(0xa1),
            topic_address(0xb2),
        ];
        let ev = decode_oracle_event(&topics, &[]).unwrap();
        assert_eq!(
            ev,
            OracleEvent::WriterAdded {
                admin: "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1".to_string(),
                writer: "0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2".to_string(),
            }
        );
    }

    #[test]
    fn decode_rejects_no_topics_unknown_arity_and_length() {
        assert_eq!(
            decode_oracle_event(&[], &[]).unwrap_err(),
            OracleEventDecodeError::NoTopics
        );
        let bogus = topic0("SomethingElse(uint256)");
        assert_eq!(
            decode_oracle_event(&[bogus], &[]).unwrap_err(),
            OracleEventDecodeError::UnknownTopic
        );
        let feed = [0x11u8; 32];
        assert!(matches!(
            decode_oracle_event(&[topic0(SIG_ROUND_FINALIZED), feed], &[0u8; 96]).unwrap_err(),
            OracleEventDecodeError::TopicArity { .. }
        ));
    }

    #[test]
    fn full_width_u256_decimal() {
        // 2^200 — exceeds u128, exercises the big-int path.
        let mut word = [0u8; 32];
        word[6] = 0x01; // byte index 6 from MSB → 2^((31-6)*8) = 2^200
        let s = decimal_from_be_bytes(&word);
        assert_eq!(
            s,
            "1606938044258990275541962092341162602522202993782792835301376"
        );
    }
}
