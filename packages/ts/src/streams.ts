import { SdkError } from "./error.js";

export const NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC = "nativeMarketOrderBook" as const;

export const API_STREAM_TOPICS = [
  "newHeads",
  "newPendingTx",
  "logs",
  "newCommit",
  "dagVertices",
  "registry",
  "marketTrades",
  NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC,
  "gapRecords",
  "nativeEvents",
] as const;

export type ApiStreamTopic = (typeof API_STREAM_TOPICS)[number];
export type NativeMarketOrderBookStreamAction = "upsert" | "remove";

export interface NativeMarketOrderBookStreamPayload {
  marketId: string;
  orderId: string;
  relatedOrderId?: string;
  eventName: string;
  action: NativeMarketOrderBookStreamAction;
  side?: string;
  price?: string;
  quantity?: string;
  remaining?: string;
  status?: string;
  blockHeight: number;
  txIndex: number;
  logIndex: number;
}

export interface ApiStreamTopicRetention {
  kind: "live_broadcast" | string;
  replay?: boolean;
  historyApis?: string[];
  [key: string]: unknown;
}

export interface ApiStreamTopicMetadata<TTopic extends string = ApiStreamTopic | string> {
  topic: TTopic;
  endpoint: string;
  description?: string;
  shape?: string;
  source?: string;
  queryFilters?: string[];
  retention?: ApiStreamTopicRetention;
}

export interface ApiStreamsIndexResponse {
  schemaVersion: number;
  chainId: number;
  transport: "sse" | string;
  keepAliveSeconds: number;
  perConnectionMailbox?: number;
  topics: ApiStreamTopicMetadata[];
}

export function isNativeMarketOrderBookStreamPayload(
  value: unknown,
): value is NativeMarketOrderBookStreamPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    isString(row["marketId"]) &&
    isString(row["orderId"]) &&
    isOptionalString(row["relatedOrderId"]) &&
    isString(row["eventName"]) &&
    isNativeMarketOrderBookStreamAction(row["action"]) &&
    isOptionalString(row["side"]) &&
    isOptionalString(row["price"]) &&
    isOptionalString(row["quantity"]) &&
    isOptionalString(row["remaining"]) &&
    isOptionalString(row["status"]) &&
    isNonNegativeSafeInteger(row["blockHeight"]) &&
    isNonNegativeSafeInteger(row["txIndex"]) &&
    isNonNegativeSafeInteger(row["logIndex"])
  );
}

export function assertNativeMarketOrderBookStreamPayload(
  value: unknown,
): asserts value is NativeMarketOrderBookStreamPayload {
  if (!isNativeMarketOrderBookStreamPayload(value)) {
    throw SdkError.malformed("nativeMarketOrderBook stream payload is malformed");
  }
}

function isNativeMarketOrderBookStreamAction(
  value: unknown,
): value is NativeMarketOrderBookStreamAction {
  return value === "upsert" || value === "remove";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
