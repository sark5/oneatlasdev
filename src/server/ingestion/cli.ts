import "dotenv/config";
import { IngestionSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fetchOpenRouterModels } from "./adapters/openrouter.adapter";
import { fetchLiteLLMModels } from "./adapters/litellm.adapter";
import {
  normalizeOpenRouterRecord,
  normalizeLiteLLMRecord,
} from "./services/normalization.service";
import { runIngestion } from "./services/ingestion.service";

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function parseOptions() {
  const source = getArgument("--source") ?? "all";
  const limit = Number(
    getArgument("--limit") ?? env.INGESTION_DEFAULT_LIMIT
  );

  if (!["openrouter", "litellm", "all"].includes(source)) {
    throw new Error(
      "Invalid source. Use openrouter, litellm or all."
    );
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error(
      "Ingestion limit must be an integer between 1 and 100."
    );
  }

  return {
    source,
    limit,
  };
}

async function runOpenRouter(limit: number) {
  console.log("\nStarting OpenRouter ingestion...\n");
  const summary = await runIngestion(
    IngestionSource.OPENROUTER,
    () => fetchOpenRouterModels(limit),
    (_externalId, payload) =>
      normalizeOpenRouterRecord(payload)
  );
  console.table(summary);
  return summary;
}

async function runLiteLLM(limit: number) {
  console.log("\nStarting LiteLLM enrichment...\n");
  const existingModels = await prisma.model.findMany({
    select: {
      slug: true,
    },
  });

  const existingSlugs = new Set(
    existingModels.map((model) => model.slug)
  );

  const summary = await runIngestion(
    IngestionSource.LITELLM,
    () => fetchLiteLLMModels(existingSlugs, limit),
    (externalId, payload) =>
      normalizeLiteLLMRecord(externalId, payload)
  );
  console.table(summary);
  return summary;
}

async function main() {
  const options = parseOptions();

  console.log("==================================");
  console.log(" ONEATLAS INGESTION");
  console.log("==================================");
  console.log("Source:", options.source);
  console.log("Limit:", options.limit);

  if (
    options.source === "openrouter" ||
    options.source === "all"
  ) {
    await runOpenRouter(options.limit);
  }

  if (
    options.source === "litellm" ||
    options.source === "all"
  ) {
    await runLiteLLM(options.limit);
  }

  console.log("\nIngestion execution completed.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Ingestion failed:",
      error instanceof Error
        ? error.message
        : "Unknown failure"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
