import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// docs/widget.md gives sites the version and integrity hash to paste: they must match this build.
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const file = readFileSync(new URL("../dist/actividades-toka.js", import.meta.url));
const integrity = `sha384-${createHash("sha384").update(file).digest("base64")}`;
const docs = readFileSync(new URL("../../../docs/widget.md", import.meta.url), "utf8");
const problems = [];
if (!docs.includes(`@widget-v${version}/`)) problems.push(`the snippet does not load widget-v${version}`);
if (!docs.includes(`integrity="${integrity}"`)) problems.push(`the snippet's integrity is not ${integrity}`);
if (!docs.includes(`| \`widget-v${version}\` | \`${integrity}\` |`)) problems.push(`the versions table lacks widget-v${version} with ${integrity}`);
if (problems.length) {
  console.error(`docs/widget.md is out of date: ${problems.join("; ")}.`);
  process.exit(1);
}
console.log(`docs/widget.md matches widget-v${version} (${integrity}).`);
