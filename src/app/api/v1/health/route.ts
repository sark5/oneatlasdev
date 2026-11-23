import {
  IngestionSource,
  IngestionStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

import {
  ApiError,
} from "@/server/api/errors";

import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

const sources = [
  IngestionSource.OPENROUTER,
  IngestionSource.LITELLM,
];

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const now = Date.now();

    const freshnessResults = await Promise.all(
      sources.map(async (source) => {
        const [lastSuccess, lastAttempt] =
          await Promise.all([
            prisma.ingestionRun.findFirst({
              where: {
                source,
                status: IngestionStatus.SUCCEEDED,
                finishedAt: { not: null },
              },

              orderBy: {
                finishedAt: "desc",
              },

              select: {
                id: true,
                finishedAt: true,
              },
            }),

            prisma.ingestionRun.findFirst({
              where: { source },

              orderBy: {
                startedAt: "desc",
              },

              select: {
                id: true,
                status: true,
                startedAt: true,
                finishedAt: true,
                recordsRead: true,
                recordsWritten: true,
                recordsRejected: true,
              },
            }),
          ]);

        const lastSuccessfulSyncAt =
          lastSuccess?.finishedAt ?? null;

        const ageMinutes =
          lastSuccessfulSyncAt
            ? Math.round(
                (now - lastSuccessfulSyncAt.getTime()) /
                60_000
              )
            : null;

        const stale =
          ageMinutes === null ||
          ageMinutes >
            env.INGESTION_STALE_AFTER_HOURS * 60;

        const latestFailure =
          lastAttempt?.status === IngestionStatus.FAILED &&
          (
            !lastSuccessfulSyncAt ||
            lastAttempt.startedAt > lastSuccessfulSyncAt
          );

        const latestPartial =
          lastAttempt?.status === IngestionStatus.PARTIAL;

        const runningTooLong =
          lastAttempt?.status === IngestionStatus.RUNNING &&
          now - lastAttempt.startedAt.getTime() > 15 * 60_000;

        let status: "fresh" | "stale" | "degraded" | "syncing";

        if (runningTooLong) {
          status = "degraded";
        } else if (
          lastAttempt?.status === IngestionStatus.RUNNING
        ) {
          status = "syncing";
        } else if (latestFailure || latestPartial) {
          status = "degraded";
        } else if (stale) {
          status = "stale";
        } else {
          status = "fresh";
        }

        return {
          source,
          status,

          lastSuccessfulSyncAt,

          lastAttemptAt:
            lastAttempt?.startedAt ?? null,

          lastAttemptFinishedAt:
            lastAttempt?.finishedAt ?? null,

          lastAttemptStatus:
            lastAttempt?.status ?? "NEVER_RUN",

          ageMinutes,

          recordsRead:
            lastAttempt?.recordsRead ?? 0,

          recordsWritten:
            lastAttempt?.recordsWritten ?? 0,

          recordsRejected:
            lastAttempt?.recordsRejected ?? 0,
        };
      })
    );

    const overallHealthy = freshnessResults.every(
      (result) => result.status === "fresh"
    );

    return successResponse({
      status: overallHealthy
        ? "ok"
        : "degraded",

      database: {
        connected: true,
        latencyMs: Number(
          (performance.now() - startedAt).toFixed(2)
        ),
      },

      ingestion: {
        staleAfterHours:
          env.INGESTION_STALE_AFTER_HOURS,

        sources: freshnessResults,
      },

      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if ((error as any)?.digest?.startsWith("NEXT_")) throw error;
    console.error("Health check error:", error);
    return errorResponse(
      new ApiError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database connectivity check failed."
      )
    );
  }
}
