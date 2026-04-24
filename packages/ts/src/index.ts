/**
 * Official TypeScript SDK for Monolythium v2 / LythiumDAG-BFT.
 */

export const version = "0.0.1";

export { RpcClient, parseQuantity } from "./client.js";
export type { RpcClientOptions } from "./client.js";
export { SdkError } from "./error.js";
export * from "./types.js";
