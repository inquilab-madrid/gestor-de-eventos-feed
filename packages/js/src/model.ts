// Reads the feed's JSON-LD (schema.org Event) into plain objects. Unknown fields are ignored: /v1 only grows.

export type ActivityStatus = "pending" | "confirmed" | "cancelled";
export type FeedTimeZone = "Europe/Madrid" | "Atlantic/Canary";

export interface Place {
  name: string | null;
  municipality: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Capacity {
  max: number;
  remaining: number;
}

export interface Activity {
  id: string;
  url: string;
  name: string;
  description: string | null;
  /** ISO 8601 with the offset of the place's local time. */
  start: string;
  end: string;
  timeZone: FeedTimeZone;
  status: ActivityStatus;
  type: string | null;
  place: Place;
  capacity: Capacity | null;
  seriesId: string | null;
  organizers: string[];
  joinUrl: string;
  /** The event exactly as the feed sent it. */
  raw: Record<string, unknown>;
}

type Json = Record<string, unknown>;

const canaryProvinces = new Set(["Las Palmas", "Santa Cruz de Tenerife"]);

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
const number = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);

/** The last path segment of an activity URL. */
function idOf(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;
}

function viability(event: Json): string | null {
  const property = list(event.additionalProperty).find((item) => isObject(item) && item.propertyID === "viability");
  return isObject(property) ? text(property.value) : null;
}

function statusOf(event: Json): ActivityStatus {
  if (text(event.eventStatus)?.endsWith("/EventCancelled")) return "cancelled";
  return viability(event) === "confirmed" ? "confirmed" : "pending";
}

/** Converts one schema.org Event from the feed. Throws if it lacks what every activity has. */
export function toActivity(event: unknown): Activity {
  if (!isObject(event)) throw new TypeError("Not an Event object");
  const url = text(event.url) ?? text(event["@id"]);
  const name = text(event.name);
  const start = text(event.startDate);
  const end = text(event.endDate);
  if (!url || !name || !start || !end) throw new TypeError("Event without url, name, startDate or endDate");
  const location = isObject(event.location) ? event.location : {};
  const address = isObject(location.address) ? location.address : {};
  const geo = isObject(location.geo) ? location.geo : {};
  const province = text(address.addressRegion);
  const max = number(event.maximumAttendeeCapacity);
  const seriesRef = isObject(event.superEvent) ? text(event.superEvent["@id"]) : null;
  const action = isObject(event.potentialAction) ? event.potentialAction : {};
  return {
    id: idOf(url),
    url,
    name,
    description: text(event.description),
    start,
    end,
    timeZone: province && canaryProvinces.has(province) ? "Atlantic/Canary" : "Europe/Madrid",
    status: statusOf(event),
    type: text(event.keywords),
    place: {
      name: text(location.name),
      municipality: text(address.addressLocality),
      province,
      latitude: number(geo.latitude),
      longitude: number(geo.longitude),
    },
    capacity: max === null ? null : { max, remaining: number(event.remainingAttendeeCapacity) ?? max },
    seriesId: seriesRef ? seriesRef.replace(/^urn:uuid:/, "") : null,
    organizers: list(event.organizer).map((item) => (isObject(item) ? text(item.name) : null)).filter((item): item is string => item !== null),
    joinUrl: (isObject(action) ? text(action.target) : null) ?? url,
    raw: event,
  };
}

/** The activities of a DataFeed. Elements that are not readable activities are skipped. */
export function toActivities(feed: unknown): Activity[] {
  if (!isObject(feed)) return [];
  return list(feed.dataFeedElement).flatMap((element) => {
    try {
      return [toActivity(element)];
    } catch {
      return [];
    }
  });
}
