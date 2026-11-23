# OneAtlas

AI Model Discovery & Intelligence Platform.

OneAtlas helps developers discover, compare and evaluate AI models across providers through a unified PostgreSQL-backed model catalogue.

## Tech Stack

- **Framework**: Next.js App Router (React 19, TypeScript)
- **Database**: PostgreSQL on Neon (Serverless with connection pooling)
- **ORM**: Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-neon`)
- **Validation**: Zod (strict runtime schema parsing)
- **Testing**: Vitest (unit & schema tests), Playwright (HTTP API contract tests)
- **Styling**: Tailwind CSS

## Features

- **Model Discovery & Search**: Multi-field full-text and fuzzy search across model name, slug, description, and modalities.
- **Provider-Specific Pricing**: Track input, output, cache-read, and cache-write pricing in USD per 1M tokens per provider.
- **Model Specification Pages**: Inspect context length, max tokens, modalities, tool calling, structured outputs, and open weights.
- **Model Comparison**: Side-by-side comparison of 2–4 models across specifications and active provider endpoints.
- **AI Lab & Provider Directories**: Searchable directories of foundational research labs and hosting providers.
- **Rankings & Benchmarks**: Real-time leaderboards sorted by input price, output price, context length, or benchmark evaluations.
- **Automated Data Ingestion**: Live ingestion pipeline integrating OpenRouter and LiteLLM catalogues.
- **Data Provenance & Audit Logs**: Full historical raw snapshots and quarantine tables for unparseable records.
- **PostgreSQL Search Indexes**: Optimized B-tree, GIN trigram (`pg_trgm`), and GIN full-text search indexes.

## Architecture

```text
External Sources (OpenRouter API, LiteLLM JSON)
       |
       v
Source Adapters (Fetch & preserve raw payload)
       |
       v
Normalization & Zod Validation Engine
       |
       +-------> QuarantinedRecord (Validation errors preserved)
       |
       v
Prisma Persistence Layer (Interactive transactions, idempotent upserts)
       |
       v
Neon PostgreSQL (Models, Labs, Providers, Endpoints, Snapshots, Leases)
       |
       v
