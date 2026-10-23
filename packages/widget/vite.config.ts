import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

// One self-contained file that sites load with a <script> tag (jsDelivr or self-hosted).
export default defineConfig({
  // The dev server shows the examples, with the widget loaded from source.
  root: "../..",
  build: {
    outDir: "packages/widget/dist",
    emptyOutDir: true,
    minify: true,
    target: "es2022",
    lib: {
      entry: "packages/widget/src/element.ts",
      name: "ActividadesToka",
      formats: ["iife"],
      fileName: () => "actividades-toka.js",
    },
  },
  plugins: [
    {
      // After minification, so the licence line survives it. The file is made ASCII-only (accents as \\uXXXX):
      // sites that serve it without a charset would otherwise show «Ã³» instead of «ó».
      name: "banner-and-ascii",
      generateBundle(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== "chunk") continue;
          const ascii = file.code.replace(/[^\x00-\x7f]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
          file.code = `/*! actividades-toka ${version} | MIT | https://github.com/inquilab-madrid/gestor-de-eventos-feed */\n${ascii}`;
        }
      },
    },
  ],
});
