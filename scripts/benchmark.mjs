import {
  mkdirSync,
  writeFileSync,
} from "node:fs";

import { performance } from "node:perf_hooks";

const BASE_URL = (
  process.env.PERF_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const DURATION_SECONDS = Number(
  process.env.PERF_DURATION_SECONDS ?? 15
);

const CONNECTIONS = Number(
  process.env.PERF_CONNECTIONS ?? 5
);

const MODEL_A =
  process.env.PERF_MODEL_A ??
  "perf-model-000001";

const MODEL_B =
  process.env.PERF_MODEL_B ??
  "perf-model-000002";

if (
  !Number.isInteger(DURATION_SECONDS) ||
  DURATION_SECONDS < 5 ||
  DURATION_SECONDS > 120
) {
  throw new Error(
    "PERF_DURATION_SECONDS must be between 5 and 120."
  );
}

if (
  !Number.isInteger(CONNECTIONS) ||
  CONNECTIONS < 1 ||
  CONNECTIONS > 50
) {
  throw new Error(
    "PERF_CONNECTIONS must be between 1 and 50."
  );
}

const scenarios = [
  {
    name: "Model Listing",
    path: "/api/v1/models?limit=20&page=1",
  },

  {
    name: "Exact Model Search",
    path: "/api/v1/models?q=perf-model-000123&limit=20",
  },

  {
    name: "Price Sorting",
    path:
      "/api/v1/models?type=CHAT&sort=inputPrice&order=asc&limit=20",
  },

  {
    name: "Model Detail",
    path: `/api/v1/models/${encodeURIComponent(MODEL_A)}`,
  },

  {
    name: "Model Comparison",
    path:
      `/api/v1/compare?models=${encodeURIComponent(MODEL_A)},${encodeURIComponent(MODEL_B)}`,
  },

  {
    name: "Catalogue Facets",
    path: "/api/v1/models/facets",
  },
];

function percentile(values, percentage) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const rank = Math.max(
    0,
    Math.ceil(percentage * sorted.length) - 1
  );

  return Number(sorted[rank].toFixed(2));
}

async function runWorkers(
  url,
  durationMs,
  connections,
  collect
) {
  const latencies = [];

  const statusCodes = {};

  let errors = 0;
  let non2xx = 0;
  let totalRequests = 0;

  const started = performance.now();

  const deadline = Date.now() + durationMs;

  async function worker() {
    while (Date.now() < deadline) {
      const requestStarted = performance.now();

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15000),
        });

        // Consume the body before recording latency.
        await response.arrayBuffer();

        const elapsed =
          performance.now() - requestStarted;

        totalRequests++;

        statusCodes[response.status] =
          (statusCodes[response.status] ?? 0) + 1;

        if (!response.ok) {
          non2xx++;
        }

        if (collect) {
          latencies.push(elapsed);
        }
      } catch {
        errors++;
        totalRequests++;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: connections },
      () => worker()
    )
  );

  const elapsedSeconds =
    (performance.now() - started) / 1000;

  if (!collect) {
    return null;
  }

  return {
    totalRequests,
    successfulResponses: totalRequests - errors - non2xx,
    non2xx,
    errors,
    statusCodes,

    requestsPerSecond: Number(
      (totalRequests / elapsedSeconds).toFixed(2)
    ),

    p50Ms: percentile(latencies, 0.50),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),

    averageMs: latencies.length
      ? Number(
          (
            latencies.reduce((a, b) => a + b, 0) /
            latencies.length
          ).toFixed(2)
        )
      : null,

    minMs: latencies.length
      ? Number(Math.min(...latencies).toFixed(2))
      : null,

    maxMs: latencies.length
      ? Number(Math.max(...latencies).toFixed(2))
      : null,

    measuredRequests: latencies.length,
    durationSeconds: Number(
      elapsedSeconds.toFixed(2)
    ),
  };
}

async function benchmarkScenario(scenario) {
  const url = `${BASE_URL}${scenario.path}`;

  console.log(`\nTesting: ${scenario.name}`);
  console.log(`URL: ${url}`);

  // Warm the application and database.
  await runWorkers(
    url,
    2000,
    Math.min(CONNECTIONS, 2),
    false
  );

  const result = await runWorkers(
    url,
    DURATION_SECONDS * 1000,
    CONNECTIONS,
    true
  );

  return {
    name: scenario.name,
    path: scenario.path,
    ...result,
  };
}

async function main() {
  console.log("================================");
  console.log(" ONEATLAS API PERFORMANCE TEST");
  console.log("================================");

  console.log("Base URL:", BASE_URL);
  console.log("Connections:", CONNECTIONS);
  console.log("Duration:", DURATION_SECONDS, "seconds");

  const results = [];

  for (const scenario of scenarios) {
    results.push(
      await benchmarkScenario(scenario)
    );
  }

  console.log("\n================================");
  console.log(" PERFORMANCE RESULTS");
  console.log("================================");

  console.table(
    results.map((result) => ({
      endpoint: result.name,
      requests: result.totalRequests,
      rps: result.requestsPerSecond,
      p50: result.p50Ms,
      p95: result.p95Ms,
      p99: result.p99Ms,
      errors: result.errors,
      non2xx: result.non2xx,
    }))
  );

  mkdirSync("reports", { recursive: true });

  const filename =
    `reports/performance-${new Date()
      .toISOString()
      .replaceAll(":", "-")}.json`;

  writeFileSync(
    filename,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        connections: CONNECTIONS,
        durationSeconds: DURATION_SECONDS,
        results,
      },
      null,
      2
    )
  );

  console.log("\nReport saved:", filename);

  const hasFailures = results.some(
    (result) =>
      result.errors > 0 ||
      result.non2xx > 0
  );

  if (hasFailures) {
    console.error(
      "\nSome requests failed. Investigate before accepting this benchmark."
    );

    process.exitCode = 1;
  } else {
    console.log(
      "\nAll benchmark requests returned successful HTTP responses."
    );
  }
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exitCode = 1;
});