Next.js REST APIs (/api/v1/*)
       |
       v
OneAtlas Interface (/ , /models/[slug] , /docs)
```

## Database Design

- `AiLab`: AI research organizations and creators (OpenAI, Anthropic, Google, Meta, etc.).
- `Provider`: Hosting and inference platforms (Together, Groq, DeepInfra, Fireworks, etc.).
- `Model`: Canonical AI model entity with specifications and denormalized price/context summaries.
- `ModelEndpoint`: Specific hosting of a model by a provider with active status, latency, and pricing.
- `Benchmark`: Standardized evaluation suites (MMLU, HumanEval, GSM8K, etc.).
- `BenchmarkScore`: Evaluated scores attributed to a canonical model with source provenance.
- `IngestionRun`: Audit log tracking status (`RUNNING`, `SUCCEEDED`, `PARTIAL`, `FAILED`), timestamps, and read/write counters.
- `RawModelSnapshot`: Immutable raw source payloads stored with content hashes for idempotency.
- `QuarantinedRecord`: Quarantine table capturing malformed source payloads and Zod validation errors.
- `IngestionLease`: Database-backed distributed concurrency locks with automatic heartbeat renewal and expiration.
- `AppSetting`: Application-level configuration storage.

> **Design Note**: `Model` and `ModelEndpoint` are strictly decoupled because a single canonical AI model can be served simultaneously by multiple providers, each with distinct pricing, hardware context limits, regional hosting, and data retention policies.

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/oneatlas.git
   cd oneatlas
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Configure `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).

4. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

5. **Apply migrations**:
   ```bash
   npm run db:deploy
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

## Testing

```bash
# Typecheck
npm run typecheck

# Unit and schema tests (Vitest)
npm test

# API contract smoke tests (Playwright HTTP against running server)
npm run test:api

# Full release verification pipeline
npm run test:release
```

## API Documentation

- **Interactive Developer Docs**: `/docs`
- **OpenAPI 3.1 Specification**: `/api/v1/openapi.json`

### Key Endpoints:
- `GET /api/v1/health` — Database connectivity & ingestion freshness audit
- `GET /api/v1/models` — Search, filter, and paginate AI models
- `GET /api/v1/models/[slug]` — Detailed specifications and active provider endpoints
- `GET /api/v1/models/facets` — Aggregate counts across labs, modalities, and capabilities
- `GET /api/v1/compare?models=slug-a,slug-b` — Side-by-side comparison of 2–4 models
- `GET /api/v1/rankings?metric=inputPrice` — Model rankings by price, context, or benchmark
- `GET /api/v1/labs` — AI research lab directory
- `GET /api/v1/providers` — Inference provider directory

## Data Sources

- **OpenRouter**: Primary catalogue and provider endpoint source (`/api/v1/models`, `/api/v1/models/{author}/{slug}/endpoints`).
- **LiteLLM**: Secondary pricing and token limit metadata (`model_prices_and_context_window.json`).

Data is validated with Zod, normalized to canonical slugs, and converted to standardized USD per million tokens before persistence. Source URLs and synchronization timestamps are permanently retained.

## Data Integrity & Reliability

- **Decimal Pricing**: High-precision prices stored using PostgreSQL `DECIMAL(20, 10)` and handled via `Decimal.js` to avoid floating-point drift.
- **Concurrency Control**: Distributed database-backed leases (`IngestionLease`) with 60s heartbeats prevent duplicate worker runs across instances.
- **Endpoint Reconciliation**: Verifies complete source snapshots before deactivating missing endpoints; partial or failed API responses never deactivate active providers.
- **Idempotency**: Unique compound constraint `@@unique([ingestionRunId, source, externalId, contentHash])` ensures safe retries without duplicate raw snapshots.
- **Automated Consistency Verification**: SQL repair service (`npm run db:check-consistency`) synchronizes model summary columns with active provider endpoints.
- **Freshness Monitoring**: `/api/v1/health` inspects run history to report `fresh`, `syncing`, `stale`, or `degraded` operational status.

## Performance Engineering

Database query scalability was benchmarked using an isolated Neon PostgreSQL 16 performance branch (AWS `us-east-2`) populated with **10,000 synthetic models** (`perf-model-*`) and **20,000 synthetic provider endpoints** (total: 10,045 models, 20,221 endpoints).

> **Important**: The figures below reflect internal **PostgreSQL execution times** measured via `EXPLAIN (ANALYZE, BUFFERS)` on the database engine itself, distinct from total end-to-end HTTP network latency (which includes TLS handshake, serverless compute routing, and Node.js serialization).

- **Search Query Execution Strategies (10,045 rows)**:
  - **Prisma Substring Query (`ILIKE`)**: Multi-column substring matching on `name`, `slug`, and `description` without dedicated trigram index binding requires a sequential table scan (`Seq Scan on Model`): **7.76 ms PostgreSQL execution time**, 805 shared buffer hits.
  - **PostgreSQL Full-Text Search (GIN Index `Model_search_fts_idx`)**: Targeted keyword matching using `to_tsvector('simple', ...)` utilizes the composite GIN index: **0.040 ms PostgreSQL execution time**, 4 shared buffer hits.
- **Price Sorting & Pagination**:
  - `ORDER BY minInputPricePer1m ASC NULLS LAST LIMIT 20` is covered by composite B-tree index `Model_minInputPricePer1m_id_idx`: **0.076 ms PostgreSQL execution time**, 19 shared buffer hits, eliminating the need for an in-memory quicksort node.
- **Provider Endpoint Relationship Lookup**:
  - Retrieving active endpoints for a model by slug joins `Model` and `ModelEndpoint` using `Model_slug_key` (unique B-tree) and `ModelEndpoint_modelId_isActive_idx`: **0.085 ms PostgreSQL execution time**, 9 shared buffer hits.

## Limitations

- Initial catalogue scope is bounded to verified commercial models for the MVP.
- Benchmark coverage depends on published external evaluation datasets.
- Provider latency and uptime metrics depend on upstream reporting.
- Automated scheduled ingestion is disabled by default for initial release to prevent function timeouts on serverless deployments.

## Future Improvements

- Incremental delta-based ingestion to minimize upstream API calls.
- Additional provider adapters (Together AI, HuggingFace, AWS Bedrock).
- Cursor-based pagination (`keyset pagination`) for massive catalogue scalability.
- Advanced benchmark analytics (win rates, Elo ratings, arena leaderboards).
- Edge-based API rate limiting and token bucket throttling.
