import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("=== C. Ingestion Run History ===");
  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      id: true,
      source: true,
      trigger: true,
      status: true,
      recordsRead: true,
      recordsWritten: true,
      recordsSkipped: true,
      recordsRejected: true,
      startedAt: true,
      finishedAt: true,
      errorSummary: true,
    },
  });
  console.table(runs);

  console.log("\n=== D. Endpoint Lifecycle ===");
  const endpointCounts = await prisma.$queryRaw<any[]>`
    SELECT
      "source"::text,
      "isActive",
      COUNT(*)::int AS total,
      COUNT("deactivatedAt")::int AS deactivated
    FROM "ModelEndpoint"
    GROUP BY "source", "isActive"
    ORDER BY "source", "isActive";
  `;
  console.table(endpointCounts);

  console.log("\n=== E. Current Ingestion Leases ===");
  const leases = await prisma.$queryRaw<any[]>`
    SELECT
      "source"::text,
      "ownerRunId",
      "expiresAt",
      "updatedAt",
      CASE
        WHEN "expiresAt" > NOW() THEN 'ACTIVE'
        ELSE 'EXPIRED'
      END AS lease_status
    FROM "IngestionLease";
  `;
  console.table(leases);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
