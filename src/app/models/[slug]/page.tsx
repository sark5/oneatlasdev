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
  uptimePercent: string | null;
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

function formatPrice(value: string | null): string {
  if (value === null) return "Unknown";
  const num = Number(value);
  if (num === 0) return "$0.00";
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}

function capabilityBadge(value: boolean | null) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Supported
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="text-[#8e7b6d] font-mono text-xs">
        Not confirmed
      </span>
    );
  }
  return <span className="text-[#8e7b6d] font-mono text-xs">Unspecified</span>;
}

function ModelDetailContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [model, setModel] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadModel() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/models/${encodeURIComponent(slug)}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message ?? "Model not found.");
        }

        setModel(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load model telemetry."
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
    <main className="min-h-screen bg-[#110d0b] text-[#f5ece5] flex flex-col selection:bg-[#e58a3c]/30 selection:text-white">
      {/* Precision Header */}
      <header className="border-b border-[#352b24] bg-[#181310]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e58a3c]/15 border border-[#e58a3c]/40 text-[#f59e0b] font-mono text-sm font-bold shadow-sm shadow-[#e58a3c]/10">
              Ω
            </span>
            <span className="text-xl font-bold tracking-tight text-[#f5ece5] group-hover:text-white transition">
              OneAtlas<span className="text-[#e58a3c]">.</span>
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium text-[#c8b6a6]">
            <Link href="/" className="hover:text-white transition">
              Observatory
            </Link>
            <Link href="/docs" className="hover:text-white transition">
              API Reference
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        {/* Back Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#e58a3c] hover:text-[#f59e0b] transition mb-6"
        >
          ← Back to Model Observatory
        </Link>

        {loading && (
          <div className="py-24 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#e58a3c] border-t-transparent" />
            <p className="mt-4 text-sm font-mono text-[#c8b6a6]">
              Loading model specifications & provider endpoints...
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-900/50 bg-red-950/20 p-6 text-red-200 mb-8"
          >
            <p className="font-semibold text-sm">Error Loading Model</p>
            <p className="text-xs mt-1 text-red-300/80">{error}</p>
          </div>
        )}

        {model && (
          <div className="space-y-10">
            {/* Model Identity Hero Header */}
            <div className="rounded-2xl border border-[#352b24] bg-[#181310] p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-black/30">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#e58a3c]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="rounded-lg bg-[#e58a3c]/15 border border-[#e58a3c]/40 px-2.5 py-1 text-xs font-mono font-semibold text-[#f59e0b]">
                  {model.lab?.name ?? "Independent Research Lab"}
                </span>
                <span className="rounded-lg bg-[#241e1a] border border-[#352b24] px-2.5 py-1 text-xs font-mono text-[#c8b6a6]">
                  {model.modelType}
                </span>
                <span className="text-xs font-mono text-[#8e7b6d]">
                  Canonical ID: {model.slug}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#f5ece5] tracking-tight">
                {model.name}
              </h1>

              <p className="mt-4 max-w-4xl text-sm sm:text-base text-[#c8b6a6] leading-relaxed">
                {model.description ?? "Canonical model entry with multi-provider inference endpoint telemetry."}
              </p>

              {/* Quick Spec Highlights Bar */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#352b24] pt-6 font-mono text-xs">
                <div>
                  <p className="text-[#8e7b6d] uppercase">Max Context</p>
                  <p className="mt-1 text-base font-bold text-[#f5ece5]">
                    {model.specifications.maxContextWindow
                      ? `${model.specifications.maxContextWindow.toLocaleString()} tokens`
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-[#8e7b6d] uppercase">Max Completion</p>
                  <p className="mt-1 text-base font-bold text-[#f5ece5]">
                    {model.specifications.maxOutputTokens
                      ? `${model.specifications.maxOutputTokens.toLocaleString()} tokens`
                      : "Uncapped / Dynamic"}
                  </p>
                </div>
                <div>
                  <p className="text-[#8e7b6d] uppercase">Active Providers</p>
                  <p className="mt-1 text-base font-bold text-emerald-400">
                    {model.endpoints.length} verified host{model.endpoints.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div>
                  <p className="text-[#8e7b6d] uppercase">Open Weights</p>
                  <p className="mt-1 text-base font-bold text-[#f5ece5]">
                    {model.specifications.openWeights ? "Yes (OSS)" : "Proprietary / API"}
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Endpoints & Arbitrage Table */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#f5ece5]">
                    Hosting Providers & Pricing Arbitrage
                  </h2>
                  <p className="text-xs text-[#8e7b6d] font-mono mt-0.5">
                    Live endpoint quotes normalized to USD per 1M tokens.
                  </p>
                </div>
                <span className="rounded-lg bg-[#201915] border border-[#352b24] px-3 py-1 text-xs font-mono text-[#c8b6a6]">
                  {model.endpoints.length} active endpoint{model.endpoints.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#352b24] bg-[#181310] shadow-lg shadow-black/20">
                <table className="w-full min-w-[700px] text-left text-xs font-mono">
                  <thead className="bg-[#110d0b] text-[#8e7b6d] uppercase border-b border-[#352b24]">
                    <tr>
                      <th className="p-4 pl-5">Provider</th>
                      <th className="p-4">Input / 1M</th>
                      <th className="p-4">Output / 1M</th>
                      <th className="p-4">Blended / 1M</th>
                      <th className="p-4">Context Limit</th>
                      <th className="p-4">Zero Retention</th>
                      <th className="p-4 pr-5 text-right">Endpoint Telemetry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#352b24]/60">
                    {model.endpoints.map((endpoint) => (
                      <tr key={endpoint.id} className="hover:bg-[#201915] transition">
                        <td className="p-4 pl-5 font-sans font-bold text-sm text-[#f5ece5]">
                          {endpoint.provider.name}
                        </td>
                        <td className="p-4 text-[#f5ece5] font-semibold">
                          {formatPrice(endpoint.inputPricePer1m)}
                        </td>
                        <td className="p-4 text-[#f5ece5] font-semibold">
                          {formatPrice(endpoint.outputPricePer1m)}
                        </td>
                        <td className="p-4 text-[#e58a3c] font-bold">
                          {formatPrice(endpoint.blendedPricePer1m)}
                        </td>
                        <td className="p-4 text-[#c8b6a6]">
                          {endpoint.contextWindow?.toLocaleString() ?? "—"}
                        </td>
                        <td className="p-4">
                          {endpoint.zeroDataRetention === true ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              ZDR Verified
                            </span>
                          ) : (
                            <span className="text-[#8e7b6d]">Standard</span>
                          )}
                        </td>
                        <td className="p-4 pr-5 text-right text-[#8e7b6d]">
                          {endpoint.latencyMs ? `${Number(endpoint.latencyMs).toFixed(0)}ms p50` : "Active"}
                        </td>
                      </tr>
                    ))}
                    {model.endpoints.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#8e7b6d]">
                          No third-party provider endpoints registered for this model.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Architectural Specifications Grid */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[#f5ece5]">
                Architectural Capabilities
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Reasoning", value: capabilityBadge(model.specifications.reasoning) },
                  { label: "Tool Calling", value: capabilityBadge(model.specifications.toolCalling) },
                  { label: "Structured Output", value: capabilityBadge(model.specifications.structuredOutput) },
                  { label: "Open Weights", value: capabilityBadge(model.specifications.openWeights) },
                ].map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-xl border border-[#352b24] bg-[#181310] p-4 flex flex-col justify-between"
                  >
                    <p className="text-xs font-mono uppercase text-[#8e7b6d]">
                      {spec.label}
                    </p>
                    <div className="mt-2">{spec.value}</div>
                  </div>
                ))}
              </div>

              {/* Modalities */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#352b24] bg-[#181310] p-4 font-mono text-xs">
                  <p className="uppercase text-[#8e7b6d]">Input Modalities</p>
                  <p className="mt-1 font-semibold text-[#f5ece5]">
                    {model.specifications.inputModalities.join(", ") || "Text"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#352b24] bg-[#181310] p-4 font-mono text-xs">
                  <p className="uppercase text-[#8e7b6d]">Output Modalities</p>
                  <p className="mt-1 font-semibold text-[#f5ece5]">
                    {model.specifications.outputModalities.join(", ") || "Text"}
                  </p>
                </div>
              </div>
            </section>

            {/* Benchmarks Section */}
            {model.benchmarks.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-[#f5ece5]">
                  Verified Evaluation Benchmarks
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {model.benchmarks.map((bench) => (
                    <div
                      key={`${bench.benchmark.name}-${bench.evaluatedAt}`}
                      className="rounded-xl border border-[#352b24] bg-[#181310] p-4 font-mono"
                    >
                      <p className="text-xs text-[#8e7b6d] uppercase">{bench.benchmark.category}</p>
                      <h4 className="font-bold text-sm text-[#f5ece5] mt-1 font-sans">{bench.benchmark.name}</h4>
                      <p className="mt-2 text-xl font-bold text-[#e58a3c]">
                        {bench.score}{" "}
                        <span className="text-xs text-[#8e7b6d] font-normal font-sans">
                          {bench.benchmark.metricName}
                        </span>
                      </p>
                      <a
                        href={bench.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-[11px] text-[#e58a3c] hover:underline"
                      >
                        Source: {bench.sourceName} ↗
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Provenance Card */}
            <div className="rounded-2xl border border-[#352b24] bg-[#140f0c] p-5 font-mono text-xs text-[#8e7b6d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[#c8b6a6]">Data Provenance:</span> Last synchronized{" "}
                {model.provenance.lastSyncedAt
                  ? new Date(model.provenance.lastSyncedAt).toLocaleString()
                  : "Recently"}
              </div>
              {model.provenance.sourceUrl && (
                <a
                  href={model.provenance.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#e58a3c] hover:text-[#f59e0b] hover:underline"
                >
                  Inspect Upstream Source ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Warm Roasted Footer */}
      <footer className="border-t border-[#352b24] bg-[#140f0c] px-6 py-8 mt-16 text-center text-xs text-[#8e7b6d] font-mono">
        <p>OneAtlas · The Architectural AI Model Observatory</p>
      </footer>
    </main>
  );
}

export default function ModelDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#110d0b] p-12 text-[#8e7b6d] font-mono text-sm">
          Loading model observatory telemetry...
        </div>
      }
    >
      <ModelDetailContent />
    </Suspense>
  );
}
