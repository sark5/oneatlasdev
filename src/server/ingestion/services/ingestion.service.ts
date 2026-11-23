import {
  IngestionStatus,
  IngestionTrigger,
  type IngestionSource,
  Prisma,
} from "@/generated/prisma/client";

import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";

import type {
  AdapterBatch,
  IngestionSummary,
  NormalizedRecord,
} from "../types";

import {
  createContentHash,
} from "../utils/hash";

import {
  acquireIngestionLease,
  renewIngestionLease,
  releaseIngestionLease,
  markAbandonedIngestionRuns,
} from "./lease.service";

import {
  persistNormalizedRecord,
} from "./persistence.service";

type RecordNormalizer = (
  externalId: string,
  payload: unknown
) => NormalizedRecord;

interface IngestionOptions {
  trigger?: IngestionTrigger;
}

export async function runIngestion(
  source: IngestionSource,
  loadBatch: () => Promise<AdapterBatch>,
  normalize: RecordNormalizer,
  options: IngestionOptions = {}
): Promise<IngestionSummary> {
  const run = await prisma.ingestionRun.create({
    data: {
      source,
      trigger:
        options.trigger ?? IngestionTrigger.MANUAL,

      status: IngestionStatus.RUNNING,
    },
  });

  const counters = {
    recordsRead: 0,
    recordsWritten: 0,
    recordsSkipped: 0,
    recordsRejected: 0,
  };

  let leaseAcquired = false;
  let leaseLost = false;

  let heartbeat:
    | ReturnType<typeof setInterval>
    | undefined;

  try {
    leaseAcquired = await acquireIngestionLease(
      source,
      run.id
    );

    if (!leaseAcquired) {
      throw new Error(
        "Another ingestion worker already holds this source lease."
      );
    }

    await markAbandonedIngestionRuns(
      source,
      run.id
    );

    heartbeat = setInterval(() => {
      void renewIngestionLease(
        source,
        run.id
      )
        .then((renewed) => {
          if (!renewed) {
            leaseLost = true;
          }
        })
        .catch(() => {
          leaseLost = true;
        });
    }, 60_000);

    const batch = await loadBatch();

    counters.recordsRead =
      batch.totalSourceRecords;

    counters.recordsSkipped =
      batch.preSkipped;

    for (const item of batch.records) {
      if (leaseLost) {
        throw new Error(
          "Ingestion lease was lost. Worker stopped safely."
        );
      }

      const payload =
        item.payload as Prisma.InputJsonValue;

      // Save raw data before validation.
      // Upsert prevents duplicate snapshots if
      // the same run is retried.
      await prisma.rawModelSnapshot.upsert({
        where: {
          ingestionRunId_source_externalId_contentHash: {
            ingestionRunId: run.id,
            source,
            externalId: item.externalId,
            contentHash: createContentHash(item.payload),
          },
        },

        create: {
          ingestionRunId: run.id,
          source,
          externalId: item.externalId,
          contentHash: createContentHash(item.payload),
          payload,
        },

        update: {},
      });

      let normalized: NormalizedRecord;

      try {
        normalized = normalize(
          item.externalId,
          item.payload
        );
      } catch (error) {
        const validationErrors =
          error instanceof ZodError
            ? error.issues.map((issue) => ({
                path: issue.path.map(String).join("."),
                message: issue.message,
                code: issue.code,
              }))
            : [
                {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Unknown normalization error",
                },
              ];

        await prisma.quarantinedRecord.create({
          data: {
            ingestionRunId: run.id,
            source,
            externalId: item.externalId,
            payload,
            reason: "NORMALIZATION_FAILED",

            validationErrors:
              validationErrors as Prisma.InputJsonValue,
          },
        });

        counters.recordsRejected++;
        continue;
      }

      const persisted =
        await persistNormalizedRecord(
          source,
          normalized
        );

      if (persisted) {
        counters.recordsWritten++;
      } else {
        counters.recordsSkipped++;
      }
    }

    const finalStatus =
      counters.recordsRejected > 0
        ? IngestionStatus.PARTIAL
        : IngestionStatus.SUCCEEDED;

    await prisma.ingestionRun.update({
      where: {
        id: run.id,
      },

      data: {
        ...counters,
        status: finalStatus,
        finishedAt: new Date(),
      },
    });

    return {
      runId: run.id,
      source,
      ...counters,

      status:
        finalStatus === IngestionStatus.PARTIAL
          ? "PARTIAL"
          : "SUCCEEDED",
    };
  } catch (error) {
    await prisma.ingestionRun.update({
      where: {
        id: run.id,
      },

      data: {
        ...counters,
        status: IngestionStatus.FAILED,
        finishedAt: new Date(),

        errorSummary:
          error instanceof Error
            ? error.message.slice(0, 2000)
            : "Unknown ingestion failure",
      },
    });

    throw error;
  } finally {
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    if (leaseAcquired) {
      try {
        await releaseIngestionLease(
          source,
          run.id
        );
      } catch (error) {
        console.error(
          "Failed to release ingestion lease:",
          error
        );
      }
    }
  }
}
