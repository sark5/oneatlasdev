const directoryQueryParameters = [
  {
    name: "q",
    in: "query",
    schema: { type: "string" },
  },
  {
    name: "page",
    in: "query",
    schema: { type: "integer", minimum: 1 },
  },
  {
    name: "limit",
    in: "query",
    schema: {
      type: "integer",
      minimum: 1,
      maximum: 100,
    },
  },
] as const;

const modelQueryParameters = [
  { name: "q", in: "query", schema: { type: "string" } },
  {
    name: "lab",
    in: "query",
    schema: { type: "string" },
  },
  {
    name: "provider",
    in: "query",
    schema: { type: "string" },
  },
  {
    name: "type",
    in: "query",
    schema: {
      type: "string",
      enum: [
        "CHAT",
        "EMBEDDING",
        "IMAGE",
        "AUDIO",
        "VIDEO",
        "MULTIMODAL",
        "RERANKER",
        "OTHER",
      ],
    },
  },
  {
    name: "modality",
    in: "query",
    style: "form",
    explode: true,
    schema: { type: "array", items: { type: "string" } },
  },
  ...(
    [
      "reasoning",
      "toolCalling",
      "structuredOutput",
      "openWeights",
      "zdr",
      "hideDeprecated",
    ] as const
  ).map((name) => ({
    name,
    in: "query" as const,
    schema: { type: "boolean" as const },
  })),
  {
    name: "region",
    in: "query",
    schema: { type: "string" },
  },
  {
    name: "minContext",
    in: "query",
    schema: { type: "integer", minimum: 1 },
  },
  {
    name: "maxInputPrice",
    in: "query",
    schema: {
      type: "string",
      pattern: "^\\d+(\\.\\d+)?$",
    },
  },
  {
    name: "sort",
    in: "query",
    schema: {
      type: "string",
      enum: [
        "name",
        "inputPrice",
        "outputPrice",
        "context",
        "releaseDate",
      ],
    },
  },
  {
    name: "order",
    in: "query",
    schema: { type: "string", enum: ["asc", "desc"] },
  },
  {
    name: "page",
    in: "query",
    schema: { type: "integer", minimum: 1 },
  },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100 },
  },
] as const;

const openApiSpec = {
  openapi: "3.1.0",

  info: {
    title: "OneAtlas API",
    version: "1.0.0",
    description:
      "AI model discovery, comparison, provider and benchmark intelligence API.",
  },

  servers: [
    {
      url: "/",
      description: "Current OneAtlas deployment",
    },
  ],

  paths: {
    "/api/v1/health": {
      get: {
        summary: "Check API and database health",
        responses: {
          "200": { description: "Database is reachable" },
          "503": { description: "Database unavailable" },
        },
      },
    },

    "/api/v1/models": {
      get: {
        summary: "Discover and search AI models",
        parameters: modelQueryParameters,
        responses: {
          "200": {
            description: "Paginated model results",
          },
          "400": {
            description: "Invalid query parameters",
          },
        },
      },
    },

    "/api/v1/models/facets": {
      get: {
        summary: "Retrieve model catalogue facet counts",
        responses: {
          "200": {
            description:
              "Model type, lab, provider, modality and capability counts",
          },
          "500": {
            description: "Internal server error",
          },
        },
      },
    },

    "/api/v1/models/{slug}": {
      get: {
        summary:
          "Retrieve model specifications and endpoints",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Model detail" },
          "404": { description: "Model not found" },
        },
      },
    },

    "/api/v1/compare": {
      get: {
        summary: "Compare two to four AI models",
        parameters: [
          {
            name: "models",
            in: "query",
            required: true,
            schema: { type: "string" },
            description:
              "Comma-separated canonical model slugs.",
          },
        ],
        responses: {
          "200": {
            description: "Aligned model comparison",
          },
          "400": {
            description: "Invalid comparison request",
          },
          "404": {
            description:
              "A requested model was not found",
          },
        },
      },
    },

    "/api/v1/labs": {
      get: {
        summary: "List AI research labs",
        parameters: directoryQueryParameters,
        responses: {
          "200": { description: "Paginated AI labs" },
        },
      },
    },

    "/api/v1/labs/{slug}": {
      get: {
        summary: "Retrieve AI lab and its models",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          ...directoryQueryParameters,
        ],
        responses: {
          "200": { description: "AI lab details" },
          "404": { description: "AI lab not found" },
        },
      },
    },

    "/api/v1/providers": {
      get: {
        summary: "List AI providers",
        parameters: directoryQueryParameters,
        responses: {
          "200": { description: "Paginated providers" },
        },
      },
    },

    "/api/v1/providers/{slug}": {
      get: {
        summary:
          "Retrieve provider and its model endpoints",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          ...directoryQueryParameters,
        ],
        responses: {
          "200": { description: "Provider details" },
          "404": { description: "Provider not found" },
        },
      },
    },

    "/api/v1/rankings": {
      get: {
        summary: "Retrieve AI model rankings and benchmark leaderboards",
        parameters: [
          {
            name: "metric",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "inputPrice",
                "outputPrice",
                "context",
                "benchmark",
              ],
            },
          },
          {
            name: "benchmark",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "order",
            in: "query",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
            },
          },
        ],
        responses: {
          "200": {
            description: "Ranked models with metric and provenance",
          },
          "400": {
            description: "Invalid ranking request",
          },
          "404": {
            description: "Benchmark not found",
          },
        },
      },
    },
  },
} as const;

export async function GET() {
  return Response.json(openApiSpec, {
    headers: {
      "Cache-Control":
        "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
