import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.PERF_DATABASE_URL;
if (!connectionString) {
  throw new Error("PERF_DATABASE_URL is not set.");
}

const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function runExplain(title: string, sql: string) {
  console.log(`\n========================================`);
  console.log(` ${title}`);
  console.log(`========================================`);
  const rows = await db.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(sql);
  const plan = rows.map((r) => r["QUERY PLAN"]).join("\n");
  console.log(plan);
  return plan;
}

async function main() {
  console.log("Connected to performance branch. Running ANALYZE...");
  await db.$executeRawUnsafe(`ANALYZE "Model";`);
  await db.$executeRawUnsafe(`ANALYZE "ModelEndpoint";`);
  await db.$executeRawUnsafe(`ANALYZE "Provider";`);
  await db.$executeRawUnsafe(`ANALYZE "AiLab";`);
  await db.$executeRawUnsafe(`ANALYZE "BenchmarkScore";`);
  console.log("ANALYZE complete.");

  const modelCount = await db.model.count({
    where: { slug: { startsWith: "perf-model-" } },
  });
  const endpointCount = await db.modelEndpoint.count({
    where: { providerModelId: { contains: "perf-model-" } },
  });
  const totalModels = await db.model.count();
  const totalEndpoints = await db.modelEndpoint.count();

  console.log("\nCounts on Performance Branch:");
  console.log(`Synthetic Models: ${modelCount}`);
  console.log(`Synthetic Endpoints: ${endpointCount}`);
  console.log(`Total Models in Branch: ${totalModels}`);
  console.log(`Total Endpoints in Branch: ${totalEndpoints}`);

  // Test A — Model search
  await runExplain(
    "TEST A: Model Search (EXPLAIN ANALYZE, BUFFERS, VERBOSE)",
    `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    m."id",
    m."slug",
    m."name",
    m."minInputPricePer1m"
FROM "Model" m
WHERE
    m."status" NOT IN ('DEPRECATED', 'RETIRED')
    AND (
        m."name" ILIKE '%perf-model-000123%'
        OR m."slug" ILIKE '%perf-model-000123%'
        OR m."description" ILIKE '%perf-model-000123%'
    )
ORDER BY
    m."name" ASC,
    m."id" ASC
LIMIT 20 OFFSET 0;`
  );

  // Test B — Full-text search
  await runExplain(
    "TEST B: Full-Text Search (EXPLAIN ANALYZE, BUFFERS)",
    `EXPLAIN (ANALYZE, BUFFERS)
SELECT
    "id",
    "slug",
    "name"
FROM "Model"
WHERE
    to_tsvector(
        'simple',
        coalesce("name", '') || ' ' ||
        coalesce("slug", '') || ' ' ||
        coalesce("description", '')
    )
    @@ plainto_tsquery('simple', '000123')
LIMIT 20;`
  );

  // Test C — Price sorting
  await runExplain(
    "TEST C: Price Sorting (EXPLAIN ANALYZE, BUFFERS)",
    `EXPLAIN (ANALYZE, BUFFERS)
SELECT
    "id",
    "slug",
    "name",
    "minInputPricePer1m"
FROM "Model"
WHERE
    "status" NOT IN ('DEPRECATED', 'RETIRED')
ORDER BY
    "minInputPricePer1m" ASC NULLS LAST,
    "id" ASC
LIMIT 20 OFFSET 0;`
  );

  // Test D — Provider endpoint lookup
  await runExplain(
    "TEST D: Provider Endpoint Lookup (EXPLAIN ANALYZE, BUFFERS)",
    `EXPLAIN (ANALYZE, BUFFERS)
SELECT
    e."id",
    e."providerModelId",
    e."inputPricePer1m",
    e."outputPricePer1m",
    p."name" AS provider_name
FROM "ModelEndpoint" e
JOIN "Provider" p
    ON p."id" = e."providerId"
WHERE
    e."modelId" = (
        SELECT "id"
        FROM "Model"
        WHERE "slug" = 'perf-model-000001'
    )
    AND e."isActive" = true;`
  );

  // Test E — Inspect index usage
  console.log(`\n========================================`);
  console.log(` TEST E: Index Usage Statistics`);
  console.log(`========================================`);
  const indexStats = await db.$queryRawUnsafe<any[]>(`
SELECT
    relname::text AS table_name,
    indexrelname::text AS index_name,
    idx_scan::int,
    idx_tup_read::int,
    idx_tup_fetch::int
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND relname IN (
    'Model',
    'ModelEndpoint',
    'Provider'
)
ORDER BY relname, indexrelname;
`);
  console.table(indexStats);
}

main()
  .catch((e) => {
    console.error("Execution failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
