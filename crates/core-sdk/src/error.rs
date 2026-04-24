//! Error types for the SDK.
//!
//! Every fallible call returns [`SdkError`]. The SDK distinguishes
//! transport-level failures (HTTP errors, connection refused),
//! serialization failures (malformed JSON, shape mismatch), and
//! JSON-RPC-level errors returned by the node (`error.code` /
//! `error.message`).

use thiserror::Error;

/// Errors surfaced by [`crate::RpcClient`].
#[derive(Debug, Error)]
pub enum SdkError {
    /// Transport / HTTP layer failure (DNS, connection refused,
    /// timeout, non-2xx response without a JSON-RPC envelope).
    #[error("transport error: {0}")]
    Transport(#[from] reqwest::Error),

    /// Failed to encode the request or decode the response body.
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    /// The remote returned a JSON-RPC `error` object.
    #[error("rpc error {code}: {message}")]
    Rpc {
        /// JSON-RPC error code (per spec or per node extension).
        code: i64,
        /// Human-readable message.
        message: String,
        /// Optional structured data the node attached.
        data: Option<serde_json::Value>,
    },

    /// The response was missing both `result` and `error`, or was
    /// otherwise shaped contrary to the JSON-RPC 2.0 spec.
    #[error("malformed response: {0}")]
    Malformed(String),

    /// The endpoint URL passed to [`crate::RpcClient::new`] could not
    /// be parsed.
    #[error("invalid endpoint: {0}")]
    InvalidEndpoint(String),
}
