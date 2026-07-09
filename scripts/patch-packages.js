// scripts/patch-packages.js
// Fixes a packaging bug in `app-store-scraper-ts` (v0.3.0):
//   - The root package.json declares "type": "commonjs".
//   - The "exports" map points ESM consumers ("import") to dist/esm/*.js,
//     which use ESM import/export syntax BUT reference other files without
//     file extensions (e.g. `import { ... } from './constants'`).
//   - Node's native ESM resolver requires explicit extensions, so loading the
//     package externally fails with ERR_MODULE_NOT_FOUND during page-data
//     collection. Turbopack, when bundling it, instead complains about the
//     ESM/CJS format mismatch.
//
// The package ships a fully self-consistent CommonJS build under dist/cjs/.
// We redirect the "exports" map (and "main") so every consumer — Turbopack and
// Node alike — loads the CJS build. Named imports (`import { app } from
// 'app-store-scraper-ts'`) keep working thanks to CJS named-export
// interop in both Turbopack and Node's cjs-module-lexer.
//
// Safe to run multiple times.
const fs = require("fs");
const path = require("path");

function patchAppStoreScraper() {
  const pkgDir = path.join(
    process.cwd(),
    "node_modules",
    "app-store-scraper-ts"
  );
  if (!fs.existsSync(pkgDir)) {
    console.log("ℹ️  app-store-scraper-ts not installed, skipping patch");
    return;
  }

  // 1. Add a {"type":"module"} shim under dist/esm so any tool that still
  //    touches those files treats them as ESM (defense in depth).
  const esmShim = path.join(pkgDir, "dist", "esm", "package.json");
  if (fs.existsSync(path.dirname(esmShim))) {
    fs.writeFileSync(esmShim, JSON.stringify({ type: "module" }, null, 2) + "\n");
  }

  // 2. Rewrite the root package.json to expose the CJS build for all
  //    conditions, and drop the ESM "module" entry that points at the broken
  //    dist/esm build.
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

  pkg.main = "dist/cjs/index.js";
  delete pkg.module;
  pkg.exports = {
    ".": {
      types: "./dist/esm/index.d.ts",
      default: "./dist/cjs/index.js",
    },
  };

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("✅ Patched app-store-scraper-ts to use CommonJS build");
}

try {
  patchAppStoreScraper();
} catch (err) {
  console.warn("⚠️  Could not patch app-store-scraper-ts:", err.message);
}
