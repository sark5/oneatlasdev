import Decimal from "decimal.js";

import {
  ModelStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import {
  badRequest,
  notFound,
} from "../errors";

export interface RankingQuery {
  metric: "inputPrice" | "outputPrice" | "context" | "benchmark";
  benchmark?: string;
  order?: "asc" | "desc";
  limit: number;
}

export async function getRankings(
  query: RankingQuery
) {
  if (query.metric === "benchmark") {
    if (!query.benchmark) {
      throw badRequest("Benchmark slug is required.");
    }

    const benchmark = await prisma.benchmark.findUnique({
      where: {
        slug: query.benchmark,
      },
    });

    if (!benchmark) {
      throw notFound("Benchmark");
    }

    const order =
      query.order ??
      (benchmark.higherIsBetter ? "desc" : "asc");

    // Retrieve the latest score per canonical model.
    const rawScores = await prisma.benchmarkScore.findMany({
      where: {
        benchmarkId: benchmark.id,

        model: {
          status: {
            notIn: [
              ModelStatus.DEPRECATED,
              ModelStatus.RETIRED,
            ],
          },
        },
      },

      orderBy: [
        { evaluatedAt: "desc" },
        { id: "asc" },
      ],

      include: {
        model: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    const latestByModel = new Map<string, typeof rawScores[number]>();

    for (const score of rawScores) {
      if (!latestByModel.has(score.modelId)) {
        latestByModel.set(score.modelId, score);
      }
    }

    const latestScores = [...latestByModel.values()];

    latestScores.sort((a, b) => {
      const difference = new Decimal(a.score.toString())
        .comparedTo(new Decimal(b.score.toString()));

      return order === "asc"
        ? difference
        : -difference;
    });

    const data = latestScores
      .slice(0, query.limit)
      .map((score, index) => ({
        rank: index + 1,

        model: score.model,

        score: score.score.toString(),

        metric: benchmark.metricName,
        category: benchmark.category,

        evaluatedAt: score.evaluatedAt,

        sourceName: score.sourceName,
        sourceUrl: score.sourceUrl,
      }));

    return {
      metric: "benchmark",

      ranking: benchmark.name,

      direction: order,

      unit: benchmark.scaleLabel,

      data,
    };
  }

  const order =
    query.order ??
    (query.metric === "context" ? "desc" : "asc");

  const where = {
    status: {
      notIn: [
        ModelStatus.DEPRECATED,
        ModelStatus.RETIRED,
      ],
    },

    ...(query.metric === "inputPrice" && {
      minInputPricePer1m: { not: null },
    }),

    ...(query.metric === "outputPrice" && {
      minOutputPricePer1m: { not: null },
    }),

    ...(query.metric === "context" && {
      maxContextWindow: { not: null },
    }),
  };

  const orderBy =
    query.metric === "context"
      ? [
          { maxContextWindow: { sort: order as "asc" | "desc", nulls: "last" as const } },
          { id: "asc" as const },
        ]
      : query.metric === "inputPrice"
        ? [
            { minInputPricePer1m: { sort: order, nulls: "last" as const } },
            { id: "asc" as const },
          ]
        : [
            { minOutputPricePer1m: { sort: order, nulls: "last" as const } },
            { id: "asc" as const },
          ];

  const models = await prisma.model.findMany({
    where,
    orderBy,
    take: query.limit,

    select: {
      id: true,
      slug: true,
      name: true,
      modelType: true,

      maxContextWindow: true,

      minInputPricePer1m: true,
      minOutputPricePer1m: true,

      lab: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  const data = models.map((model, index) => ({
    rank: index + 1,

    model: {
      slug: model.slug,
      name: model.name,
      type: model.modelType,
      lab: model.lab,
    },

    value:
      query.metric === "context"
        ? model.maxContextWindow
        : query.metric === "inputPrice"
          ? model.minInputPricePer1m?.toString() ?? null
          : model.minOutputPricePer1m?.toString() ?? null,
  }));

  return {
    metric: query.metric,
    direction: order,

    unit:
      query.metric === "context"
        ? "tokens"
        : "USD per million tokens",

    data,
  };
}
