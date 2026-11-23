import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "../errors";

function measured<T>(value: T | null) {
  return {
    value,
    status: value === null ? "unmeasured" : "measured",
  };
}

export async function compareModels(slugs: string[]) {
  if (slugs.length < 2 || slugs.length > 4) {
    throw badRequest("Choose between two and four models.");
  }

  const uniqueSlugs = [...new Set(slugs)];

  if (uniqueSlugs.length !== slugs.length) {
    throw badRequest("Duplicate model slugs are not allowed.");
  }

  const models = await prisma.model.findMany({
    where: {
      slug: { in: uniqueSlugs },
    },

    include: {
      lab: {
        select: { slug: true, name: true },
      },

      endpoints: {
        where: { isActive: true },
        include: {
          provider: {
            select: { slug: true, name: true },
          },
        },
      },

      benchmarkScores: {
        include: { benchmark: true },
      },
    },
  });

  const modelMap = new Map(
    models.map((model) => [model.slug, model])
  );

  const missingSlugs = uniqueSlugs.filter(
    (slug) => !modelMap.has(slug)
  );

  if (missingSlugs.length > 0) {
    throw notFound(`Models: ${missingSlugs.join(", ")}`);
  }

  return slugs.map((slug) => {
    const model = modelMap.get(slug)!;

    const sortedEndpoints = [...model.endpoints].sort(
      (a, b) => {
        if (
          a.inputPricePer1m === null ||
          a.outputPricePer1m === null
        ) {
          return b.inputPricePer1m !== null &&
            b.outputPricePer1m !== null
            ? 1
            : 0;
        }

        if (
          b.inputPricePer1m === null ||
          b.outputPricePer1m === null
        ) {
          return -1;
        }

        const priceA = a.inputPricePer1m.plus(
          a.outputPricePer1m
        );
        const priceB = b.inputPricePer1m.plus(
          b.outputPricePer1m
        );

        return priceA.comparedTo(priceB);
      }
    );

    const cheapest = sortedEndpoints.find(
      (endpoint) =>
        endpoint.inputPricePer1m !== null &&
        endpoint.outputPricePer1m !== null
    );

    return {
      slug: model.slug,
      name: model.name,
      lab: model.lab,
      modelType: model.modelType,

      specifications: {
        contextWindow: measured(model.maxContextWindow),
        maxOutputTokens: measured(model.maxOutputTokens),
        inputModalities: model.inputModalities,
        outputModalities: model.outputModalities,
      },

      capabilities: {
        reasoning: measured(model.reasoning),
        toolCalling: measured(model.toolCalling),
        structuredOutput: measured(model.structuredOutput),
        openWeights: measured(model.openWeights),
      },

      pricing: {
        inputPer1m: measured(
          model.minInputPricePer1m?.toString() ?? null
        ),
        outputPer1m: measured(
          model.minOutputPricePer1m?.toString() ?? null
        ),
        currency: "USD",
      },

      cheapestEndpoint: cheapest
        ? {
            provider: cheapest.provider.name,
            inputPricePer1m:
              cheapest.inputPricePer1m!.toString(),
            outputPricePer1m:
              cheapest.outputPricePer1m!.toString(),
            equalVolumeBlendedPricePer1m:
              cheapest.inputPricePer1m!
                .plus(cheapest.outputPricePer1m!)
                .toString(),
          }
        : null,

      benchmarks: model.benchmarkScores.map((score) => ({
        name: score.benchmark.name,
        category: score.benchmark.category,
        metricName: score.benchmark.metricName,
        score: score.score.toString(),
        sourceName: score.sourceName,
        sourceUrl: score.sourceUrl,
        evaluatedAt: score.evaluatedAt,
      })),
    };
  });
}
