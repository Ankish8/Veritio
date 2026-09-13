type Advisory = {
  url: string;
  severity: string;
  title: string;
};

type AuditReport = Record<string, Advisory[]>;

const reviewedHighs: Record<
  string,
  { packageName: string; expiresOn: string }
> = {
  "GHSA-45rx-2jwx-cxfr": {
    packageName: "@opentelemetry/propagator-jaeger",
    expiresOn: "2026-10-13",
  },
  "GHSA-jmr9-qjv8-65gv": {
    packageName: "extract-zip",
    expiresOn: "2026-10-13",
  },
  "GHSA-7pqw-9j4j-h8q3": {
    packageName: "extract-zip",
    expiresOn: "2026-10-13",
  },
  "GHSA-w3rx-r6r6-pgpr": {
    packageName: "image-size",
    expiresOn: "2026-10-13",
  },
  "GHSA-5p2g-fcmc-qvqq": {
    packageName: "image-size",
    expiresOn: "2026-10-13",
  },
};

const audit = Bun.spawnSync(["bun", "audit", "--json"], {
  stdout: "pipe",
  stderr: "pipe",
});
const output = `${audit.stdout.toString()}\n${audit.stderr.toString()}`;
const jsonStart = output.indexOf("{");
const jsonEnd = output.lastIndexOf("}");

if (jsonStart === -1 || jsonEnd < jsonStart) {
  console.error("Could not parse `bun audit --json` output.");
  console.error(output.trim());
  process.exit(2);
}

let report: AuditReport;
try {
  report = JSON.parse(output.slice(jsonStart, jsonEnd + 1)) as AuditReport;
} catch (error) {
  console.error("Invalid JSON returned by `bun audit --json`.", error);
  process.exit(2);
}

const activeReviewed = new Set<string>();
const failures: string[] = [];
const today = new Date().toISOString().slice(0, 10);

for (const [packageName, advisories] of Object.entries(report)) {
  for (const advisory of advisories) {
    if (advisory.severity !== "critical" && advisory.severity !== "high") {
      continue;
    }

    const ghsa = advisory.url.match(/GHSA-[\w-]+$/)?.[0];
    const review = ghsa ? reviewedHighs[ghsa] : undefined;
    if (!review || review.packageName !== packageName) {
      failures.push(
        `${advisory.severity.toUpperCase()} ${packageName}: ${advisory.title} (${advisory.url})`,
      );
      continue;
    }
    if (review.expiresOn < today) {
      failures.push(
        `EXPIRED ${packageName}: ${ghsa} was due for review on ${review.expiresOn}`,
      );
      continue;
    }
    activeReviewed.add(ghsa);
    console.log(
      `Reviewed high: ${packageName} ${ghsa} (expires ${review.expiresOn})`,
    );
  }
}

for (const ghsa of Object.keys(reviewedHighs)) {
  if (!activeReviewed.has(ghsa)) {
    failures.push(
      `Stale exception ${ghsa}: remove it from scripts/audit-security.ts and the review document`,
    );
  }
}

if (failures.length > 0) {
  console.error("\nDependency security gate failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Dependency security gate passed: no critical or unreviewed high advisories.",
);
