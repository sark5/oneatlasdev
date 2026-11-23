import { Prisma, ModelStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ModelQuery } from "../query.schema";

const sortOrders: Record<
  ModelQuery["sort"],
  (
    direction: "asc" | "desc"
  ) => Prisma.ModelOrderByWithRelationInput[]
> = {
  name: (direction) => [{ name: direction }, { id: "asc" }],

  inputPrice: (direction) => [
    {
      minInputPricePer1m: {
        sort: direction,
        nulls: "last",
      },
    },
    { id: "asc" },
  ],

  outputPrice: (direction) => [
    {
      minOutputPricePer1m: {
        sort: direction,
        nulls: "last",
      },
    },
    { id: "asc" },
  ],

  context: (direction) => [
    {
      maxContextWindow: {
        sort: direction,
        nulls: "last",
      },
    },
    { id: "asc" },
  ],

  releaseDate: (direction) => [
    {
      releaseDate: {
        sort: direction,
        nulls: "last",
      },
    },
    { id: "asc" },
  ],
};

export async function getModels(filters: ModelQuery) {
  const conditions: Prisma.ModelWhereInput[] = [];

  // 1. Hide deprecated and retired models by default.
  if (filters.hideDeprecated) {
    conditions.push({
      status: {
        notIn: [ModelStatus.DEPRECATED, ModelStatus.RETIRED],
      },
    });
  }

  // 2. Search by name, slug or description.
  if (filters.q) {
    conditions.push({
      OR: [
        {
          name: {
            contains: filters.q,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: filters.q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.q,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  // 3. AI lab filter.
  if (filters.lab) {
    conditions.push({
      lab: {
        is: {
          slug: filters.lab,
        },
      },
    });
  }

  // 4. Model type.
  if (filters.type) {
    conditions.push({ modelType: filters.type });
  }

  // 5. Capabilities.
  if (filters.reasoning !== undefined) {
    conditions.push({ reasoning: filters.reasoning });
  }

  if (filters.toolCalling !== undefined) {
    conditions.push({ toolCalling: filters.toolCalling });
  }

  if (filters.structuredOutput !== undefined) {
    conditions.push({
      structuredOutput: filters.structuredOutput,
    });
  }

  if (filters.openWeights !== undefined) {
    conditions.push({ openWeights: filters.openWeights });
  }

  // 6. Minimum context window.
  if (filters.minContext !== undefined) {
    conditions.push({
      maxContextWindow: { gte: filters.minContext },
    });
  }

  // 7. Provider, ZDR and region filters.
  const endpointFilter: Prisma.ModelEndpointWhereInput = {
    isActive: true,
  };

  let hasEndpointFilter = false;

  if (filters.provider) {
    endpointFilter.provider = {
      is: { slug: filters.provider },
    };
    hasEndpointFilter = true;
  }

  if (filters.zdr !== undefined) {
    endpointFilter.zeroDataRetention = filters.zdr;
    hasEndpointFilter = true;
  }

  if (filters.region) {
    endpointFilter.regions = { has: filters.region };
    hasEndpointFilter = true;
  }

  if (filters.maxInputPrice !== undefined) {
    const maximumPrice = new Prisma.Decimal(
      filters.maxInputPrice
    );

    if (hasEndpointFilter) {
      endpointFilter.inputPricePer1m = {
        lte: maximumPrice,
      };
    } else {
      conditions.push({
        minInputPricePer1m: {
          lte: maximumPrice,
        },
      });
    }

    hasEndpointFilter = true;
  }

  if (hasEndpointFilter) {
    conditions.push({
      endpoints: { some: endpointFilter },
    });
  }

  // 9. Modality filter.
  for (const modality of filters.modalities) {
    conditions.push({
      OR: [
        { inputModalities: { has: modality } },
        { outputModalities: { has: modality } },
        {
          endpoints: {
            some: {
              ...endpointFilter,
              isActive: true,
              OR: [
                { inputModalities: { has: modality } },
                { outputModalities: { has: modality } },
              ],
            },
          },
        },
      ],
    });
  }

  const where: Prisma.ModelWhereInput = {
    AND: conditions,
  };

  const skip = (filters.page - 1) * filters.limit;
  const orderBy = sortOrders[filters.sort](filters.order);

  const [models, total] = await Promise.all([
    prisma.model.findMany({
      where,
      orderBy,
      skip,
      take: filters.limit,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        modelType: true,
        status: true,
        contextWindow: true,
        maxContextWindow: true,
        maxOutputTokens: true,
        inputModalities: true,
        outputModalities: true,
        reasoning: true,
        toolCalling: true,
        structuredOutput: true,
        openWeights: true,
        minInputPricePer1m: true,
        minOutputPricePer1m: true,
        releaseDate: true,
        lastSyncedAt: true,
        lab: {
          select: {
            slug: true,
            name: true,
          },
        },
        _count: {
          select: {
            endpoints: {
              where: { isActive: true },
            },
          },
        },
      },
    }),

    prisma.model.count({ where }),
  ]);

  return {
    data: models.map((model) => ({
      ...model,
      minInputPricePer1m:
        model.minInputPricePer1m?.toString() ?? null,
      minOutputPricePer1m:
        model.minOutputPricePer1m?.toString() ?? null,
      activeEndpointCount: model._count.endpoints,
    })),

    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}
