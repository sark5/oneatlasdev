import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaNeon } from "@prisma/adapter-neon";

import {
  PrismaClient,
  Prisma,
  ModelType,
  ModelStatus,
  ProviderKind,
  IngestionSource,
} from "../../generated/prisma/client";

const connectionString = process.env.PERF_DATABASE_URL;

const confirmation =
  process.env.ONEATLAS_PERF_SEED_CONFIRM;

if (
  confirmation !==
  "I_AM_USING_A_DISPOSABLE_PERFORMANCE_BRANCH"
) {
  throw new Error(
    "Performance seed blocked. Set ONEATLAS_PERF_SEED_CONFIRM to the required confirmation value."
  );
}

if (!connectionString) {
  throw new Error(
    "PERF_DATABASE_URL is required."
  );
}

const perfUrl = new URL(connectionString);

if (
  !perfUrl.hostname.includes("-pooler") ||
  !["postgres:", "postgresql:"].includes(perfUrl.protocol)
) {
  throw new Error(
    "Use the pooled PostgreSQL URL of the disposable Neon performance branch."
  );
}

const MODEL_COUNT = Number(
  process.env.PERF_MODEL_COUNT ?? 10_000
);

const BATCH_SIZE = 500;

if (
  !Number.isInteger(MODEL_COUNT) ||
  MODEL_COUNT < 10_000 ||
  MODEL_COUNT > 50_000
) {
  throw new Error(
    "PERF_MODEL_COUNT must be between 10000 and 50000."
  );
}

const adapter = new PrismaNeon({
  connectionString,
  max: 5,
});

const db = new PrismaClient({ adapter });

const MODEL_TYPES = [
  ModelType.CHAT,
  ModelType.CHAT,
  ModelType.CHAT,
  ModelType.EMBEDDING,
  ModelType.MULTIMODAL,
  ModelType.AUDIO,
  ModelType.RERANKER,
  ModelType.IMAGE,
] as const;

const CONTEXT_WINDOWS = [
  8192,
  16384,
  32768,
  65536,
  128000,
  200000,
] as const;

function slugFor(index: number): string {
  return `perf-model-${String(index).padStart(6, "0")}`;
}

function inputPrice(index: number, route: number): string {
  const base = 0.05 + ((index * 17) % 400) / 100;

  const adjusted = route === 0
    ? base
    : base * 1.25;

  return adjusted.toFixed(10);
}

function outputPrice(index: number, route: number): string {
  const input = Number(inputPrice(index, route));

  const multiplier = route === 0 ? 4 : 3.5;

  return (input * multiplier).toFixed(10);
}

async function insertInBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<{ count: number }>
): Promise<number> {
  let inserted = 0;

  for (
    let start = 0;
    start < rows.length;
    start += BATCH_SIZE
  ) {
    const batch = rows.slice(
      start,
      start + BATCH_SIZE
    );

    let result: { count: number } | null = null;
    let attempts = 0;
    while (!result && attempts < 3) {
      try {
        attempts++;
        result = await insert(batch);
      } catch (err) {
        if (attempts >= 3) throw err;
        console.warn(`Batch failed on attempt ${attempts}, retrying...`, err instanceof Error ? err.message : err);
        await new Promise((res) => setTimeout(res, 1000 * attempts));
      }
    }

    inserted += result!.count;

    console.log(
      `Inserted ${inserted.toLocaleString()} / ${rows.length.toLocaleString()}`
    );
  }

  return inserted;
}

