import { prisma } from "@/lib/prisma";

interface DriftResult {
  modelId: string;
  slug: string;
  storedInputPrice: string | null;
  expectedInputPrice: string | null;
  storedOutputPrice: string | null;
  expectedOutputPrice: string | null;
  storedMaxContext: number | null;
  expectedMaxContext: number | null;
}

export async function findModelSummaryDrift() {
  return prisma.$queryRaw<DriftResult[]>`
    WITH endpoint_summary AS (
      SELECT
        "modelId",

        MIN("inputPricePer1m")
          FILTER (WHERE "isActive" = true)
          AS min_input,

        MIN("outputPricePer1m")
          FILTER (WHERE "isActive" = true)
          AS min_output,

        MAX("contextWindow")
          FILTER (WHERE "isActive" = true)
          AS max_context

      FROM "ModelEndpoint"
      GROUP BY "modelId"
    ),

    expected AS (
      SELECT
        m."id",
        m."slug",
        m."minInputPricePer1m",
        m."minOutputPricePer1m",
        m."maxContextWindow",

        e.min_input,
        e.min_output,

        GREATEST(
          m."contextWindow",
          e.max_context
        ) AS expected_context

      FROM "Model" m

      LEFT JOIN endpoint_summary e
        ON e."modelId" = m."id"
    )

    SELECT
      "id" AS "modelId",
      "slug",

      "minInputPricePer1m"::text
        AS "storedInputPrice",

      min_input::text
        AS "expectedInputPrice",

      "minOutputPricePer1m"::text
        AS "storedOutputPrice",

      min_output::text
        AS "expectedOutputPrice",

      "maxContextWindow" AS "storedMaxContext",

      expected_context AS "expectedMaxContext"

    FROM expected

    WHERE
      "minInputPricePer1m" IS DISTINCT FROM min_input
      OR "minOutputPricePer1m" IS DISTINCT FROM min_output
      OR "maxContextWindow" IS DISTINCT FROM expected_context

    LIMIT 100;
  `;
}

export async function repairModelSummaries() {
  return prisma.$executeRaw`
    WITH endpoint_summary AS (
      SELECT
        "modelId",

        MIN("inputPricePer1m")
          FILTER (WHERE "isActive" = true)
          AS min_input,

        MIN("outputPricePer1m")
          FILTER (WHERE "isActive" = true)
          AS min_output,

        MAX("contextWindow")
          FILTER (WHERE "isActive" = true)
          AS max_context

      FROM "ModelEndpoint"
      GROUP BY "modelId"
    ),

    expected AS (
      SELECT
        m."id",
        e.min_input,
        e.min_output,

        GREATEST(
          m."contextWindow",
          e.max_context
        ) AS max_context

      FROM "Model" m

      LEFT JOIN endpoint_summary e
        ON e."modelId" = m."id"
    )

    UPDATE "Model" m

    SET
      "minInputPricePer1m" = e.min_input,
      "minOutputPricePer1m" = e.min_output,
      "maxContextWindow" = e.max_context

    FROM expected e

    WHERE m."id" = e."id";
  `;
}
