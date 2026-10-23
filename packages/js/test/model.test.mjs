import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatWhen, groupSeries, localTime, statusLabel, toActivities, toActivity } from "../dist/index.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`../../../spec/fixtures/${name}`, import.meta.url), "utf8"));
const feed = fixture("datafeed.json");
const expected = fixture("normalized.json");
const withoutRaw = ({ raw, ...activity }) => activity;

test("the shared fixture normalizes exactly as spec/fixtures/normalized.json says", () => {
  const activities = toActivities(feed);
  assert.deepEqual(activities.map(withoutRaw), expected.activities);
  assert.deepEqual(activities[4].raw.aFieldFromTheFuture, { anything: true }, "unknown fields stay in raw");
});

test("labels, local times and series grouping match the shared contract", () => {
  const activities = toActivities(feed);
  assert.deepEqual(activities.map(statusLabel), expected.statusLabels);
  assert.deepEqual(activities.map(localTime), expected.localStartTimes);
  const now = Date.parse("2026-10-23T12:00:00Z");
  assert.deepEqual(groupSeries(activities, now).map(({ id, otherDates }) => ({ id, otherDates })), expected.groupedSeries);
});

test("a single Event with its own @context reads the same", () => {
  assert.deepEqual(withoutRaw(toActivity(fixture("event.json"))), expected.activities[0]);
});

test("Canary activities say so; the rest do not", () => {
  const [madrid, tenerife] = toActivities(feed);
  assert.match(formatWhen(tenerife), /18:00 \(hora canaria\)$/);
  assert.doesNotMatch(formatWhen(madrid), /canaria/);
  assert.match(formatWhen(madrid), /19:00/);
});

test("series: past dates are skipped; with only cancelled dates, the first one shows", () => {
  const activities = toActivities(feed).filter((activity) => activity.seriesId);
  const afterFirst = Date.parse("2026-10-25T00:00:00Z");
  assert.deepEqual(groupSeries(activities, afterFirst).map(({ id, otherDates }) => ({ id, otherDates })), [{ id: "a4444444-4444-4444-8444-444444444444", otherDates: 0 }]);
  const allCancelled = activities.map((activity) => ({ ...activity, status: "cancelled" }));
  assert.equal(groupSeries(allCancelled, 0)[0].id, "a1111111-1111-4111-8111-111111111111");
});

test("unreadable elements are skipped, a malformed feed gives no activities", () => {
  const broken = { ...feed, dataFeedElement: [null, { "@type": "Event" }, ...feed.dataFeedElement.slice(0, 1)] };
  assert.equal(toActivities(broken).length, 1);
  assert.deepEqual(toActivities(null), []);
  assert.deepEqual(toActivities({ dataFeedElement: "nope" }), []);
  assert.throws(() => toActivity({ "@type": "Event", name: "Sin fechas" }), TypeError);
});

test("feed text stays text: the library never builds HTML", () => {
  const name = toActivities(feed)[4].name;
  assert.equal(name, "<script>alert('x')</script> Charla");
  for (const file of ["index", "client", "model", "format", "poller", "node"]) {
    const source = readFileSync(new URL(`../src/${file}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\.(innerHTML|outerHTML)\s*[+]?=|insertAdjacentHTML\(|document\.write\(/, file);
  }
});
