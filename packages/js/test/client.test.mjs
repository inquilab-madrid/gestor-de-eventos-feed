import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFeedClient, FeedError } from "../dist/index.js";
import { fileStorage } from "../dist/node.js";
import { createPoller } from "../dist/poller.js";

const fixture = (name) => readFileSync(new URL(`../../../spec/fixtures/${name}`, import.meta.url), "utf8");
const client = "fc_TU_IDENTIFICADOR";

// A fetch stand-in: records requests and answers from a queue.
function fakeFetch(...answers) {
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ url: new URL(url), headers: init.headers });
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return new Response(next.body ?? null, { status: next.status ?? 200, headers: next.headers ?? {} });
  };
  return { fetch, requests };
}

const ok = (body = fixture("datafeed.json"), headers = {}) => ({ body, headers: { "content-type": "application/ld+json", etag: '"v1"', ...headers } });

test("list sends the client, the filters and Accept, and reads the DataFeed", async () => {
  const { fetch, requests } = fakeFetch(ok());
  const feed = createFeedClient({ client, fetch });
  const result = await feed.list({ province: "28", from: "2026-11-01", municipality: undefined });
  const { url, headers } = requests[0];
  assert.equal(url.origin + url.pathname, "https://participa.huelgaporlavivienda.org/api/public/v1/activities");
  assert.deepEqual(Object.fromEntries(url.searchParams), { client, province: "28", from: "2026-11-01" });
  assert.equal(headers.Accept, "application/ld+json");
  assert.equal(result.notModified, false);
  assert.equal(result.activities.length, 5);
  assert.equal(result.etag, '"v1"');
  assert.equal(result.age, null);
  assert.equal(result.dateModified, "2026-10-20T10:00:00+00:00");
});

test("with the ETag, an unchanged feed is notModified; Age is reported", async () => {
  const { fetch, requests } = fakeFetch({ status: 304, headers: { etag: 'W/"v1"' } }, ok(undefined, { age: "3600" }));
  const feed = createFeedClient({ client, fetch });
  assert.deepEqual(await feed.list({}, { etag: '"v1"' }), { notModified: true, etag: 'W/"v1"' });
  assert.equal(requests[0].headers["If-None-Match"], '"v1"');
  assert.equal((await feed.list()).age, 3600);
});

test("get reads one Event and escapes the id", async () => {
  const { fetch, requests } = fakeFetch(ok(fixture("event.json")));
  const result = await createFeedClient({ client, fetch }).get("a1111111-1111-4111-8111-111111111111");
  assert.equal(result.activity.name, "Asamblea de barrio");
  assert.equal(requests[0].url.pathname, "/api/public/v1/activities/a1111111-1111-4111-8111-111111111111");
  const other = fakeFetch(ok(fixture("event.json")));
  await createFeedClient({ client, fetch: other.fetch }).get("../x?y");
  assert.equal(other.requests[0].url.pathname, "/api/public/v1/activities/..%2Fx%3Fy");
});

test("errors become FeedError with the feed's title and Retry-After", async () => {
  const { fetch } = fakeFetch(
    { status: 401, body: fixture("problem-401.json"), headers: { "content-type": "application/problem+json" } },
    { status: 429, body: fixture("problem-429.json"), headers: { "retry-after": "60" } },
    { status: 500, body: "<html>oops</html>" },
    new TypeError("fetch failed"),
  );
  const feed = createFeedClient({ client, fetch });
  await assert.rejects(feed.list(), (error) => error instanceof FeedError && error.status === 401 && /identificador/.test(error.title) && error.retryAfter === null);
  await assert.rejects(feed.list(), (error) => error.status === 429 && error.retryAfter === 60);
  await assert.rejects(feed.list(), (error) => error.status === 500 && error.title === "The feed answered 500");
  await assert.rejects(feed.list(), (error) => error.status === 0 && error.title === "fetch failed");
});

test("a User-Agent is sent from servers; a client id is required; baseUrl can change", async () => {
  const { fetch, requests } = fakeFetch(ok());
  await createFeedClient({ client, fetch, userAgent: "Colectivo/1.0 (+https://example.org)", baseUrl: "https://example.org/v1/" }).list();
  assert.equal(requests[0].headers["User-Agent"], "Colectivo/1.0 (+https://example.org)");
  assert.equal(requests[0].url.href.split("?")[0], "https://example.org/v1/activities");
  assert.throws(() => createFeedClient({ client: "" }), TypeError);
});

test("the poller keeps the copy, uses the ETag, waits Retry-After and backs off", async () => {
  let clock = Date.parse("2026-10-23T10:00:00Z");
  const { fetch, requests } = fakeFetch(
    ok(),
    { status: 304, headers: { etag: '"v1"' } },
    { status: 503, body: "{}", headers: { "retry-after": "30" } },
    new TypeError("fetch failed"),
    new TypeError("fetch failed"),
    ok(undefined, { etag: '"v2"' }),
  );
  const poller = createPoller({ feed: createFeedClient({ client, fetch }), filters: { province: "28" }, now: () => clock });

  let result = await poller.refresh();
  assert.equal(result.updated, true);
  assert.equal(result.snapshot.activities.length, 5);

  result = await poller.refresh();
  assert.equal(result.updated, false);
  assert.equal(requests[1].headers["If-None-Match"], '"v1"');

  result = await poller.refresh();
  assert.equal(result.error.status, 503);
  assert.equal(result.snapshot.activities.length, 5, "the copy survives a failure");

  clock += 29_000;
  assert.equal((await poller.refresh()).skipped, true, "waits what Retry-After said");
  assert.equal(requests.length, 3);

  clock += 1_000;
  result = await poller.refresh();
  assert.equal(result.error.status, 0);
  clock += 119_000;
  assert.equal((await poller.refresh()).skipped, true, "second failure without Retry-After: 2 minutes");
  clock += 1_000;
  await poller.refresh();
  clock += 240_000;
  result = await poller.refresh();
  assert.equal(result.updated, true);
  assert.equal(result.snapshot.etag, '"v2"');
  assert.ok(requests.every((request) => request.url.searchParams.get("province") === "28"));
});

test("backoff without Retry-After doubles from one minute and stops at one hour", async () => {
  let clock = 0;
  const { fetch } = fakeFetch(...Array.from({ length: 9 }, () => new TypeError("down")));
  const storage = { state: null, read: async () => storage.state, write: async (state) => void (storage.state = state) };
  const poller = createPoller({ feed: createFeedClient({ client, fetch }), storage, now: () => clock });
  const waits = [];
  for (let i = 0; i < 9; i++) {
    await poller.refresh();
    waits.push((storage.state.retryAt - clock) / 60_000);
    clock = storage.state.retryAt;
  }
  assert.deepEqual(waits, [1, 2, 4, 8, 16, 32, 60, 60, 60]);
});

test("file storage survives a restart and jitter waits before asking", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "feed-")), "state.json");
  const slept = [];
  const first = fakeFetch(ok());
  await createPoller({ feed: createFeedClient({ client, fetch: first.fetch }), storage: fileStorage(path), jitterMs: 20_000, random: () => 0.5, sleep: async (ms) => void slept.push(ms) }).refresh();
  assert.deepEqual(slept, [10_000]);
  const second = fakeFetch({ status: 304, headers: { etag: '"v1"' } });
  const again = createPoller({ feed: createFeedClient({ client, fetch: second.fetch }), storage: fileStorage(path) });
  assert.equal((await again.current()).activities.length, 5);
  await again.refresh();
  assert.equal(second.requests[0].headers["If-None-Match"], '"v1"');
});
