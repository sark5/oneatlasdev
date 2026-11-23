/*
  Warnings:

  - You are about to drop the column `craetedAt` on the `app_settings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('CHAT', 'EMBEDDING', 'IMAGE', 'AUDIO', 'VIDEO', 'MULTIMODAL', 'RERANKER', 'OTHER');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('ACTIVE', 'PREVIEW', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('OFFICIAL', 'AGGREGATOR', 'CLOUD', 'OTHER');

-- CreateEnum
CREATE TYPE "IngestionSource" AS ENUM ('OPENROUTER', 'LITELLM', 'MANUAL');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionTrigger" AS ENUM ('MANUAL', 'CRON');

-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "craetedAt",
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "AiLab" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "country" VARCHAR(100),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "kind" "ProviderKind" NOT NULL DEFAULT 'AGGREGATOR',
    "websiteUrl" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "country" VARCHAR(100),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "modelType" "ModelType" NOT NULL DEFAULT 'CHAT',
    "status" "ModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "labId" INTEGER,
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "inputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reasoning" BOOLEAN,
    "toolCalling" BOOLEAN,
    "structuredOutput" BOOLEAN,
    "openWeights" BOOLEAN,
    "architecture" VARCHAR(160),
    "license" VARCHAR(160),
    "releaseDate" DATE,
    "deprecationDate" DATE,
    "successorModelId" TEXT,
    "minInputPricePer1m" DECIMAL(20,10),
    "minOutputPricePer1m" DECIMAL(20,10),
    "maxContextWindow" INTEGER,
    "sourceUrl" TEXT,
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelEndpoint" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerModelId" VARCHAR(255) NOT NULL,
    "isDirect" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "inputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inputPricePer1m" DECIMAL(20,10),
    "outputPricePer1m" DECIMAL(20,10),
    "cacheReadPricePer1m" DECIMAL(20,10),
    "cacheWritePricePer1m" DECIMAL(20,10),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "zeroDataRetention" BOOLEAN,
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latencyMs" DECIMAL(10,3),
    "uptimePercent" DECIMAL(5,2),
    "source" "IngestionSource" NOT NULL DEFAULT 'OPENROUTER',
    "sourceUrl" TEXT,
    "sourceUpdatedAt" TIMESTAMPTZ(3),
    "lastVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ModelEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(120) NOT NULL,
    "metricName" VARCHAR(120) NOT NULL,
    "scaleLabel" VARCHAR(120),
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkScore" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "score" DECIMAL(20,8) NOT NULL,
    "sampleSize" INTEGER,
    "sourceName" VARCHAR(160) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "methodology" TEXT,
    "evaluatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "source" "IngestionSource" NOT NULL,
    "status" "IngestionStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" "IngestionTrigger" NOT NULL DEFAULT 'MANUAL',
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsRejected" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "errorSummary" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawModelSnapshot" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "source" "IngestionSource" NOT NULL,
    "externalId" VARCHAR(255),
    "contentHash" CHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawModelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarantinedRecord" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "source" "IngestionSource" NOT NULL,
    "externalId" VARCHAR(255),
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "validationErrors" JSONB,
    "rejectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarantinedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiLab_slug_key" ON "AiLab"("slug");

-- CreateIndex
CREATE INDEX "AiLab_name_idx" ON "AiLab"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "Provider_name_idx" ON "Provider"("name");

-- CreateIndex
CREATE INDEX "Provider_kind_idx" ON "Provider"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Model_slug_key" ON "Model"("slug");

-- CreateIndex
CREATE INDEX "Model_labId_idx" ON "Model"("labId");

-- CreateIndex
CREATE INDEX "Model_modelType_idx" ON "Model"("modelType");

-- CreateIndex
CREATE INDEX "Model_status_idx" ON "Model"("status");

-- CreateIndex
CREATE INDEX "Model_minInputPricePer1m_id_idx" ON "Model"("minInputPricePer1m", "id");

-- CreateIndex
CREATE INDEX "Model_minOutputPricePer1m_id_idx" ON "Model"("minOutputPricePer1m", "id");

-- CreateIndex
CREATE INDEX "Model_maxContextWindow_id_idx" ON "Model"("maxContextWindow" DESC, "id");

-- CreateIndex
CREATE INDEX "Model_releaseDate_id_idx" ON "Model"("releaseDate" DESC, "id");

-- CreateIndex
CREATE INDEX "Model_inputModalities_idx" ON "Model" USING GIN ("inputModalities");

-- CreateIndex
CREATE INDEX "Model_outputModalities_idx" ON "Model" USING GIN ("outputModalities");

-- CreateIndex
CREATE INDEX "ModelEndpoint_modelId_isActive_idx" ON "ModelEndpoint"("modelId", "isActive");

-- CreateIndex
CREATE INDEX "ModelEndpoint_providerId_isActive_idx" ON "ModelEndpoint"("providerId", "isActive");

-- CreateIndex
CREATE INDEX "ModelEndpoint_inputPricePer1m_id_idx" ON "ModelEndpoint"("inputPricePer1m", "id");

-- CreateIndex
CREATE INDEX "ModelEndpoint_outputPricePer1m_id_idx" ON "ModelEndpoint"("outputPricePer1m", "id");

-- CreateIndex
CREATE INDEX "ModelEndpoint_regions_idx" ON "ModelEndpoint" USING GIN ("regions");

-- CreateIndex
CREATE INDEX "ModelEndpoint_zeroDataRetention_idx" ON "ModelEndpoint"("zeroDataRetention");

-- CreateIndex
CREATE UNIQUE INDEX "ModelEndpoint_modelId_providerId_providerModelId_key" ON "ModelEndpoint"("modelId", "providerId", "providerModelId");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_slug_key" ON "Benchmark"("slug");

-- CreateIndex
CREATE INDEX "Benchmark_category_idx" ON "Benchmark"("category");

-- CreateIndex
CREATE INDEX "BenchmarkScore_benchmarkId_evaluatedAt_idx" ON "BenchmarkScore"("benchmarkId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "BenchmarkScore_modelId_benchmarkId_idx" ON "BenchmarkScore"("modelId", "benchmarkId");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkScore_modelId_benchmarkId_sourceUrl_evaluatedAt_key" ON "BenchmarkScore"("modelId", "benchmarkId", "sourceUrl", "evaluatedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_source_startedAt_idx" ON "IngestionRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "RawModelSnapshot_source_externalId_fetchedAt_idx" ON "RawModelSnapshot"("source", "externalId", "fetchedAt");

-- CreateIndex
CREATE INDEX "RawModelSnapshot_contentHash_idx" ON "RawModelSnapshot"("contentHash");

-- CreateIndex
CREATE INDEX "RawModelSnapshot_ingestionRunId_idx" ON "RawModelSnapshot"("ingestionRunId");

-- CreateIndex
CREATE INDEX "QuarantinedRecord_ingestionRunId_idx" ON "QuarantinedRecord"("ingestionRunId");

-- CreateIndex
CREATE INDEX "QuarantinedRecord_source_externalId_idx" ON "QuarantinedRecord"("source", "externalId");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_labId_fkey" FOREIGN KEY ("labId") REFERENCES "AiLab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_successorModelId_fkey" FOREIGN KEY ("successorModelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelEndpoint" ADD CONSTRAINT "ModelEndpoint_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelEndpoint" ADD CONSTRAINT "ModelEndpoint_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkScore" ADD CONSTRAINT "BenchmarkScore_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkScore" ADD CONSTRAINT "BenchmarkScore_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawModelSnapshot" ADD CONSTRAINT "RawModelSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarantinedRecord" ADD CONSTRAINT "QuarantinedRecord_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===============================================
-- ONEATLAS PHASE 1 - CUSTOM POSTGRESQL RULES
-- ===============================================

-- -----------------------------------------------
-- MODEL CONSTRAINTS
-- -----------------------------------------------

ALTER TABLE "Model"
ADD CONSTRAINT "Model_contextWindow_positive"
CHECK ("contextWindow" IS NULL OR "contextWindow" > 0);

ALTER TABLE "Model"
ADD CONSTRAINT "Model_maxOutputTokens_positive"
CHECK ("maxOutputTokens" IS NULL OR "maxOutputTokens" > 0);

ALTER TABLE "Model"
ADD CONSTRAINT "Model_maxContextWindow_positive"
CHECK ("maxContextWindow" IS NULL OR "maxContextWindow" > 0);

ALTER TABLE "Model"
ADD CONSTRAINT "Model_minInputPrice_nonnegative"
CHECK ("minInputPricePer1m" IS NULL OR "minInputPricePer1m" >= 0);

ALTER TABLE "Model"
ADD CONSTRAINT "Model_minOutputPrice_nonnegative"
CHECK ("minOutputPricePer1m" IS NULL OR "minOutputPricePer1m" >= 0);

ALTER TABLE "Model"
ADD CONSTRAINT "Model_successor_not_self"
CHECK ("successorModelId" IS NULL OR "successorModelId" <> "id");

-- -----------------------------------------------
-- MODEL ENDPOINT CONSTRAINTS
-- -----------------------------------------------

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_contextWindow_positive"
CHECK ("contextWindow" IS NULL OR "contextWindow" > 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_maxOutputTokens_positive"
CHECK ("maxOutputTokens" IS NULL OR "maxOutputTokens" > 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_inputPrice_nonnegative"
CHECK ("inputPricePer1m" IS NULL OR "inputPricePer1m" >= 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_outputPrice_nonnegative"
CHECK ("outputPricePer1m" IS NULL OR "outputPricePer1m" >= 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_cacheReadPrice_nonnegative"
CHECK ("cacheReadPricePer1m" IS NULL OR "cacheReadPricePer1m" >= 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_cacheWritePrice_nonnegative"
CHECK ("cacheWritePricePer1m" IS NULL OR "cacheWritePricePer1m" >= 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_latency_nonnegative"
CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0);

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "--dpoint_uptime_range"
CHECK ("uptimePercent" IS NULL OR ("uptimePercent" >= 0 AND "uptimePercent" <= 100));

ALTER TABLE "ModelEndpoint"
ADD CONSTRAINT "Endpoint_currency_length"
CHECK (length("currency") = 3);

-- -----------------------------------------------
-- BENCHMARK CONSTRAINTS
-- -----------------------------------------------

ALTER TABLE "BenchmarkScore"
ADD CONSTRAINT "BenchmarkScore_sampleSize_positive"
CHECK ("sampleSize" IS NULL OR "sampleSize" > 0);

-- -----------------------------------------------
-- INGESTION COUNTERS
-- -----------------------------------------------

ALTER TABLE "IngestionRun"
ADD CONSTRAINT "IngestionRun_recordsRead_nonnegative"
CHECK ("recordsRead" >= 0);

ALTER TABLE "IngestionRun"
ADD CONSTRAINT "IngestionRun_recordsWritten_nonnegative"
CHECK ("recordsWritten" >= 0);

ALTER TABLE "IngestionRun"
ADD CONSTRAINT "IngestionRun_recordsSkipped_nonnegative"
CHECK ("recordsSkipped" >= 0);

ALTER TABLE "IngestionRun"
ADD CONSTRAINT "IngestionRun_recordsRejected_nonnegative"
CHECK ("recordsRejected" >= 0);

-- -----------------------------------------------
-- QUARANTINE VALIDATION
-- -----------------------------------------------

ALTER TABLE "QuarantinedRecord"
ADD CONSTRAINT "QuarantinedRecord_reason_not_empty"
CHECK (length(trim("reason")) > 0);

-- ===============================================
-- POSTGRESQL SEARCH EXTENSION
-- ===============================================

CREATE EXTENSION IF  NOT EXISTS pg_trgm;

-- -----------------------------------------------
-- FUZZY MODEL NAME SEARCH
-- -----------------------------------------------

CREATE INDEX "Model_name_trgm_idx"
ON "Model"
USING GIN ("name" gin_trgm_ops);

-- -----------------------------------------------
-- FULL TEXT MODEL SEARCH
-- -----------------------------------------------

CREATE INDEX "Model_search_fts_idx"
ON "Model"
USING GIN (
  to_tsvector(
    'simple',
    coalesce("name", '') || ' ' ||
    coalesce("slug", '') || ' ' ||
    coalesce("description", '')
  )
);