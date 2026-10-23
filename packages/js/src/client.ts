import { toActivities, toActivity, type Activity } from "./model.js";

export const defaultBaseUrl = "https://participa.huelgaporlavivienda.org/api/public/v1";

export interface FeedFilters {
  /** Two-digit INE province code, such as "28". */
  province?: string;
  municipality?: string;
  type?: string;
  /** YYYY-MM-DD, in the place's local time. */
  from?: string;
  to?: string;
}

export interface FeedClientOptions {
  /** Your client id (fc_…). */
  client: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  /** Server-side only: identify your site, for example "MyCollective/1.0 (+https://example.org/contact)". */
  userAgent?: string;
}

export interface RequestOptions {
  /** The ETag of the copy you have: if nothing changed, the result is { notModified: true }. */
  etag?: string | null;
  signal?: AbortSignal;
}

interface Fresh {
  notModified: false;
  etag: string | null;
  /** Seconds old, when the feed could not refresh and served its last good version. */
  age: number | null;
}

export type ListResult = (Fresh & { activities: Activity[]; dateModified: string | null; raw: unknown }) | { notModified: true; etag: string | null };
export type GetResult = (Fresh & { activity: Activity }) | { notModified: true; etag: string | null };

/** A response other than 200 or 304. `status` is 0 when the feed could not be reached. */
export class FeedError extends Error {
  readonly status: number;
  readonly title: string;
  /** Seconds to wait before asking again, when the feed says so (429, 503). */
  readonly retryAfter: number | null;

  constructor(status: number, title: string, retryAfter: number | null = null) {
    super(`${status}: ${title}`);
    this.name = "FeedError";
    this.status = status;
    this.title = title;
    this.retryAfter = retryAfter;
  }
}

const inBrowser = typeof window !== "undefined" && typeof document !== "undefined";

function seconds(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function createFeedClient({ client, baseUrl = defaultBaseUrl, fetch = globalThis.fetch, userAgent }: FeedClientOptions) {
  if (!client) throw new TypeError("A client id (fc_…) is required");
  const base = baseUrl.replace(/\/+$/, "");

  async function request(path: string, params: Record<string, string | undefined>, { etag, signal }: RequestOptions) {
    const url = new URL(`${base}${path}`);
    url.searchParams.set("client", client);
    for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
    const headers: Record<string, string> = { Accept: "application/ld+json" };
    if (etag) headers["If-None-Match"] = etag;
    // Browsers do not let pages set it; they send their own.
    if (userAgent && !inBrowser) headers["User-Agent"] = userAgent;
    let response: Response;
    try {
      response = await fetch(url, { headers, signal });
    } catch (error) {
      throw new FeedError(0, error instanceof Error ? error.message : "Network error");
    }
    if (response.status === 304) return { notModified: true as const, etag: response.headers.get("etag") ?? etag ?? null };
    if (!response.ok) {
      const problem = (await response.json().catch(() => null)) as { title?: unknown } | null;
      const title = typeof problem?.title === "string" ? problem.title : `The feed answered ${response.status}`;
      throw new FeedError(response.status, title, seconds(response.headers.get("retry-after")));
    }
    return { notModified: false as const, body: (await response.json()) as unknown, etag: response.headers.get("etag"), age: seconds(response.headers.get("age")) };
  }

  return {
    /** Upcoming activities, cancelled ones included until their date. */
    async list(filters: FeedFilters = {}, options: RequestOptions = {}): Promise<ListResult> {
      const result = await request("/activities", { ...filters }, options);
      if (result.notModified) return result;
      const dateModified = (result.body as { dateModified?: unknown } | null)?.dateModified;
      return {
        notModified: false, etag: result.etag, age: result.age, raw: result.body,
        activities: toActivities(result.body), dateModified: typeof dateModified === "string" ? dateModified : null,
      };
    },
    /** One upcoming activity by its id; a FeedError with status 404 when there is none. */
    async get(id: string, options: RequestOptions = {}): Promise<GetResult> {
      const result = await request(`/activities/${encodeURIComponent(id)}`, {}, options);
      if (result.notModified) return result;
      return { notModified: false, etag: result.etag, age: result.age, activity: toActivity(result.body) };
    },
  };
}

export type FeedClient = ReturnType<typeof createFeedClient>;
