/**
 * Error surfaced by `RpcClient`. Distinguishes transport failures
 * (HTTP errors, network), protocol errors (JSON-RPC `error` envelopes),
 * and shape mismatches.
 */
export class SdkError extends Error {
  public readonly kind: "transport" | "rpc" | "malformed" | "endpoint";
  public readonly code?: number;
  public readonly data?: unknown;

  constructor(
    kind: "transport" | "rpc" | "malformed" | "endpoint",
    message: string,
    opts?: { code?: number; data?: unknown; cause?: unknown },
  ) {
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = "SdkError";
    this.kind = kind;
    this.code = opts?.code;
    this.data = opts?.data;
  }

  static transport(message: string, cause?: unknown): SdkError {
    return new SdkError("transport", message, { cause });
  }
  static rpc(code: number, message: string, data?: unknown): SdkError {
    return new SdkError("rpc", `rpc error ${code}: ${message}`, { code, data });
  }
  static malformed(message: string): SdkError {
    return new SdkError("malformed", message);
  }
  static endpoint(message: string): SdkError {
    return new SdkError("endpoint", message);
  }
}
