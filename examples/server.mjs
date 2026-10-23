// Reads the public activity feed from your server and keeps a local copy, the way the documentation asks:
// at most once a minute, with your own User-Agent, only downloading changes (ETag) and respecting Retry-After.
//
// Run it from cron every minute, or every few minutes:
//   * * * * *  FEED_CLIENT=fc_… node /path/to/server.mjs
// Then have your site read activities.json (the last good copy) instead of calling the feed on every visit.
//
// Node.js 18 or later, no dependencies.

import { readFile, writeFile, rename } from "node:fs/promises";

const client = process.env.FEED_CLIENT;
if (!client) throw new Error("Set FEED_CLIENT to your client id (fc_…).");

const feedUrl = new URL(process.env.FEED_URL ?? "https://participa.huelgaporlavivienda.org/api/public/v1/activities");
feedUrl.searchParams.set("client", client);
// Your filters, for example only Madrid:
if (process.env.FEED_PROVINCE) feedUrl.searchParams.set("province", process.env.FEED_PROVINCE);

// Identify yourself, so the campaign can reach you if something goes wrong.
const userAgent = process.env.FEED_USER_AGENT ?? "NombreDeTuColectivo/1.0 (+https://tu-web.org/contacto)";
const copyFile = process.env.FEED_COPY ?? "activities.json";
const stateFile = `${copyFile}.state.json`;

const readJson = (path) => readFile(path, "utf8").then(JSON.parse).catch(() => null);
// Write to a temporary file and rename it, so your site never reads a half-written copy.
async function writeJson(path, value) {
  await writeFile(`${path}.tmp`, JSON.stringify(value));
  await rename(`${path}.tmp`, path);
}

const state = (await readJson(stateFile)) ?? { etag: null, retryAt: 0, failures: 0 };

// A previous answer asked us to wait (429 or 503): do not ask again until then.
if (Date.now() < state.retryAt) process.exit(0);

// When many sites run cron on the minute, everyone asks at :00. A random wait of up to 20 s spreads them out.
await new Promise((resolve) => setTimeout(resolve, Math.random() * 20_000));

let response;
try {
  response = await fetch(feedUrl, {
    headers: { "User-Agent": userAgent, Accept: "application/ld+json", ...(state.etag ? { "If-None-Match": state.etag } : {}) },
    signal: AbortSignal.timeout(15_000),
  });
} catch (error) {
  response = null;
  console.error(`Feed unreachable: ${error.message}`);
}

if (response?.status === 304) {
  // Nothing changed: the copy you have is still good.
  await writeJson(stateFile, { ...state, retryAt: 0, failures: 0 });
} else if (response?.ok) {
  const feed = await response.json();
  await writeJson(copyFile, feed);
  await writeJson(stateFile, { etag: response.headers.get("etag"), retryAt: 0, failures: 0 });
  const age = response.headers.get("age");
  // With Age, the feed could not refresh and is serving its last good version, that many seconds old.
  console.log(`${feed.dataFeedElement.length} activities saved${age ? ` (feed copy from ${age} s ago)` : ""}.`);
} else {
  // Keep showing the copy you have. Wait what the feed asks (Retry-After) or, if it says nothing, a little
  // longer after each failure: 1, 2, 4… minutes, up to an hour.
  const failures = state.failures + 1;
  const retryAfter = Number(response?.headers.get("retry-after"));
  const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : Math.min(3600, 60 * 2 ** (failures - 1));
  await writeJson(stateFile, { ...state, retryAt: Date.now() + waitSeconds * 1000, failures });
  if (response) {
    const problem = await response.json().catch(() => null);
    console.error(`Feed answered ${response.status}: ${problem?.title ?? "no details."} Waiting ${waitSeconds} s.`);
  }
  // 401 and 403 will not fix themselves: check your client id, or write to the campaign.
  process.exitCode = 1;
}
