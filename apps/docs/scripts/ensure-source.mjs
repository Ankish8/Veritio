/**
 * Waits for the fumadocs-mdx output to be a usable module before tsc reads it.
 *
 * `docs#type-check` fails intermittently in CI with:
 *
 *   lib/source.ts(1,22): error TS2306: File '.../.source/index.ts' is not a module.
 *   app/docs/[[...slug]]/page.tsx(12,25): error TS2339: Property 'body' does not exist on type 'PageData'
 *
 * The second error is a consequence of the first: with no `docs` export, the
 * loader's page type degrades. Confirmed to be a flake rather than a real
 * breakage — the same commit failed on `main`, passed on its own PR branch, and
 * then passed on a re-run with no code change at all. Under Turbo, the
 * generator can also briefly expose the previous valid file before replacing
 * it, so checking only once still leaves a read-after-truncate window.
 *
 * That signature is a read-before-write-complete race between `fumadocs-mdx`
 * and `tsc` in the same `&&` chain. This is a mitigation for that race, not a
 * root-cause fix: it polls until the generated file exports `docs` and remains
 * unchanged for a short stabilization window. A genuine generation failure
 * still breaks the build instead of hanging or passing silently.
 */
import { readFile } from "node:fs/promises";

const SOURCE = new URL("../.source/index.ts", import.meta.url);
const ATTEMPTS = 50;
const DELAY_MS = 100;
const STABLE_READS_REQUIRED = 5;
let previousContents;
let stableReads = 0;

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const contents = await readFile(SOURCE, "utf8");
    if (/export\s+const\s+docs\b/.test(contents)) {
      stableReads = contents === previousContents ? stableReads + 1 : 1;
      previousContents = contents;
      if (stableReads >= STABLE_READS_REQUIRED) process.exit(0);
    } else {
      previousContents = undefined;
      stableReads = 0;
    }
  } catch {
    previousContents = undefined;
    stableReads = 0;
  }
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

console.error(
  `[ensure-source] ${SOURCE.pathname} never exported "docs" after ` +
    `${(ATTEMPTS * DELAY_MS) / 1000}s. fumadocs-mdx generation genuinely failed.`,
);
process.exit(1);
