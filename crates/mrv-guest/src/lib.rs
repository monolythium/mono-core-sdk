//! Guest-side host syscall wrappers for Monolythium RISC-V (MRV) contracts.
//!
//! This crate is `no_std` and is meant to be compiled into the guest contract
//! that runs inside the node's RISC-V execution environment. It exposes a thin,
//! typed layer over the host ecall ABI so contract authors do not hand-write
//! inline assembly for every syscall.
//!
//! # Ecall ABI
//!
//! Every host syscall is invoked with a RISC-V `ecall` after loading the
//! argument registers:
//!
//! | Register | In                         | Out (after `ecall`)        |
//! |----------|----------------------------|----------------------------|
//! | `a7`/x17 | syscall id (`u16`)         | unchanged                  |
//! | `a0`/x10 | request pointer            | response pointer           |
//! | `a1`/x11 | request length             | response length           |
//! | `a2`/x12 | response buffer pointer    | unchanged                  |
//! | `a3`/x13 | response buffer capacity   | unchanged                  |
//!
//! The host writes the response into the caller-provided buffer (`a2`/`a3`) and
//! returns the written length in `a1`.
//!
//! # Parity-gated syscalls
//!
//! [`SyscallId::BlockTimestamp`], [`SyscallId::ChainId`], and
//! [`SyscallId::CallValue`] are part of the MRV EVM-parity feature set
//! (`mrv_app_contract_parity`). They are recognized by the SDK's artifact
//! validator at any height, but the host only dispatches them once the
//! foundation-signed parity milestone activates. **Below the milestone the host
//! traps these syscalls** — a contract that calls them on a pre-milestone node
//! reverts. Authors must feature-detect activation off-chain (see the SDK's
//! `isMrvParityActive` / `is_mrv_parity_active` helpers) before relying on them.
//!
//! The deploy/call/constructor lane and the other five wrappers in this crate
//! are always live and are **not** gated on the parity milestone.

#![no_std]
#![forbid(unsafe_op_in_unsafe_fn)]

/// Host module name all approved syscalls import from.
pub const MONO_SYSCALL_MODULE: &str = "mono";

/// Stable host syscall identifiers, mirroring the node's `riscv-abi` table.
#[repr(u16)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
#[non_exhaustive]
pub enum SyscallId {
    /// Read a key from the contract storage namespace.
    StorageRead = 0x0101,
    /// Write a key in the contract storage namespace.
    StorageWrite = 0x0102,
    /// Delete a key from the contract storage namespace.
    StorageDelete = 0x0103,
    /// Return the caller address.
    Caller = 0x0201,
    /// Return the currently executing contract address.
    ContractAddress = 0x0202,
    /// Return the current block height.
    BlockHeight = 0x0203,
    /// Return a recent block hash.
    BlockHash = 0x0204,
    /// Return the current block timestamp in seconds. Parity-gated.
    BlockTimestamp = 0x0205,
    /// Return the chain identifier. Parity-gated.
    ChainId = 0x0206,
    /// Return the native value transferred into the current frame. Parity-gated.
    CallValue = 0x0207,
    /// Call another RISC-V contract.
    CallContract = 0x0301,
    /// Emit a typed event.
    EmitEvent = 0x0302,
    /// Transfer native LYTH.
    TransferNative = 0x0303,
    /// Verify an approved account signature.
    VerifySignature = 0x0401,
    /// Compute a domain-separated BLAKE3 hash.
    Hash = 0x0402,
    /// Revert execution with typed data.
    Revert = 0x0501,
}

impl SyscallId {
    /// Stable numeric wire identifier.
    #[must_use]
    pub const fn numeric(self) -> u16 {
        self as u16
    }

