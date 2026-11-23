"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface Endpoint {
  id: string;
  provider: {
    name: string;
    slug: string;
  };
  inputPricePer1m: string | null;
  outputPricePer1m: string | null;
  blendedPricePer1m: string | null;
  contextWindow: number | null;
  zeroDataRetention: boolean | null;
  regions: string[];
  latencyMs: string | null;
  sourceUrl: string | null;
}

interface ModelDetail {
  slug: string;
  name: string;
  description: string | null;
  modelType: string;
  lab: {
    name: string;
    slug: string;
  } | null;

  specifications: {
    contextWindow: number | null;
    maxContextWindow: number | null;
    maxOutputTokens: number | null;
    inputModalities: string[];
    outputModalities: string[];
    reasoning: boolean | null;
    toolCalling: boolean | null;
    structuredOutput: boolean | null;
    openWeights: boolean | null;
  };

  endpoints: Endpoint[];

  benchmarks: Array<{
    benchmark: {
      name: string;
      category: string;
      metricName: string;
    };
    score: string;
    sourceName: string;
    sourceUrl: string;
    evaluatedAt: string;
  }>;

  provenance: {
    sourceUrl: string | null;
    lastSyncedAt: string | null;
  };
}

function price(value: string | null) {
  if (value === null) return "Unknown";

  return `$${Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })}`;
}

function capability(value: boolean | null) {
  if (value === null) return "Unknown";

  return value ? "Supported" : "Not supported";
}

function ModelDetailContent() {
  const params = useParams<{ slug: string }>();

  const slug = params.slug;

  const [model, setModel] =
    useState<ModelDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadModel() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/v1/models/${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error?.message ?? "Model not found."
          );
        }

        setModel(result.data);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load model."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadModel();

    return () => controller.abort();
  }, [slug]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="text-xl font-bold">
            OneAtlas<span className="text-blue-400">.</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <Link href="/" className="text-sm text-blue-400">
          ← Back to models
        </Link>

        {loading && (
          <p className="mt-8 text-slate-400">
            Loading model details...
          </p>
        )}

        {error && (
          <p role="alert" className="mt-8 text-red-400">
            {error}
          </p>
        )}

        {model && (
          <>
            <div className="mt-8">
              <p className="text-sm text-blue-400">
                {model.lab?.name ?? "Unknown lab"}
              </p>

              <h1 className="mt-3 text-4xl font-bold">
                {model.name}
              </h1>

              <p className="mt-4 max-w-3xl text-slate-400">
                {model.description ?? "No model description available."}
              </p>

              <span className="mt-5 inline-block rounded-md bg-blue-500/10 px-3 py-2 text-sm text-blue-300">
                {model.modelType}
              </span>
            </div>

            <section className="mt-12">
              <h2 className="text-xl font-semibold">
                Model specifications
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Context window", model.specifications.maxContextWindow],
                  ["Max output tokens", model.specifications.maxOutputTokens],
                  ["Reasoning", capability(model.specifications.reasoning)],
                  ["Tool calling", capability(model.specifications.toolCalling)],
                  ["Structured output", capability(model.specifications.structuredOutput)],
                  ["Open weights", capability(model.specifications.openWeights)],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <p className="text-sm text-slate-500">
                      {label}
                    </p>

                    <p className="mt-2 font-semibold">
                      {typeof value === "number"
                        ? value.toLocaleString()
                        : value ?? "Unknown"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-5">
                  <p className="text-sm text-slate-500">
                    Input modalities
                  </p>
                  <p className="mt-2">
                    {model.specifications.inputModalities.join(", ") || "Unknown"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 p-5">
                  <p className="text-sm text-slate-500">
                    Output modalities
                  </p>
                  <p className="mt-2">
                    {model.specifications.outputModalities.join(", ") || "Unknown"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-semibold">
                Provider endpoints
              </h2>

              <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-white/5 text-slate-400">
                    <tr>
                      <th className="p-4">Provider</th>
                      <th className="p-4">Input / 1M</th>
                      <th className="p-4">Output / 1M</th>
                      <th className="p-4">Equal-volume blended / 1M</th>
                      <th className="p-4">Context</th>
                    </tr>
                  </thead>

                  <tbody>
                    {model.endpoints.map((endpoint) => (
                      <tr
                        key={endpoint.id}
                        className="border-t border-white/10"
                      >
                        <td className="p-4 font-medium">
                          {endpoint.provider.name}
                        </td>

                        <td className="p-4">
                          {price(endpoint.inputPricePer1m)}
                        </td>

                        <td className="p-4">
                          {price(endpoint.outputPricePer1m)}
                        </td>

                        <td className="p-4">
                          {price(endpoint.blendedPricePer1m)}
                        </td>

                        <td className="p-4">
                          {endpoint.contextWindow?.toLocaleString() ?? "Unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {model.endpoints.length === 0 && (
                  <p className="p-5 text-slate-400">
                    No active provider endpoints are currently available.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-semibold">
                Benchmarks
              </h2>

              {model.benchmarks.length === 0 ? (
                <p className="mt-4 text-slate-400">
                  No verified benchmark scores available.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {model.benchmarks.map((benchmark) => (
                    <div
                      key={`${benchmark.benchmark.name}-${benchmark.evaluatedAt}`}
                      className="rounded-xl border border-white/10 p-5"
                    >
                      <p className="font-semibold">
                        {benchmark.benchmark.name}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        {benchmark.benchmark.metricName}: {benchmark.score}
                      </p>

                      <a
                        href={benchmark.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-blue-400 underline"
                      >
                        Source: {benchmark.sourceName}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12 rounded-xl border border-white/10 p-5">
              <h2 className="font-semibold">
                Data provenance
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Last synchronized:{" "}
                {model.provenance.lastSyncedAt
                  ? new Date(model.provenance.lastSyncedAt).toLocaleString()
                  : "Unknown"}
              </p>

              {model.provenance.sourceUrl && (
                <a
                  href={model.provenance.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block break-all text-sm text-blue-400 underline"
                >
                  View source
                </a>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default function ModelDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-12 text-slate-400">
          Loading model details...
        </div>
      }
    >
      <ModelDetailContent />
    </Suspense>
  );
}
