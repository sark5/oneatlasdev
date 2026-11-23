import { z } from "zod";

const numberOrString = z.union([
  z.number(),
  z.string(),
]);

const nullableNumberOrString = numberOrString
  .nullable()
  .optional();

const modalitySchema = z.array(z.string());

const priceSchema = z.string()
  .regex(/^\d+(\.\d+)?$/)
  .nullable();

export const OpenRouterModelSchema = z.object({
  id: z.string().min(1),
  canonical_slug: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  context_length: z.number()
    .int()
    .positive()
    .nullable()
    .optional(),
  created: z.number()
    .nullable()
    .optional(),
  architecture: z.object({
    input_modalities: modalitySchema.optional(),
    output_modalities: modalitySchema.optional(),
  }).passthrough().optional(),
  pricing: z.object({
    prompt: nullableNumberOrString,
    completion: nullableNumberOrString,
  }).passthrough().optional(),
  top_provider: z.object({
    context_length: z.number()
      .int()
      .positive()
      .nullable()
      .optional(),
    max_completion_tokens: z.number()
      .int()
      .positive()
      .nullable()
      .optional(),
  }).passthrough().nullable().optional(),
  supported_parameters: z.array(z.string()).optional(),
  expiration_date: z.string().nullable().optional(),
}).passthrough();

export const OpenRouterEndpointSchema = z.object({
  provider_name: z.string().min(1),
  tag: z.string().nullable().optional(),
  model_id: z.string().optional(),
  context_length: z.number()
    .int()
    .positive()
    .nullable()
    .optional(),
  max_completion_tokens: z.number()
    .int()
    .positive()
    .nullable()
    .optional(),
  pricing: z.object({
    prompt: nullableNumberOrString,
    completion: nullableNumberOrString,
  }).passthrough().optional(),
  latency_last_30m: z.object({
    p50: nullableNumberOrString,
  }).passthrough().nullable().optional(),
  uptime_last_1d: nullableNumberOrString,
  status: z.number().nullable().optional(),
  quantization: z.string().nullable().optional(),
}).passthrough();

export const LiteLLMModelSchema = z.object({
  litellm_provider: z.string().nullable().optional(),
  mode: z.string().nullable().optional(),
  max_input_tokens: nullableNumberOrString,
  max_output_tokens: nullableNumberOrString,
  max_tokens: nullableNumberOrString,
  input_cost_per_token: nullableNumberOrString,
  output_cost_per_token: nullableNumberOrString,
  cache_read_input_token_cost: nullableNumberOrString,
  cache_creation_input_token_cost: nullableNumberOrString,
  supports_vision: z.boolean().nullable().optional(),
  supports_function_calling: z.boolean().nullable().optional(),
  supports_response_schema: z.boolean().nullable().optional(),
  supports_reasoning: z.boolean().nullable().optional(),
}).passthrough();

export const NormalizedPriceSchema = priceSchema;

export const NormalizedRecordSchema = z.object({
  model: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable(),
    modelType: z.enum([
      "CHAT",
      "EMBEDDING",
      "IMAGE",
      "AUDIO",
      "VIDEO",
      "MULTIMODAL",
      "RERANKER",
      "OTHER",
    ]),
    lab: z.object({
      slug: z.string().min(1),
      name: z.string().min(1),
    }).nullable(),
    contextWindow: z.number().int().positive().nullable(),
    maxOutputTokens: z.number().int().positive().nullable(),
    inputModalities: z.array(z.string()),
    outputModalities: z.array(z.string()),
    reasoning: z.boolean().nullable(),
    toolCalling: z.boolean().nullable(),
    structuredOutput: z.boolean().nullable(),
    openWeights: z.boolean().nullable(),
    releaseDate: z.date().nullable(),
    sourceUrl: z.string().url().nullable(),
  }),
  endpoints: z.array(
    z.object({
      provider: z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        kind: z.enum([
          "OFFICIAL",
          "AGGREGATOR",
          "CLOUD",
          "OTHER",
        ]),
      }),
      providerModelId: z.string().min(1),
      isDirect: z.boolean(),
      isActive: z.boolean(),
      contextWindow: z.number().int().positive().nullable(),
      maxOutputTokens: z.number().int().positive().nullable(),
      inputModalities: z.array(z.string()),
      outputModalities: z.array(z.string()),
      inputPricePer1m: priceSchema,
      outputPricePer1m: priceSchema,
      cacheReadPricePer1m: priceSchema,
      cacheWritePricePer1m: priceSchema,
      zeroDataRetention: z.boolean().nullable(),
      regions: z.array(z.string()),
      latencyMs: z.string().nullable(),
      uptimePercent: z.string().nullable(),
      source: z.enum(["OPENROUTER", "LITELLM"]),
      sourceUrl: z.string().url().nullable(),
    })
  ),
  endpointSnapshotComplete: z.boolean(),
});
