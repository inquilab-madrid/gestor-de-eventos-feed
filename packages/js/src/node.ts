import { readFile, rename, writeFile } from "node:fs/promises";
import type { PollerState, Storage } from "./poller.js";

/** Keeps the poller's state and last good copy in a JSON file. Writes atomically: readers never see half a file. */
export function fileStorage(path: string): Storage {
  return {
    async read() {
      try {
        return JSON.parse(await readFile(path, "utf8")) as PollerState;
      } catch {
        return null;
      }
    },
    async write(state) {
      const temporary = `${path}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(state));
      await rename(temporary, path);
    },
  };
}
