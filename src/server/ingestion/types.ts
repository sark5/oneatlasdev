import type {
  IngestionSource,
  ModelType,
  ProviderKind,
} from "@/generated/prisma/client";

export interface SourceRecord {
  externalId: string;
  payload: unknown;
}

export interface AdapterBatch {
  totalSourceRecords: number;
  preSkipped: number;
  records: SourceRecord[];
}

export interface NormalizedProvider {
  slug: string;
  name: string;
  kind: ProviderKind;
}

export interface NormalizedModel {
  slug: string;
  name: string;
  description: string | null;
  modelType: ModelType;
  lab: {
    slug: string;
    name: string;
  } | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  reasoning: boolean | null;
  toolCalling: boolean | null;
  structuredOutput: boolean | null;
  openWeights: boolean | null;
  releaseDate: Date | null;
  sourceUrl: string | null;
}

export interface NormalizedEndpoint {
  provider: NormalizedProvider;
  providerModelId: string;
  isDirect: boolean;
  isActive: boolean;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  inputPricePer1m: string | null;
  outputPricePer1m: string | null;
  cacheReadPricePer1m: string | null;
  cacheWritePricePer1m: string | null;
  zeroDataRetention: boolean | null;
  regions: string[];
  latencyMs: string | null;
  uptimePercent: string | null;
  source: IngestionSource;
  sourceUrl: string | null;
}

export interface NormalizedRecord {
  model: NormalizedModel;
  endpoints: NormalizedEndpoint[];

  // True only when OpenRouter returned a valid
  // complete endpoint list for this model.
  endpointSnapshotComplete: boolean;
}

export interface IngestionSummary {
  runId: string;
  source: IngestionSource;
  recordsRead: number;
  recordsWritten: number;
  recordsSkipped: number;
  recordsRejected: number;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
}