async function main() {
  console.log("====================================");
  console.log(" ONEATLAS PERFORMANCE DATA GENERATOR");
  console.log("====================================");

  console.log("Models:", MODEL_COUNT);
  console.log("Endpoints:", MODEL_COUNT * 2);
  console.log("Batch size:", BATCH_SIZE);
  console.log("Target:", perfUrl.hostname);

  // Remove only records with our dedicated prefix.
  // Run this script only on the disposable branch.
  const deletedModels = await db.model.deleteMany({
    where: {
      slug: {
        startsWith: "perf-model-",
      },
    },
  });

  console.log(
    "Old synthetic models removed:",
    deletedModels.count
  );

  await db.provider.deleteMany({
    where: {
      slug: {
        startsWith: "perf-provider-",
      },
    },
  });

  await db.aiLab.deleteMany({
    where: {
      slug: {
        startsWith: "perf-lab-",
      },
    },
  });

  // Create dedicated synthetic labs.
  const labs = await Promise.all(
    Array.from({ length: 10 }, (_, i) => {
      const number = String(i + 1).padStart(2, "0");

      return db.aiLab.upsert({
        where: {
          slug: `perf-lab-${number}`,
        },

        create: {
          slug: `perf-lab-${number}`,
          name: `Performance Test Lab ${number}`,
          description: "Synthetic performance fixture.",
          sourceUrl:
            "https://example.invalid/oneatlas-performance",
        },

        update: {
          name: `Performance Test Lab ${number}`,
        },
      });
    })
  );

  // Create dedicated synthetic providers.
  const providers = await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const number = String(i + 1).padStart(2, "0");

      return db.provider.upsert({
        where: {
          slug: `perf-provider-${number}`,
        },

        create: {
          slug: `perf-provider-${number}`,
          name: `Performance Test Provider ${number}`,
          kind: ProviderKind.OTHER,
          description: "Synthetic performance fixture.",
          websiteUrl: null,
        },

        update: {
          name: `Performance Test Provider ${number}`,
        },
      });
    })
  );

  const modelRows: Prisma.ModelCreateManyInput[] = [];

  const endpointRows: Prisma.ModelEndpointCreateManyInput[] = [];

  for (let index = 1; index <= MODEL_COUNT; index++) {
    const slug = slugFor(index);

    const id = randomUUID();

    const lab = labs[(index - 1) % labs.length];

    const providerA = providers[
      (index - 1) % providers.length
    ];

    const providerB = providers[
      index % providers.length
    ];

    const contextWindow =
      CONTEXT_WINDOWS[
        (index - 1) % CONTEXT_WINDOWS.length
      ];

    const type =
      MODEL_TYPES[
        (index - 1) % MODEL_TYPES.length
      ];

    const inputA = inputPrice(index, 0);
    const inputB = inputPrice(index, 1);

    const outputA = outputPrice(index, 0);
    const outputB = outputPrice(index, 1);

    const minimumInput = Math.min(
      Number(inputA),
      Number(inputB)
    );

    const minimumOutput = Math.min(
      Number(outputA),
      Number(outputB)
    );

    modelRows.push({
      id,
      slug,
      name: `OneAtlas Performance Model ${String(index).padStart(6, "0")}`,

      description:
        `Synthetic performance test model ${String(index).padStart(6, "0")}. Search fixture for OneAtlas.`,

      modelType: type,
      status: ModelStatus.ACTIVE,

      labId: lab.id,

      contextWindow,
      maxOutputTokens: 4096,

      inputModalities:
        type === ModelType.IMAGE
          ? ["text", "image"]
          : ["text"],

      outputModalities:
        type === ModelType.EMBEDDING
          ? ["embedding"]
          : ["text"],

      reasoning: index % 2 === 0,
      toolCalling: index % 3 === 0,
      structuredOutput: index % 4 === 0,
      openWeights: index % 5 === 0,

      minInputPricePer1m: minimumInput.toFixed(10),
      minOutputPricePer1m: minimumOutput.toFixed(10),

      maxContextWindow: contextWindow,

      sourceUrl:
        `https://example.invalid/oneatlas-performance/${slug}`,

      lastSyncedAt: new Date(),
    });

    const routeProviders = [
      providerA,
      providerB,
    ];

    for (let route = 0; route < 2; route++) {
      endpointRows.push({
        id: randomUUID(),

        modelId: id,
        providerId: routeProviders[route].id,

        providerModelId:
          `${slug}/performance-route-${route + 1}`,

        isDirect: false,
        isActive: true,

        contextWindow,
        maxOutputTokens: 4096,

        inputModalities:
          type === ModelType.IMAGE
            ? ["text", "image"]
            : ["text"],

        outputModalities:
          type === ModelType.EMBEDDING
            ? ["embedding"]
            : ["text"],

        inputPricePer1m:
          route === 0 ? inputA : inputB,

        outputPricePer1m:
          route === 0 ? outputA : outputB,

        currency: "USD",

        zeroDataRetention: route === 0,

        regions: route === 0
          ? ["us"]
          : ["eu"],

        latencyMs:
          (50 + (index % 250) + route * 15).toFixed(3),

        uptimePercent:
          (98 + (index % 20) / 100).toFixed(2),

        source: IngestionSource.MANUAL,

        sourceUrl:
          "https://example.invalid/oneatlas-performance",
      });
    }
  }

  console.log("\nInserting models...");

  const modelCount = await insertInBatches(
    modelRows,
    (batch) =>
      db.model.createMany({
        data: batch,
        skipDuplicates: true,
      })
  );

  console.log("\nInserting endpoints...");

  const endpointCount = await insertInBatches(
    endpointRows,
    (batch) =>
      db.modelEndpoint.createMany({
        data: batch,
        skipDuplicates: true,
      })
  );

  const actualModelCount = await db.model.count({
    where: { slug: { startsWith: "perf-model-" } },
  });
  const actualEndpointCount = await db.modelEndpoint.count({
    where: { providerModelId: { contains: "perf-model-" } },
  });

  console.log("\nPerformance seed completed.");

  console.table({
    models: actualModelCount,
    endpoints: actualEndpointCount,
    labs: labs.length,
    providers: providers.length,
  });

  if (
    actualModelCount !== MODEL_COUNT ||
    actualEndpointCount !== MODEL_COUNT * 2
  ) {
    throw new Error(
      "Seed count does not match the expected synthetic dataset."
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("Performance seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