    /// Stable import name.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::StorageRead => "storage_read",
            Self::StorageWrite => "storage_write",
            Self::StorageDelete => "storage_delete",
            Self::Caller => "caller",
            Self::ContractAddress => "contract_address",
            Self::BlockHeight => "block_height",
            Self::BlockHash => "block_hash",
            Self::BlockTimestamp => "block_timestamp",
            Self::ChainId => "chain_id",
            Self::CallValue => "call_value",
            Self::CallContract => "call_contract",
            Self::EmitEvent => "emit_event",
            Self::TransferNative => "transfer_native",
            Self::VerifySignature => "verify_signature",
            Self::Hash => "hash",
            Self::Revert => "revert",
        }
    }

    /// Whether this syscall belongs to the parity-gated EVM-parity set and
    /// traps on nodes below the `mrv_app_contract_parity` milestone.
    #[must_use]
    pub const fn is_parity_gated(self) -> bool {
        matches!(self, Self::BlockTimestamp | Self::ChainId | Self::CallValue)
    }
}

/// The raw host ecall.
///
/// Loads the four argument registers and issues a RISC-V `ecall`, returning the
/// host-written `(response_ptr, response_len)` pair. The response is written
/// into `response`, and the returned length is the number of bytes the host
/// actually wrote; it never exceeds `response.len()`.
///
/// On a non-RISC-V host (used for workspace builds and unit tests) this is a
/// stub that returns a zero-length response. The real ecall is only emitted on
/// the `riscv64` target.
///
/// # Safety
///
/// The caller must ensure `response` is large enough for the syscall's reply;
/// the host truncates to `response.len()`. Callers should size the buffer to
/// the syscall's documented maximum.
#[inline]
pub fn syscall(id: SyscallId, request: &[u8], response: &mut [u8]) -> usize {
    raw_ecall(
        id.numeric(),
        request.as_ptr(),
        request.len(),
        response.as_mut_ptr(),
        response.len(),
    )
}

#[cfg(target_arch = "riscv64")]
#[inline]
fn raw_ecall(
    id: u16,
    request_ptr: *const u8,
    request_len: usize,
    response_ptr: *mut u8,
    response_cap: usize,
) -> usize {
    let response_len: usize;
    // a7 = syscall id, a0 = request ptr, a1 = request len,
    // a2 = response ptr, a3 = response capacity.
    // After ecall, a1 holds the written response length.
    unsafe {
        core::arch::asm!(
            "ecall",
            in("a7") id as usize,
            inout("a0") request_ptr as usize => _,
            inout("a1") request_len => response_len,
            in("a2") response_ptr as usize,
            in("a3") response_cap,
            options(nostack),
        );
    }
    response_len
}

#[cfg(not(target_arch = "riscv64"))]
#[inline]
fn raw_ecall(
    _id: u16,
    _request_ptr: *const u8,
    _request_len: usize,
    _response_ptr: *mut u8,
    _response_cap: usize,
) -> usize {
    // Host build stub: there is no host to ecall into off the RISC-V target.
    0
}

/// Maximum size of an address reply (20-byte account address).
pub const ADDRESS_LEN: usize = 20;
/// Maximum size of a 32-byte hash reply.
pub const HASH_LEN: usize = 32;
/// Maximum size of a `u64` reply, little-endian.
pub const U64_LEN: usize = 8;
/// Maximum size of a `u128` reply, little-endian (native value).
pub const U128_LEN: usize = 16;

// --- Existing (always-live) context wrappers -------------------------------

/// `storage_read` (0x0101) — read a value from the contract storage namespace.
/// Returns the number of bytes written into `out`.
pub fn storage_read(key: &[u8], out: &mut [u8]) -> usize {
    syscall(SyscallId::StorageRead, key, out)
}

/// `caller` (0x0201) — the address that invoked the current frame.
pub fn caller() -> [u8; ADDRESS_LEN] {
    let mut out = [0u8; ADDRESS_LEN];
    let _ = syscall(SyscallId::Caller, &[], &mut out);
    out
}

