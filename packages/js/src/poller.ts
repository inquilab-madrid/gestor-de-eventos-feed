import { FeedError, type FeedClient, type FeedFilters } from "./client.js";
import type { Activity } from "./model.js";

// Server-side: keeps the last good copy of the feed and refreshes it politely. Asks at most once per call,
// only for changes (ETag), waits what the feed asks (Retry-After) or backs off 1, 2, 4… minutes up to an hour.

export interface Snapshot {
  activities: Activity[];
  etag: string | null;
  /** When this copy was received (ms since epoch). */
  savedAt: number;
  /** How old the feed said it was when received, if it could not refresh. */
  age: number | null;
}

export interface PollerState {
  snapshot: Snapshot | null;
  retryAt: number;
  failures: number;
}

export interface Storage {
  read(): Promise<PollerState | null>;
  write(state: PollerState): Promise<void>;
}

export interface RefreshResult {
  snapshot: Snapshot | null;
  /** True when this call brought a new copy. */
  updated: boolean;
  /** True when it did not ask because the feed asked to wait. */
  skipped: boolean;
  error: FeedError | null;
}

export function memoryStorage(): Storage {
  let state: PollerState | null = null;
  return { read: async () => state, write: async (next) => void (state = next) };
}

export interface PollerOptions {
  feed: FeedClient;
  filters?: FeedFilters;
  storage?: Storage;
  /** Random wait before asking, in ms. Use some seconds when many sites run on the same cron minute. */
  jitterMs?: number;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const maxBackoffSeconds = 3600;

export function createPoller({ feed, filters = {}, storage = memoryStorage(), jitterMs = 0, now = Date.now, random = Math.random,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }: PollerOptions) {
  async function refresh(): Promise<RefreshResult> {
    const state = (await storage.read()) ?? { snapshot: null, retryAt: 0, failures: 0 };
    if (now() < state.retryAt) return { snapshot: state.snapshot, updated: false, skipped: true, error: null };
    if (jitterMs > 0) await sleep(random() * jitterMs);
    try {
      const result = await feed.list(filters, { etag: state.snapshot?.etag });
      if (result.notModified) {
        await storage.write({ ...state, retryAt: 0, failures: 0 });
        return { snapshot: state.snapshot, updated: false, skipped: false, error: null };
      }
      const snapshot: Snapshot = { activities: result.activities, etag: result.etag, savedAt: now(), age: result.age };
      await storage.write({ snapshot, retryAt: 0, failures: 0 });
      return { snapshot, updated: true, skipped: false, error: null };
    } catch (caught) {
      const error = caught instanceof FeedError ? caught : new FeedError(0, caught instanceof Error ? caught.message : "Unknown error");
      const failures = state.failures + 1;
      const wait = error.retryAfter ?? Math.min(maxBackoffSeconds, 60 * 2 ** (failures - 1));
      // The copy stays: showing it is better than showing nothing.
      await storage.write({ ...state, retryAt: now() + wait * 1000, failures });
      return { snapshot: state.snapshot, updated: false, skipped: false, error };
    }
  }

  return {
    refresh,
    /** The last good copy, without asking the feed. */
    async current(): Promise<Snapshot | null> {
      return (await storage.read())?.snapshot ?? null;
    },
    /** Refreshes now and then every `intervalMs` (at least a minute). Returns a function that stops it. */
    start(onRefresh?: (result: RefreshResult) => void, intervalMs = 60_000): () => void {
      const run = () => refresh().then(onRefresh, () => undefined);
      void run();
      const timer = setInterval(run, Math.max(60_000, intervalMs));
      return () => clearInterval(timer);
    },
  };
}
