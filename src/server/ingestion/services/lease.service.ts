import { prisma } from "@/lib/prisma";
import type { IngestionSource } from "@/generated/prisma/client";

export async function acquireIngestionLease(
  source: IngestionSource,
  ownerRunId: string
): Promise<boolean> {
  const rows = await prisma.$queryRaw<
    Array<{ source: string }>
  >`
    INSERT INTO "IngestionLease" (
      "source",
      "ownerRunId",
      "expiresAt",
      "updatedAt"
    )
    VALUES (
      ${source}::"IngestionSource",
      ${ownerRunId},
      NOW() + INTERVAL '5 minutes',
      NOW()
    )
    ON CONFLICT ("source")
    DO UPDATE SET
      "ownerRunId" = EXCLUDED."ownerRunId",
      "expiresAt" = EXCLUDED."expiresAt",
      "updatedAt" = NOW()
    WHERE "IngestionLease"."expiresAt" < NOW()
    RETURNING "source"
  `;

  return rows.length === 1;
}

export async function renewIngestionLease(
  source: IngestionSource,
  ownerRunId: string
): Promise<boolean> {
  const affected = await prisma.$executeRaw`
    UPDATE "IngestionLease"
    SET
      "expiresAt" = NOW() + INTERVAL '5 minutes',
      "updatedAt" = NOW()
    WHERE
      "source" = ${source}::"IngestionSource"
      AND "ownerRunId" = ${ownerRunId}
  `;

  return affected === 1;
}

export async function releaseIngestionLease(
  source: IngestionSource,
  ownerRunId: string
): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "IngestionLease"
    WHERE
      "source" = ${source}::"IngestionSource"
      AND "ownerRunId" = ${ownerRunId}
  `;
}

export async function markAbandonedIngestionRuns(
  source: IngestionSource,
  currentRunId: string
): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "IngestionRun" r

    SET
      "status" = 'FAILED'::"IngestionStatus",
      "finishedAt" = NOW(),
      "errorSummary" =
        'Previous worker terminated or lost its ingestion lease.'

    WHERE
      r."source" = ${source}::"IngestionSource"
      AND r."status" = 'RUNNING'::"IngestionStatus"
      AND r."id" <> ${currentRunId}

      AND NOT EXISTS (
        SELECT 1
        FROM "IngestionLease" l
        WHERE
          l."ownerRunId" = r."id"
          AND l."expiresAt" > NOW()
      )
  `;
}
