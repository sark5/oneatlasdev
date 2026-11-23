import { z } from "zod";
import { env } from "@/lib/env";
import type { AdapterBatch } from "../types";
import { fetchJson } from "../utils/http";
import { canonicalModelSlug } from "../utils/slug";

const DEFAULT_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export async function fetchLiteLLMModels(
  existingModelSlugs: Set<string>,
  limit: number
): Promise<AdapterBatch> {
  const url = env.LITELLM_MODEL_PRICES_URL ?? DEFAULT_URL;
  const rawResponse = await fetchJson(url);

  const catalogSchema = z.record(
    z.string(),
    z.unknown()
  );

  const catalog = catalogSchema.parse(rawResponse);
  const entries = Object.entries(catalog);

  const matchingRecords = entries
    .filter(([externalId]) => {
      const canonicalSlug = canonicalModelSlug(externalId);
      return existingModelSlugs.has(canonicalSlug);
    })
    .slice(0, Math.max(1, limit));

  const records = matchingRecords.map(
    ([externalId, details]) => ({
      externalId,
      payload: {
        externalId,
        details,
      },
    })
  );

  return {
    totalSourceRecords: entries.length,
    preSkipped: entries.length - records.length,
    records,
  };
}
