import { statSync } from "node:fs";

// Sites load this file on every visit: keep it small.
const budget = 15 * 1024;
const size = statSync(new URL("../dist/actividades-toka.js", import.meta.url)).size;
if (size > budget) {
  console.error(`dist/actividades-toka.js is ${size} bytes, over the ${budget}-byte budget.`);
  process.exit(1);
}
console.log(`dist/actividades-toka.js: ${size} bytes (budget ${budget}).`);
