import {
  IngestionSource,
  IngestionTrigger,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

import {
  fetchOpenRouterModels,
} from "./adapters/openrouter.adapter";

import {
  fetchLiteLLMModels,
} from "./adapters/litellm.adapter";

import {
  normalizeOpenRouterRecord,
  normalizeLiteLLMRecord,
} from "./services/normalization.service";

import {
  runIngestion,
} from "./services/ingestion.service";

import {
  findModelSummaryDrift,
  repairModelSummaries,
} from "./services/consistency.service";

export async function runScheduledIngestion() {
  const results: Array<{
    source: string;
    success: boolean;
    summary?: unknown;
    error?: string;
  }> = [];

  // Run sources sequentially because both may update
  // the same model summary columns.
  try {
    const summary = await runIngestion(
      IngestionSource.OPENROUTER,

      () => fetchOpenRouterModels(
        env.INGESTION_DEFAULT_LIMIT
      ),

      (_externalId, payload) =>
        normalizeOpenRouterRecord(payload),

      {
        trigger: IngestionTrigger.CRON,
      }
    );

    results.push({
      source: "OPENROUTER",
      success: summary.status === "SUCCEEDED",
      summary,
    });
  } catch (error) {
    results.push({
      source: "OPENROUTER",
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "OpenRouter ingestion failed",
    });
  }

  try {
    const models = await prisma.model.findMany({
      select: {
        slug: true,
      },
    });

    const slugs = new Set(
      models.map((model) => model.slug)
    );

    const summary = await runIngestion(
      IngestionSource.LITELLM,

      () => fetchLiteLLMModels(
        slugs,
        env.INGESTION_DEFAULT_LIMIT
      ),

      (externalId, payload) =>
        normalizeLiteLLMRecord(
          externalId,
          payload
        ),

      {
        trigger: IngestionTrigger.CRON,
      }
    );

    results.push({
      source: "LITELLM",
      success: summary.status === "SUCCEEDED",
      summary,
    });
  } catch (error) {
    results.push({
      source: "LITELLM",
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "LiteLLM ingestion failed",
    });
  }

  // Repair summaries even when one source fails,
  // because the other source may have completed writes.
  const initialDrift = await findModelSummaryDrift();

  if (initialDrift.length > 0) {
    await repairModelSummaries();
  }

  const remainingDrift = await findModelSummaryDrift();

  return {
    success:
      results.every((result) => result.success) &&
      remainingDrift.length === 0,

    results,

    consistency: {
      driftDetected: initialDrift.length,
      remainingDrift: remainingDrift.length,
      repaired: initialDrift.length > 0,
    },

    completedAt: new Date().toISOString(),
  };
}
