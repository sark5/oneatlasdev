import { prisma } from "@/lib/prisma";

interface FacetRow {
  facets: {
    modelTypes: Record<string, number>;
    labs: Array<{
      slug: string;
      name: string;
      count: number;
    }>;
    providers: Array<{
      slug: string;
      name: string;
      count: number;
    }>;
    modalities: Record<string, number>;
    capabilities: Record<string, number>;
  };
}

export async function getModelFacets() {
  const rows = await prisma.$queryRaw<FacetRow[]>`
    WITH active_models AS (
      SELECT *
      FROM "Model"
      WHERE "status" NOT IN (
        'DEPRECATED',
        'RETIRED'
      )
    ),

    model_types AS (
      SELECT COALESCE(
        jsonb_object_agg("modelType", total),
        '{}'::jsonb
      ) AS data
      FROM (
        SELECT
          "modelType",
          COUNT(*)::int AS total
        FROM active_models
        GROUP BY "modelType"
      ) values_by_type
    ),

    lab_facets AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'slug', slug,
            'name', name,
            'count', total
          ) ORDER BY name
        ),
        '[]'::jsonb
      ) AS data
      FROM (
        SELECT
          l.slug,
          l.name,
          COUNT(m.id)::int AS total
        FROM "AiLab" l
        INNER JOIN active_models m
          ON m."labId" = l.id
        GROUP BY l.id, l.slug, l.name
      ) values_by_lab
    ),

    provider_facets AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'slug', slug,
            'name', name,
            'count', total
          ) ORDER BY name
        ),
        '[]'::jsonb
      ) AS data
      FROM (
        SELECT
          p.slug,
          p.name,
          COUNT(DISTINCT e."modelId")::int AS total
        FROM "Provider" p
        INNER JOIN "ModelEndpoint" e
          ON e."providerId" = p.id
        INNER JOIN active_models m
          ON m.id = e."modelId"
        WHERE e."isActive" = true
        GROUP BY p.id, p.slug, p.name
      ) values_by_provider
    ),

    modality_facets AS (
      SELECT COALESCE(
        jsonb_object_agg(modality, total),
        '{}'::jsonb
      ) AS data
      FROM (
        SELECT
          modality,
          COUNT(DISTINCT model_id)::int AS total
        FROM (
          SELECT
            m.id AS model_id,
            unnest(
              m."inputModalities" ||
              m."outputModalities"
            ) AS modality
          FROM active_models m
        ) all_modalities
        GROUP BY modality
      ) modality_counts
    ),

    capability_facets AS (
      SELECT jsonb_build_object(
        'reasoning',
        COUNT(*) FILTER (WHERE "reasoning" = true)::int,

        'toolCalling',
        COUNT(*) FILTER (WHERE "toolCalling" = true)::int,

        'structuredOutput',
        COUNT(*) FILTER (
          WHERE "structuredOutput" = true
        )::int,

        'openWeights',
        COUNT(*) FILTER (WHERE "openWeights" = true)::int
      ) AS data
      FROM active_models
    )

    SELECT jsonb_build_object(
      'modelTypes', (SELECT data FROM model_types),
      'labs', (SELECT data FROM lab_facets),
      'providers', (SELECT data FROM provider_facets),
      'modalities', (SELECT data FROM modality_facets),
      'capabilities', (SELECT data FROM capability_facets)
    ) AS facets;
  `;

  return (
    rows[0]?.facets ?? {
      modelTypes: {},
      labs: [],
      providers: [],
      modalities: {},
      capabilities: {},
    }
  );
}
