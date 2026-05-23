import { SdkError } from "./error.js";
import type {
  NativeEventsResponse,
  NativeReceiptEvent,
  NativeReceiptResponse,
} from "./client.js";

/** Common typed payload envelope emitted by the native event projector. */
export interface NativeDecodedEvent {
  block_height: number;
  tx_index: number;
  sequence: number;
  family: string;
  event_name: string;
  payload_hash: string;
  [field: string]: unknown;
}

/** Optional filters applied to native receipt event rows. */
export interface NativeEventFilter {
  address?: string;
  eventTopic?: string;
  family?: string;
  eventName?: string;
}

export type TypedNativeReceiptEvent<TDecoded extends NativeDecodedEvent = NativeDecodedEvent> =
  NativeReceiptEvent<TDecoded>;

export type NativeEventConsumer<TDecoded extends NativeDecodedEvent = NativeDecodedEvent> = (
  event: TypedNativeReceiptEvent<TDecoded>,
) => void | Promise<void>;

export function isNativeDecodedEvent(value: unknown): value is NativeDecodedEvent {
  const row = asRecord(value);
  return (
    row !== null &&
    typeof row["block_height"] === "number" &&
    typeof row["tx_index"] === "number" &&
    typeof row["sequence"] === "number" &&
    typeof row["family"] === "string" &&
    typeof row["event_name"] === "string" &&
    typeof row["payload_hash"] === "string"
  );
}

export function parseNativeDecodedEvent<TDecoded extends NativeDecodedEvent = NativeDecodedEvent>(
  event: Pick<NativeReceiptEvent<unknown>, "decoded" | "decodedJson" | "eventTopic" | "logIndex">,
): TDecoded {
  if (isNativeDecodedEvent(event.decoded)) {
    return event.decoded as TDecoded;
  }

  try {
    const parsed = JSON.parse(event.decodedJson) as unknown;
    if (isNativeDecodedEvent(parsed)) {
      return parsed as TDecoded;
    }
  } catch {
    // Fall through to the shape error below.
  }

  throw SdkError.malformed(
    `native event ${event.eventTopic} at logIndex ${event.logIndex} is missing a typed decoded payload`,
  );
}

export function nativeEventMatches(
  event: NativeReceiptEvent<unknown>,
  filter: NativeEventFilter = {},
): boolean {
  if (filter.address !== undefined && event.address !== filter.address) return false;
  if (filter.eventTopic !== undefined && event.eventTopic !== filter.eventTopic) return false;

  if (filter.family === undefined && filter.eventName === undefined) return true;

  let decoded: NativeDecodedEvent;
  try {
    decoded = parseNativeDecodedEvent(event);
  } catch {
    return false;
  }
  if (filter.family !== undefined && decoded.family !== filter.family) return false;
  if (filter.eventName !== undefined && decoded.event_name !== filter.eventName) return false;
  return true;
}

export function nativeEventsFromReceipt<
  TDecoded extends NativeDecodedEvent = NativeDecodedEvent,
>(
  receipt: NativeReceiptResponse<unknown>,
  filter: NativeEventFilter = {},
): Array<TypedNativeReceiptEvent<TDecoded>> {
  return receipt.events
    .filter((event) => nativeEventMatches(event, filter))
    .map((event) => ({
      ...event,
      decoded: parseNativeDecodedEvent<TDecoded>(event),
    }));
}

export function nativeEventsFromHistory<
  TDecoded extends NativeDecodedEvent = NativeDecodedEvent,
>(response: NativeEventsResponse<unknown>): NativeEventsResponse<TDecoded> {
  return {
    ...response,
    events: response.events.map((event) => ({
      ...event,
      decoded: parseNativeDecodedEvent<TDecoded>(event),
    })),
  };
}

export async function consumeNativeEvents<
  TDecoded extends NativeDecodedEvent = NativeDecodedEvent,
>(
  receipt: NativeReceiptResponse<unknown>,
  consumer: NativeEventConsumer<TDecoded>,
  filter: NativeEventFilter = {},
): Promise<number> {
  const events = nativeEventsFromReceipt<TDecoded>(receipt, filter);
  for (const event of events) {
    await consumer(event);
  }
  return events.length;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
