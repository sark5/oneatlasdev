import {
  IngestionSource,
  ModelType,
  ProviderKind,
} from "@/generated/prisma/client";
import type {
  NormalizedRecord,
  NormalizedEndpoint,
} from "../types";
import {
  LiteLLMModelSchema,
  OpenRouterModelSchema,
  OpenRouterEndpointSchema,
  NormalizedRecordSchema,
} from "../schemas/ingestion.schema";
import {
  perTokenToPerMillion,
  secondsToMilliseconds,
} from "../utils/decimal";
import {
  canonicalModelSlug,
  slugify,
} from "../utils/slug";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models/";
const LITELLM_SOURCE_URL =
  "https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json";

const LAB_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "meta-llama": "Meta",
  mistralai: "Mistral AI",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  "x-ai": "xAI",
  cohere: "Cohere",
  microsoft: "Microsoft",
  amazon: "Amazon",
};

function positiveInteger(
  value: unknown
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return null;
  }
  return number;
}

function toNumberOrNull(
  value: unknown
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDateOrNull(
  timestamp: number | null | undefined
): Date | null {
  if (!timestamp || timestamp <= 0) {
    return null;
  }
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayLabName(
  slug: string
): string {
  return (
    LAB_NAMES[slug] ??
    slug
      .split("-")
      .map((part) => (
        part.charAt(0).toUpperCase() + part.slice(1)
      ))
      .join(" ")
  );
}

function extractLab(id: string) {
  const namespace = id.split("/")[0];
  if (!namespace || !slugify(namespace)) {
    return null;
  }
  const slug = slugify(namespace);
  return {
    slug,
    name: displayLabName(slug),
  };
}

function detectModelType(
  modelId: string,
  input: string[],
  output: string[]
): ModelType {
  const id = modelId.toLowerCase();
  const modalities = [...input, ...output];

  if (
    id.includes("embed") ||
    id.includes("embedding")
  ) {
    return ModelType.EMBEDDING;
  }

  if (modalities.includes("video")) {
    return ModelType.VIDEO;
  }

  if (
    modalities.includes("audio") &&
    !modalities.includes("image")
  ) {
    return ModelType.AUDIO;
  }

  if (
    output.includes("image") &&
    !input.includes("image")
  ) {
    return ModelType.IMAGE;
  }

  if (
    modalities.includes("image") ||
    modalities.includes("audio")
  ) {
    return ModelType.MULTIMODAL;
  }

  return ModelType.CHAT;
}

function normalizeEndpointPricing(
  input: unknown,
  output: unknown
) {
  return {
    inputPricePer1m: perTokenToPerMillion(input),
    outputPricePer1m: perTokenToPerMillion(output),
  };
}

function normalizeOpenRouterEndpoint(
  raw: unknown,
  model: {
    id: string;
    inputModalities: string[];
    outputModalities: string[];
  },
  sourceUrl: string
): NormalizedEndpoint | null {
  const parsed = OpenRouterEndpointSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  const endpoint = parsed.data;
  const providerName = endpoint.provider_name;
  const providerSlug = slugify(
    endpoint.tag || providerName
  );
  const pricing = normalizeEndpointPricing(
    endpoint.pricing?.prompt,
    endpoint.pricing?.completion
  );
  const p50 = endpoint.latency_last_30m?.p50;
  const latencyMs = secondsToMilliseconds(p50);
  const uptime = toNumberOrNull(
    endpoint.uptime_last_1d
  );
  const providerModelId = [
    model.id,
    providerSlug,
    endpoint.quantization ?? "unknown",
  ].join(":");

  return {
    provider: {
      slug: providerSlug,
      name: providerName,
      kind: ProviderKind.OTHER,
    },
    providerModelId,
    isDirect: false,
    isActive:
      endpoint.status === null ||
      endpoint.status === undefined ||
      endpoint.status === 0,
    contextWindow: endpoint.context_length ?? null,
    maxOutputTokens:
      endpoint.max_completion_tokens ?? null,
    inputModalities: model.inputModalities,
    outputModalities: model.outputModalities,
    ...pricing,
    cacheReadPricePer1m: null,
    cacheWritePricePer1m: null,
    zeroDataRetention: null,
    regions: [],
    latencyMs,
    uptimePercent:
      uptime !== null && uptime >= 0 && uptime <= 100
        ? String(uptime)
        : null,
    source: IngestionSource.OPENROUTER,
    sourceUrl,
  };
}

export function normalizeOpenRouterRecord(
  payload: unknown
): NormalizedRecord {
  const container = payload as {
    model?: unknown;
    endpointResponse?: unknown;
    endpointUrl?: string;
    endpointFetchFailed?: boolean;
  };

  const rawModel = OpenRouterModelSchema.parse(
    container.model
  );

  const id = rawModel.id;
  const inputModalities =
    rawModel.architecture?.input_modalities ?? [];
  const outputModalities =
    rawModel.architecture?.output_modalities ?? [];
  const parameters = rawModel.supported_parameters ?? [];

  const modelSlug = canonicalModelSlug(
    rawModel.canonical_slug ?? id
  );

  const modelEndpointUrl =
    container.endpointUrl ??
    `${OPENROUTER_MODELS_URL}${id}/endpoints`;

  const endpointFetchFailed =
    container.endpointFetchFailed === true;

  const endpointData = (
    container.endpointResponse as {
      data?: {
        endpoints?: unknown[];
      };
    } | null
  )?.data?.endpoints;

  const endpointSnapshotComplete =
    !endpointFetchFailed &&
    Array.isArray(endpointData);

  const endpoints: NormalizedEndpoint[] = [];

  if (Array.isArray(endpointData)) {
    for (const rawEndpoint of endpointData) {
      const normalized = normalizeOpenRouterEndpoint(
        rawEndpoint,
        {
          id,
          inputModalities,
          outputModalities,
        },
        modelEndpointUrl
      );

      if (normalized) {
        endpoints.push(normalized);
      }
    }
  }

  const result = {
    model: {
      slug: modelSlug,
      name: rawModel.name,
      description: rawModel.description ?? null,
      modelType: detectModelType(
        id,
        inputModalities,
        outputModalities
      ),
      lab: extractLab(id),
      contextWindow: rawModel.context_length ?? null,
      maxOutputTokens:
        rawModel.top_provider?.max_completion_tokens ??
        null,
      inputModalities,
      outputModalities,
      reasoning:
        parameters.includes("reasoning") ||
        parameters.includes("include_reasoning")
          ? true
          : null,
      toolCalling:
        parameters.includes("tools") ||
        parameters.includes("tool_choice")
          ? true
          : null,
      structuredOutput: parameters.includes("response_format")
        ? true
        : null,
      openWeights: null,
      releaseDate: toDateOrNull(rawModel.created),
      sourceUrl: `https://openrouter.ai/${id}`,
    },
    endpoints,
    endpointSnapshotComplete,
  };

  return NormalizedRecordSchema.parse(result) as NormalizedRecord;
}

export function normalizeLiteLLMRecord(
  externalId: string,
  payload: unknown
): NormalizedRecord {
  const container = payload as {
    details?: unknown;
  };

  const row = LiteLLMModelSchema.parse(
    container.details
  );

  const providerName =
    row.litellm_provider ?? externalId.split("/")[0];

  if (!providerName) {
    throw new Error("LiteLLM provider is missing");
  }

  const providerSlug = slugify(providerName);

  if (!providerSlug) {
    throw new Error(
      "Invalid LiteLLM provider identifier"
    );
  }

  const modelSlug = canonicalModelSlug(externalId);
  const modelName = externalId.split("/").at(-1) ?? externalId;
  const mode = row.mode?.toLowerCase();

  let modelType: ModelType;

  switch (mode) {
    case "embedding":
      modelType = ModelType.EMBEDDING;
      break;
    case "image_generation":
      modelType = ModelType.IMAGE;
      break;
    case "audio_transcription":
    case "audio_speech":
      modelType = ModelType.AUDIO;
      break;
    case "chat":
    case "completion":
    case "responses":
      modelType = ModelType.CHAT;
      break;
    default:
      modelType = ModelType.OTHER;
  }

  const endpointPricing = normalizeEndpointPricing(
    row.input_cost_per_token,
    row.output_cost_per_token
  );

  const result = {
    model: {
      slug: modelSlug,
      name: modelName,
      description: null,
      modelType,
      // LiteLLM's provider field is not sufficient
      // to infer the original model research lab.
      lab: null,
      contextWindow: positiveInteger(
        row.max_input_tokens
      ),
      // Avoid treating the legacy max_tokens field
      // as a confirmed output-token limit.
      maxOutputTokens: positiveInteger(
        row.max_output_tokens
      ),
      inputModalities: row.supports_vision
        ? ["text", "image"]
        : ["text"],
      outputModalities: ["text"],
      reasoning: row.supports_reasoning ?? null,
      toolCalling: row.supports_function_calling ?? null,
      structuredOutput: row.supports_response_schema ?? null,
      openWeights: null,
      releaseDate: null,
      sourceUrl: LITELLM_SOURCE_URL,
    },
    endpoints: [
      {
        provider: {
          slug: providerSlug,
          name: providerName,
          kind: ProviderKind.OTHER,
        },
        providerModelId: externalId,
        isDirect: false,
        isActive: true,
        contextWindow: positiveInteger(
          row.max_input_tokens
        ),
        maxOutputTokens: positiveInteger(
          row.max_output_tokens
        ),
        inputModalities: row.supports_vision
          ? ["text", "image"]
          : ["text"],
        outputModalities: ["text"],
        ...endpointPricing,
        cacheReadPricePer1m: perTokenToPerMillion(
          row.cache_read_input_token_cost
        ),
        cacheWritePricePer1m: perTokenToPerMillion(
          row.cache_creation_input_token_cost
        ),
        zeroDataRetention: null,
        regions: [],
        latencyMs: null,
        uptimePercent: null,
        source: IngestionSource.LITELLM,
        sourceUrl: LITELLM_SOURCE_URL,
      },
    ],
    endpointSnapshotComplete: false,
  };

  return NormalizedRecordSchema.parse(result) as NormalizedRecord;
}
