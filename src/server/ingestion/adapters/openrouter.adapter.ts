import { z } from "zod";
import { env } from "@/lib/env";
import type { AdapterBatch } from "../types";
import { fetchJson } from "../utils/http";

const MODELS_URL = "https://openrouter.ai/api/v1/models";

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) {
        return;
      }
      results[index] = await handler(items[index]);
    }
  }

  const workers = Array.from(
    {
      length: Math.min(concurrency, items.length),
    },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

export async function fetchOpenRouterModels(
  limit: number
): Promise<AdapterBatch> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is required for OpenRouter ingestion"
    );
  }

  const safeLimit = Math.min(
    Math.max(limit, 1),
    100
  );

  const headers = {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  };

  const url = new URL(MODELS_URL);
  url.searchParams.set("limit", String(safeLimit));
  url.searchParams.set("offset", "0");

  const response = await fetchJson(
    url.toString(),
    headers
  );

  const parsed = z
    .object({
      data: z.array(z.unknown()),
    })
    .parse(response);

  const models = parsed.data;

  const indexedModels = models.map((raw, index) => ({
    raw,
    index,
  }));

  const records = await mapWithConcurrency(
    indexedModels,
    4,
    async ({ raw, index }) => {
      const identity = z
        .object({
          id: z.string().min(1),
        })
        .safeParse(raw);

      if (!identity.success) {
        return {
          externalId: `invalid-record-${index}`,
          payload: {
            model: raw,
            endpointResponse: null,
            endpointFetchFailed: false,
          },
        };
      }

      const model = identity.data;
      const parts = model.id.split("/");

      if (parts.length < 2) {
        return {
          externalId: model.id,
          payload: {
            model: raw,
            endpointResponse: null,
            endpointFetchFailed: false,
          },
        };
      }

      const author = parts[0];
      const slug = parts.slice(1).join("/");

      const endpointUrl =
        `https://openrouter.ai/api/v1/models/` +
        `${encodeURIComponent(author)}/` +
        `${encodeURIComponent(slug)}/endpoints`;

      let endpointResponse: unknown = null;
      let endpointFetchFailed = false;

      try {
        endpointResponse = await fetchJson(
          endpointUrl,
          headers
        );
      } catch {
        endpointFetchFailed = true;
      }

      return {
        externalId: model.id,
        payload: {
          model: raw,
          endpointResponse,
          endpointFetchFailed,
          endpointUrl,
        },
      };
    }
  );

  return {
    totalSourceRecords: models.length,
    preSkipped: 0,
    records,
  };
}
