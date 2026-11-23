import { test, expect } from "@playwright/test";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ModelItem {
  slug: string;
  name: string;
}

interface DirectoryItem {
  slug: string;
  name: string;
}

test.describe("OneAtlas API v1", () => {
  test("health endpoint confirms database connectivity", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/health");

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.database.connected).toBe(true);
  });

  test("model discovery returns valid pagination", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/models?limit=10&page=1"
    );

    expect(response.status()).toBe(200);

    const body: ApiEnvelope<ModelItem[]> =
      await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 10,
    });

    expect(body.pagination!.total).toBeGreaterThanOrEqual(0);

    for (const model of body.data) {
      expect(model.slug).toBeTruthy();
      expect(model.name).toBeTruthy();
    }
  });

  test("search returns a valid result envelope", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/models?q=gemini&limit=10"
    );

    expect(response.status()).toBe(200);

    const body: ApiEnvelope<ModelItem[]> =
      await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("invalid pagination returns HTTP 400", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/models?page=-1&limit=500"
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("unknown models return HTTP 404", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/models/oneatlas-test-model-does-not-exist"
    );

    expect(response.status()).toBe(404);

    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  test("model detail returns valid specifications", async ({
    request,
  }) => {
    const listing = await request.get(
      "/api/v1/models?limit=1"
    );

    expect(listing.status()).toBe(200);

    const listingBody: ApiEnvelope<ModelItem[]> =
      await listing.json();

    expect(listingBody.data.length).toBeGreaterThan(0);

    const slug = listingBody.data[0].slug;

    const response = await request.get(
      `/api/v1/models/${encodeURIComponent(slug)}`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.slug).toBe(slug);

    expect(body.data).toHaveProperty("specifications");
    expect(body.data).toHaveProperty("endpoints");
    expect(body.data).toHaveProperty("benchmarks");
    expect(Array.isArray(body.data.endpoints)).toBe(true);
  });

  test("comparison supports two available models", async ({
    request,
  }) => {
    const listing = await request.get(
      "/api/v1/models?limit=4"
    );

    expect(listing.status()).toBe(200);

    const listingBody: ApiEnvelope<ModelItem[]> =
      await listing.json();

    expect(listingBody.data.length).toBeGreaterThanOrEqual(2);

    const slugs = listingBody.data
      .slice(0, 2)
      .map((model) => model.slug);

    const query = encodeURIComponent(
      slugs.join(",")
    );

    const response = await request.get(
      `/api/v1/compare?models=${query}`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data.map(
      (model: ModelItem) => model.slug
    )).toEqual(slugs);
  });

  test("lab directory returns valid results", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/labs?limit=10"
    );

    expect(response.status()).toBe(200);

    const body: ApiEnvelope<DirectoryItem[]> =
      await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("provider directory returns valid results", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/providers?limit=10"
    );

    expect(response.status()).toBe(200);

    const body: ApiEnvelope<DirectoryItem[]> =
      await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("facets endpoint returns catalogue aggregates", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/models/facets"
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);

    expect(body.data).toHaveProperty("modelTypes");
    expect(body.data).toHaveProperty("labs");
    expect(body.data).toHaveProperty("providers");
    expect(body.data).toHaveProperty("modalities");
    expect(body.data).toHaveProperty("capabilities");
  });

  test("OpenAPI document describes the v1 API", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/openapi.json"
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.openapi).toBe("3.1.0");

    expect(body.paths).toHaveProperty(
      "/api/v1/models"
    );

    expect(body.paths).toHaveProperty(
      "/api/v1/compare"
    );

    expect(body.paths).toHaveProperty(
      "/api/v1/providers"
    );
  });

  test("input price rankings return ordered values", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/rankings?metric=inputPrice&limit=10"
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.metric).toBe("inputPrice");
    expect(Array.isArray(body.data.data)).toBe(true);

    const prices = body.data.data.map(
      (item: { value: string }) => Number(item.value)
    );

    expect(prices).toEqual(
      [...prices].sort((a, b) => a - b)
    );
  });

  test("benchmark rankings require a benchmark slug", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/v1/rankings?metric=benchmark"
    );

    expect(response.status()).toBe(400);
  });
});