/// `contract_address` (0x0202) — the address of the executing contract.
pub fn contract_address() -> [u8; ADDRESS_LEN] {
    let mut out = [0u8; ADDRESS_LEN];
    let _ = syscall(SyscallId::ContractAddress, &[], &mut out);
    out
}

/// `block_height` (0x0203) — the current block height.
pub fn block_height() -> u64 {
    let mut out = [0u8; U64_LEN];
    let _ = syscall(SyscallId::BlockHeight, &[], &mut out);
    u64::from_le_bytes(out)
}

/// `block_hash` (0x0204) — the hash of a recent block. `height` selects the
/// target block; the encoding mirrors the host request schema.
pub fn block_hash(height: u64) -> [u8; HASH_LEN] {
    let mut out = [0u8; HASH_LEN];
    let _ = syscall(SyscallId::BlockHash, &height.to_le_bytes(), &mut out);
    out
}

// --- New parity-gated wrappers ---------------------------------------------
//
// These three syscalls trap on nodes below the `mrv_app_contract_parity`
// milestone. Authors must confirm activation off-chain before relying on them.

/// `block_timestamp` (0x0205) — the current block timestamp, in seconds.
///
/// **Parity-gated:** traps below the `mrv_app_contract_parity` milestone.
pub fn block_timestamp() -> u64 {
    let mut out = [0u8; U64_LEN];
    let _ = syscall(SyscallId::BlockTimestamp, &[], &mut out);
    u64::from_le_bytes(out)
}

/// `chain_id` (0x0206) — the chain identifier of the executing network.
///
/// **Parity-gated:** traps below the `mrv_app_contract_parity` milestone.
pub fn chain_id() -> u64 {
    let mut out = [0u8; U64_LEN];
    let _ = syscall(SyscallId::ChainId, &[], &mut out);
    u64::from_le_bytes(out)
}

/// `call_value` (0x0207) — the native LYTH value transferred into the current
/// frame, in lythoshi.
///
/// **Parity-gated:** traps below the `mrv_app_contract_parity` milestone.
pub fn call_value() -> u128 {
    let mut out = [0u8; U128_LEN];
    let _ = syscall(SyscallId::CallValue, &[], &mut out);
    u128::from_le_bytes(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numeric_ids_match_the_abi_table() {
        assert_eq!(SyscallId::StorageRead.numeric(), 0x0101);
        assert_eq!(SyscallId::Caller.numeric(), 0x0201);
        assert_eq!(SyscallId::BlockHeight.numeric(), 0x0203);
        assert_eq!(SyscallId::BlockHash.numeric(), 0x0204);
        assert_eq!(SyscallId::BlockTimestamp.numeric(), 0x0205);
        assert_eq!(SyscallId::ChainId.numeric(), 0x0206);
        assert_eq!(SyscallId::CallValue.numeric(), 0x0207);
    }

    #[test]
    fn names_match_the_abi_table() {
        assert_eq!(SyscallId::BlockTimestamp.name(), "block_timestamp");
        assert_eq!(SyscallId::ChainId.name(), "chain_id");
        assert_eq!(SyscallId::CallValue.name(), "call_value");
    }

    #[test]
    fn only_the_three_context_syscalls_are_parity_gated() {
        assert!(SyscallId::BlockTimestamp.is_parity_gated());
        assert!(SyscallId::ChainId.is_parity_gated());
        assert!(SyscallId::CallValue.is_parity_gated());
        assert!(!SyscallId::BlockHeight.is_parity_gated());
        assert!(!SyscallId::Caller.is_parity_gated());
        assert!(!SyscallId::StorageRead.is_parity_gated());
    }

    #[test]
    fn host_stub_returns_zero_length() {
        // On the host target the ecall is a stub; wrappers fall back to zero.
        assert_eq!(block_height(), 0);
        assert_eq!(chain_id(), 0);
        assert_eq!(call_value(), 0);
    }
}
