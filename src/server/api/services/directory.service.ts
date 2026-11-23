import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DirectoryQuery } from "../query.schema";

export async function getLabs(query: DirectoryQuery) {
  const where: Prisma.AiLabWhereInput = query.q
    ? {
        OR: [
          {
            name: {
              contains: query.q,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: query.q,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const skip = (query.page - 1) * query.limit;

  const [labs, total] = await Promise.all([
    prisma.aiLab.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      include: {
        _count: {
          select: { models: true },
        },
      },
    }),

    prisma.aiLab.count({ where }),
  ]);

  return {
    data: labs.map((lab) => ({
      id: lab.id,
      slug: lab.slug,
      name: lab.name,
      description: lab.description,
      websiteUrl: lab.websiteUrl,
      logoUrl: lab.logoUrl,
      country: lab.country,
      modelCount: lab._count.models,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getLabBySlug(
  slug: string,
  query: DirectoryQuery
) {
  const lab = await prisma.aiLab.findUnique({
    where: { slug },

    include: {
      _count: {
        select: { models: true },
      },

      models: {
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          slug: true,
          name: true,
          modelType: true,
          status: true,
          maxContextWindow: true,
          minInputPricePer1m: true,
          minOutputPricePer1m: true,
          lastSyncedAt: true,
        },
      },
    },
  });

  if (!lab) {
    return null;
  }

  return {
    id: lab.id,
    slug: lab.slug,
    name: lab.name,
    description: lab.description,
    websiteUrl: lab.websiteUrl,
    logoUrl: lab.logoUrl,
    country: lab.country,
    totalModels: lab._count.models,

    models: lab.models.map((model) => ({
      ...model,
      minInputPricePer1m:
        model.minInputPricePer1m?.toString() ?? null,
      minOutputPricePer1m:
        model.minOutputPricePer1m?.toString() ?? null,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total: lab._count.models,
      totalPages: Math.ceil(lab._count.models / query.limit),
    },
  };
}

export async function getProviders(query: DirectoryQuery) {
  const where: Prisma.ProviderWhereInput = query.q
    ? {
        OR: [
          {
            name: {
              contains: query.q,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: query.q,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const skip = (query.page - 1) * query.limit;

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      include: {
        _count: {
          select: {
            endpoints: {
              where: { isActive: true },
            },
          },
        },
      },
    }),

    prisma.provider.count({ where }),
  ]);

  return {
    data: providers.map((provider) => ({
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      kind: provider.kind,
      description: provider.description,
      websiteUrl: provider.websiteUrl,
      logoUrl: provider.logoUrl,
      country: provider.country,
      activeEndpointCount: provider._count.endpoints,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getProviderBySlug(
  slug: string,
  query: DirectoryQuery
) {
  const provider = await prisma.provider.findUnique({
    where: { slug },

    include: {
      _count: {
        select: {
          endpoints: {
            where: { isActive: true },
          },
        },
      },

      endpoints: {
        where: { isActive: true },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          model: {
            select: {
              slug: true,
              name: true,
              modelType: true,
              maxContextWindow: true,
            },
          },
        },
      },
    },
  });

  if (!provider) {
    return null;
  }

  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    kind: provider.kind,
    description: provider.description,
    websiteUrl: provider.websiteUrl,
    logoUrl: provider.logoUrl,
    country: provider.country,
    activeEndpointCount: provider._count.endpoints,

    endpoints: provider.endpoints.map((endpoint) => ({
      id: endpoint.id,
      providerModelId: endpoint.providerModelId,
      model: endpoint.model,
      contextWindow: endpoint.contextWindow,
      inputPricePer1m:
        endpoint.inputPricePer1m?.toString() ?? null,
      outputPricePer1m:
        endpoint.outputPricePer1m?.toString() ?? null,
      zeroDataRetention: endpoint.zeroDataRetention,
      regions: endpoint.regions,
      latencyMs: endpoint.latencyMs?.toString() ?? null,
      uptimePercent:
        endpoint.uptimePercent?.toString() ?? null,
      source: endpoint.source,
      sourceUrl: endpoint.sourceUrl,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total: provider._count.endpoints,
      totalPages: Math.ceil(
        provider._count.endpoints / query.limit
      ),
    },
  };
}
