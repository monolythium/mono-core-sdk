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
export type NativeMarketOrderBookDelta = NativeMarketOrderBookStreamPayload;

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

export interface NativeMarketOrderBookDeltasRequest {
  fromBlock: number | bigint | string;
  toBlock: number | bigint | string;
  limit?: number | bigint | string | null;
  cursor?: string | null;
  txIndex?: number | bigint | string | null;
  logIndex?: number | bigint | string | null;
  address?: string | null;
  eventTopic?: string | null;
  eventName?: string | null;
  marketId?: string | null;
  listingId?: string | null;
  primaryId?: string | null;
  relatedId?: string | null;
  tokenId?: string | null;
  account?: string | null;
  counterparty?: string | null;
}

export interface NativeMarketOrderBookDeltasResponseFilters {
  family?: "market" | string | null;
  txIndex?: number | null;
  logIndex?: number | null;
  address?: string | null;
  eventTopic?: string | null;
  eventName?: string | null;
  marketId?: string | null;
  listingId?: string | null;
  primaryId?: string | null;
  relatedId?: string | null;
  tokenId?: string | null;
  account?: string | null;
  counterparty?: string | null;
}

export interface NativeMarketOrderBookDeltasSource {
  indexerProvider: string;
  projection: "native_market_orderbook_deltas" | string;
  historyApi: "lyth_nativeMarketEvents" | string;
  [key: string]: unknown;
}

export interface NativeMarketOrderBookDeltasResponse {
  schemaVersion: number;
  fromBlock: number;
  toBlock: number;
  limit: number | null;
  cursor: string | null;
  nextCursor: string | null;
  filters: NativeMarketOrderBookDeltasResponseFilters;
  replay: true;
  streamTopic: typeof NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC;
  deltas: NativeMarketOrderBookDelta[];
  source: NativeMarketOrderBookDeltasSource;
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

export function decodeNativeMarketOrderBookDeltasResponse(
  value: unknown,
): NativeMarketOrderBookDeltasResponse {
  const row = expectObject(value, "nativeMarketOrderBook delta replay response");
  const replay = row["replay"];
  const streamTopic = row["streamTopic"];
  if (replay !== true || streamTopic !== NATIVE_MARKET_ORDER_BOOK_STREAM_TOPIC) {
    throw SdkError.malformed(
      "nativeMarketOrderBook delta replay response has invalid replay metadata",
    );
  }
  const rawDeltas = row["deltas"];
  if (!Array.isArray(rawDeltas)) {
    throw SdkError.malformed("nativeMarketOrderBook delta replay response deltas must be an array");
  }
  const deltas = rawDeltas.map((delta, index) => {
    if (!isNativeMarketOrderBookStreamPayload(delta)) {
      throw SdkError.malformed(
        `nativeMarketOrderBook delta replay response deltas[${index}] is malformed`,
      );
    }
    return delta;
  });
  return {
    schemaVersion: parseSafeInteger(row["schemaVersion"], "schemaVersion"),
    fromBlock: parseSafeInteger(row["fromBlock"], "fromBlock"),
    toBlock: parseSafeInteger(row["toBlock"], "toBlock"),
    limit: parseNullableSafeInteger(row["limit"], "limit"),
    cursor: parseNullableString(row["cursor"], "cursor"),
    nextCursor: parseNullableString(row["nextCursor"], "nextCursor"),
    filters: expectObject(
      row["filters"],
      "nativeMarketOrderBook delta replay response filters",
    ) as unknown as NativeMarketOrderBookDeltasResponseFilters,
    replay,
    streamTopic,
    deltas,
    source: expectObject(
      row["source"],
      "nativeMarketOrderBook delta replay response source",
    ) as unknown as NativeMarketOrderBookDeltasSource,
  };
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

function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw SdkError.malformed(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseSafeInteger(value: unknown, label: string): number {
  if (!isNonNegativeSafeInteger(value)) {
    throw SdkError.malformed(`nativeMarketOrderBook delta replay response ${label} is malformed`);
  }
  return value;
}

function parseNullableSafeInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  return parseSafeInteger(value, label);
}

function parseNullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw SdkError.malformed(`nativeMarketOrderBook delta replay response ${label} is malformed`);
  }
  return value;
}
