-- AlterTable
ALTER TABLE "ModelEndpoint" ADD COLUMN "deactivatedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "IngestionLease" (
    "source" "IngestionSource" NOT NULL,
    "ownerRunId" VARCHAR(191) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IngestionLease_pkey" PRIMARY KEY ("source")
);

-- CreateIndex
CREATE INDEX "IngestionLease_expiresAt_idx" ON "IngestionLease"("expiresAt");

-- CreateIndex
CREATE INDEX "IngestionRun_source_status_finishedAt_idx" ON "IngestionRun"("source", "status", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawModelSnapshot_ingestionRunId_source_externalId_contentHa_key" ON "RawModelSnapshot"("ingestionRunId", "source", "externalId", "contentHash");
