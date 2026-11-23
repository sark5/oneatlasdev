import {
  IngestionSource,
  ModelStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedRecord } from "../types";

export async function persistNormalizedRecord(
  source: IngestionSource,
  normalized: NormalizedRecord
): Promise<boolean> {
  return prisma.$transaction(
    async (tx) => {
      const { model, endpoints } = normalized;

    let canonicalModel = await tx.model.findUnique({
      where: { slug: model.slug },
      select: {
        id: true,
        labId: true,
        contextWindow: true,
      },
    });

    // LiteLLM enriches an existing canonical model.
    // It does not independently create a new model.
    if (
      source === IngestionSource.LITELLM &&
      !canonicalModel
    ) {
      return false;
    }

    if (source === IngestionSource.OPENROUTER) {
      let labId = canonicalModel?.labId ?? null;

      if (model.lab) {
        const lab = await tx.aiLab.upsert({
          where: {
            slug: model.lab.slug,
          },
          create: {
            slug: model.lab.slug,
            name: model.lab.name,
            sourceUrl: model.sourceUrl,
          },
          update: {
            name: model.lab.name,
          },
        });

        labId = lab.id;
      }

      const now = new Date();

      const createData: Prisma.ModelUncheckedCreateInput = {
        slug: model.slug,
        name: model.name,
        description: model.description,
        modelType: model.modelType,
        status: ModelStatus.ACTIVE,
        labId,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        inputModalities: model.inputModalities,
        outputModalities: model.outputModalities,
        reasoning: model.reasoning,
        toolCalling: model.toolCalling,
        structuredOutput: model.structuredOutput,
        openWeights: model.openWeights,
        releaseDate: model.releaseDate,
        sourceUrl: model.sourceUrl,
        lastSyncedAt: now,
      };

      const updateData: Prisma.ModelUncheckedUpdateInput = {
        name: model.name,
        ...(model.description !== null && {
          description: model.description,
        }),
        ...(model.lab && { labId }),
        ...(model.contextWindow !== null && {
          contextWindow: model.contextWindow,
        }),
        ...(model.maxOutputTokens !== null && {
          maxOutputTokens: model.maxOutputTokens,
        }),
        ...(model.modelType !== "OTHER" && {
          modelType: model.modelType,
        }),
        ...(model.inputModalities.length > 0 && {
          inputModalities: model.inputModalities,
        }),
        ...(model.outputModalities.length > 0 && {
          outputModalities: model.outputModalities,
        }),
        ...(model.reasoning !== null && {
          reasoning: model.reasoning,
        }),
        ...(model.toolCalling !== null && {
          toolCalling: model.toolCalling,
        }),
        ...(model.structuredOutput !== null && {
          structuredOutput: model.structuredOutput,
        }),
        ...(model.openWeights !== null && {
          openWeights: model.openWeights,
        }),
        ...(model.releaseDate !== null && {
          releaseDate: model.releaseDate,
        }),
        sourceUrl: model.sourceUrl,
        lastSyncedAt: now,
      };

      canonicalModel = await tx.model.upsert({
        where: {
          slug: model.slug,
        },
        create: createData,
        update: updateData,
        select: {
          id: true,
          labId: true,
          contextWindow: true,
        },
      });
    }

    if (!canonicalModel) {
      return false;
    }

    const observedEndpointKeys: Array<{
      providerId: string;
      providerModelId: string;
    }> = [];

    // Provider and endpoint writes are part of the
    // same model transaction.
    for (const endpoint of endpoints) {
      const provider = await tx.provider.upsert({
        where: {
          slug: endpoint.provider.slug,
        },
        create: {
          slug: endpoint.provider.slug,
          name: endpoint.provider.name,
          kind: endpoint.provider.kind,
        },
        update: {
          name: endpoint.provider.name,
          kind: endpoint.provider.kind,
        },
      });

      observedEndpointKeys.push({
        providerId: provider.id,
        providerModelId: endpoint.providerModelId,
      });

      const createEndpoint: Prisma.ModelEndpointUncheckedCreateInput = {
        modelId: canonicalModel.id,
        providerId: provider.id,
        providerModelId: endpoint.providerModelId,
        isDirect: endpoint.isDirect,
        isActive: endpoint.isActive,
        deactivatedAt: null,
        contextWindow: endpoint.contextWindow,
        maxOutputTokens: endpoint.maxOutputTokens,
        inputModalities: endpoint.inputModalities,
        outputModalities: endpoint.outputModalities,
        inputPricePer1m: endpoint.inputPricePer1m,
        outputPricePer1m: endpoint.outputPricePer1m,
        cacheReadPricePer1m: endpoint.cacheReadPricePer1m,
        cacheWritePricePer1m: endpoint.cacheWritePricePer1m,
        currency: "USD",
        zeroDataRetention: endpoint.zeroDataRetention,
        regions: endpoint.regions,
        latencyMs: endpoint.latencyMs,
        uptimePercent: endpoint.uptimePercent,
        source: endpoint.source,
        sourceUrl: endpoint.sourceUrl,
        lastVerifiedAt: new Date(),
      };

      const updateEndpoint: Prisma.ModelEndpointUncheckedUpdateInput = {
        isDirect: endpoint.isDirect,
        isActive: endpoint.isActive,
        deactivatedAt: null,
        contextWindow: endpoint.contextWindow,
        maxOutputTokens: endpoint.maxOutputTokens,
        inputModalities: endpoint.inputModalities,
        outputModalities: endpoint.outputModalities,
        inputPricePer1m: endpoint.inputPricePer1m,
        outputPricePer1m: endpoint.outputPricePer1m,
        cacheReadPricePer1m: endpoint.cacheReadPricePer1m,
        cacheWritePricePer1m: endpoint.cacheWritePricePer1m,
        currency: "USD",
        zeroDataRetention: endpoint.zeroDataRetention,
        regions: endpoint.regions,
        latencyMs: endpoint.latencyMs,
        uptimePercent: endpoint.uptimePercent,
        source: endpoint.source,
        sourceUrl: endpoint.sourceUrl,
        lastVerifiedAt: new Date(),
      };

      await tx.modelEndpoint.upsert({
        where: {
          modelId_providerId_providerModelId: {
            modelId: canonicalModel.id,
            providerId: provider.id,
            providerModelId: endpoint.providerModelId,
          },
        },
        create: createEndpoint,
        update: updateEndpoint,
      });
    }

    if (
      source === IngestionSource.OPENROUTER &&
      normalized.endpointSnapshotComplete
    ) {
      const existingEndpointFilter = {
        modelId: canonicalModel.id,
        source: IngestionSource.OPENROUTER,
        isActive: true,
      };

      if (observedEndpointKeys.length === 0) {
        // A verified empty endpoint snapshot means all
        // previously known OpenRouter endpoints disappeared.
        await tx.modelEndpoint.updateMany({
          where: existingEndpointFilter,

          data: {
            isActive: false,
            deactivatedAt: new Date(),
          },
        });
      } else {
        // Deactivate only those endpoints that are absent
        // from this verified snapshot.
        await tx.modelEndpoint.updateMany({
          where: {
            ...existingEndpointFilter,

            NOT: {
              OR: observedEndpointKeys.map((endpoint) => ({
                providerId: endpoint.providerId,
                providerModelId: endpoint.providerModelId,
              })),
            },
          },

          data: {
            isActive: false,
            deactivatedAt: new Date(),
          },
        });
      }
    }

    // Recalculate denormalized model summaries.
    const aggregate = await tx.modelEndpoint.aggregate({
      where: {
        modelId: canonicalModel.id,
        isActive: true,
      },
      _min: {
        inputPricePer1m: true,
        outputPricePer1m: true,
      },
      _max: {
        contextWindow: true,
      },
    });

    const endpointMaxContext =
      aggregate._max.contextWindow ?? null;

    const maxContextWindow = Math.max(
      endpointMaxContext ?? 0,
      canonicalModel.contextWindow ?? 0
    );

    await tx.model.update({
      where: {
        id: canonicalModel.id,
      },
      data: {
        minInputPricePer1m:
          aggregate._min.inputPricePer1m,
        minOutputPricePer1m:
          aggregate._min.outputPricePer1m,
        maxContextWindow:
          maxContextWindow > 0 ? maxContextWindow : null,
      },
    });

    return true;
  }, {
    maxWait: 15000,
    timeout: 60000,
  });
}
