import { z } from "zod";

const booleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const positiveInteger = z.coerce
  .number()
  .int()
  .positive();

const decimalQuery = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .refine((value) => Number.isFinite(Number(value)));

export const modelQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),

  lab: z.string().min(1).max(180).optional(),
  provider: z.string().min(1).max(180).optional(),

  type: z
    .enum([
      "CHAT",
      "EMBEDDING",
      "IMAGE",
      "AUDIO",
      "VIDEO",
      "MULTIMODAL",
      "RERANKER",
      "OTHER",
    ])
    .optional(),

  modalities: z.array(z.string().min(1).max(40)).default([]),

  reasoning: booleanQuery.optional(),
  toolCalling: booleanQuery.optional(),
  structuredOutput: booleanQuery.optional(),
  openWeights: booleanQuery.optional(),

  zdr: booleanQuery.optional(),

  region: z.string().min(2).max(80).optional(),

  minContext: positiveInteger.optional(),

  maxInputPrice: decimalQuery.optional(),

  sort: z
    .enum([
      "name",
      "inputPrice",
      "outputPrice",
      "context",
      "releaseDate",
    ])
    .default("name"),

  order: z.enum(["asc", "desc"]).default("asc"),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  hideDeprecated: booleanQuery.default(true),
});

export type ModelQuery = z.infer<typeof modelQuerySchema>;

export function parseModelQuery(
  params: URLSearchParams
): ModelQuery {
  return modelQuerySchema.parse({
    q: params.get("q") ?? undefined,

    lab: params.get("lab") ?? undefined,
    provider: params.get("provider") ?? undefined,

    type: params.get("type") ?? undefined,

    modalities: params
      .getAll("modality")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),

    reasoning: params.get("reasoning") ?? undefined,
    toolCalling: params.get("toolCalling") ?? undefined,
    structuredOutput:
      params.get("structuredOutput") ?? undefined,
    openWeights: params.get("openWeights") ?? undefined,

    zdr: params.get("zdr") ?? undefined,

    region: params.get("region") ?? undefined,

    minContext: params.get("minContext") ?? undefined,

    maxInputPrice:
      params.get("maxInputPrice") ?? undefined,

    sort: params.get("sort") ?? undefined,
    order: params.get("order") ?? undefined,

    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,

    hideDeprecated:
      params.get("hideDeprecated") ?? undefined,
  });
}

export const directoryQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type DirectoryQuery = z.infer<
  typeof directoryQuerySchema
>;

export function parseDirectoryQuery(
  params: URLSearchParams
): DirectoryQuery {
  return directoryQuerySchema.parse({
    q: params.get("q") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
}

export const comparisonQuerySchema = z
  .object({
    models: z
      .array(z.string().trim().min(1).max(220))
      .min(2)
      .max(4),
  })
  .refine(
    ({ models }) => new Set(models).size === models.length,
    "Model slugs must be unique."
  );

export function parseComparisonQuery(
  params: URLSearchParams
) {
  const rawModels = params.get("models");

  return comparisonQuerySchema.parse({
    models: rawModels
      ? rawModels.split(",").map((slug) => slug.trim())
      : [],
  });
}

export const rankingQuerySchema = z.object({
  metric: z.enum([
    "inputPrice",
    "outputPrice",
    "context",
    "benchmark",
  ]).default("inputPrice"),

  benchmark: z.string().min(1).max(180).optional(),

  order: z.enum(["asc", "desc"]).optional(),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(20),
}).superRefine((value, context) => {
  if (
    value.metric === "benchmark" &&
    !value.benchmark
  ) {
    context.addIssue({
      code: "custom",
      path: ["benchmark"],
      message: "Benchmark slug is required for benchmark rankings.",
    });
  }

  if (
    value.metric !== "benchmark" &&
    value.benchmark
  ) {
    context.addIssue({
      code: "custom",
      path: ["benchmark"],
      message: "Benchmark is only valid for benchmark rankings.",
    });
  }
});

export function parseRankingQuery(
  params: URLSearchParams
) {
  return rankingQuerySchema.parse({
    metric: params.get("metric") ?? undefined,
    benchmark: params.get("benchmark") ?? undefined,
    order: params.get("order") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
}
