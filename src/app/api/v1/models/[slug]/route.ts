import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/server/api/errors";
import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

function getBlendedPrice(
  input: { toString(): string } | null,
  output: { toString(): string } | null
): string | null {
  if (!input || !output) {
    return null;
  }
  return new Decimal(input.toString())
    .plus(new Decimal(output.toString()))
    .toFixed(10);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const model = await prisma.model.findUnique({
      where: { slug },

      include: {
        lab: true,

        successorModel: {
          select: { slug: true, name: true },
        },

        endpoints: {
          where: { isActive: true },
          include: { provider: true },
        },

        benchmarkScores: {
          include: { benchmark: true },
          orderBy: { evaluatedAt: "desc" },
        },
      },
    });

    if (!model) {
      throw notFound("Model");
    }

    const endpoints = [...model.endpoints].sort((a, b) => {
      const aKnown =
        a.inputPricePer1m !== null &&
        a.outputPricePer1m !== null;
      const bKnown =
        b.inputPricePer1m !== null &&
        b.outputPricePer1m !== null;

      if (!aKnown && bKnown) return 1;
      if (aKnown && !bKnown) return -1;
      if (!aKnown && !bKnown) return 0;

      const aPrice =
        a.inputPricePer1m!.plus(a.outputPricePer1m!);
      const bPrice =
        b.inputPricePer1m!.plus(b.outputPricePer1m!);

      return aPrice.comparedTo(bPrice);
    });

    const response = {
      id: model.id,
      slug: model.slug,
      name: model.name,
      description: model.description,
      modelType: model.modelType,
      status: model.status,

      lab: model.lab
        ? {
            slug: model.lab.slug,
            name: model.lab.name,
            websiteUrl: model.lab.websiteUrl,
          }
        : null,

      specifications: {
        contextWindow: model.contextWindow,
        maxContextWindow: model.maxContextWindow,
        maxOutputTokens: model.maxOutputTokens,
        inputModalities: model.inputModalities,
        outputModalities: model.outputModalities,
        reasoning: model.reasoning,
        toolCalling: model.toolCalling,
        structuredOutput: model.structuredOutput,
        openWeights: model.openWeights,
      },

      pricingSummary: {
        minInputPricePer1m:
          model.minInputPricePer1m?.toString() ?? null,
        minOutputPricePer1m:
          model.minOutputPricePer1m?.toString() ?? null,
        currency: "USD",
        unit: "per million tokens",
      },

      endpoints: endpoints.map((endpoint) => ({
        id: endpoint.id,
        provider: {
          slug: endpoint.provider.slug,
          name: endpoint.provider.name,
          kind: endpoint.provider.kind,
        },
        providerModelId: endpoint.providerModelId,
        isDirect: endpoint.isDirect,
        contextWindow: endpoint.contextWindow,
        maxOutputTokens: endpoint.maxOutputTokens,
        inputPricePer1m:
          endpoint.inputPricePer1m?.toString() ?? null,
        outputPricePer1m:
          endpoint.outputPricePer1m?.toString() ?? null,
        cacheReadPricePer1m:
          endpoint.cacheReadPricePer1m?.toString() ?? null,
        cacheWritePricePer1m:
          endpoint.cacheWritePricePer1m?.toString() ?? null,
        blendedPricePer1m: getBlendedPrice(
          endpoint.inputPricePer1m,
          endpoint.outputPricePer1m
        ),
        currency: endpoint.currency,
        zeroDataRetention: endpoint.zeroDataRetention,
        regions: endpoint.regions,
        latencyMs: endpoint.latencyMs?.toString() ?? null,
        uptimePercent:
          endpoint.uptimePercent?.toString() ?? null,
        source: endpoint.source,
        sourceUrl: endpoint.sourceUrl,
        lastVerifiedAt: endpoint.lastVerifiedAt,
      })),

      benchmarks: model.benchmarkScores.map((score) => ({
        benchmark: {
          slug: score.benchmark.slug,
          name: score.benchmark.name,
          category: score.benchmark.category,
          metricName: score.benchmark.metricName,
          higherIsBetter: score.benchmark.higherIsBetter,
        },
        score: score.score.toString(),
        sampleSize: score.sampleSize,
        sourceName: score.sourceName,
        sourceUrl: score.sourceUrl,
        evaluatedAt: score.evaluatedAt,
      })),

      lifecycle: {
        releaseDate: model.releaseDate,
        deprecationDate: model.deprecationDate,
        successorModel: model.successorModel,
      },

      provenance: {
        sourceUrl: model.sourceUrl,
        lastSyncedAt: model.lastSyncedAt,
      },

      updatedAt: model.updatedAt,
    };

    return successResponse(response, {
      headers: {
        "Cache-Control":
          "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
