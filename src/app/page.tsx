"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

interface Model {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  modelType: string;
  maxContextWindow: number | null;
  minInputPricePer1m: string | null;
  minOutputPricePer1m: string | null;
  activeEndpointCount: number;
  reasoning: boolean | null;
  toolCalling: boolean | null;
  structuredOutput: boolean | null;
  openWeights: boolean | null;
  lab: {
    slug: string;
    name: string;
  } | null;
}

interface ApiResponse {
  success: boolean;
  data: Model[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    message: string;
  };
}

function formatPrice(value: string | null): string {
  if (value === null) return "Unknown";
  const num = Number(value);
  if (num === 0) return "$0.00";
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [models, setModels] = useState<Model[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCapability, setActiveCapability] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [monthlyVolumeM, setMonthlyVolumeM] = useState<number>(10);
  const [showCostSimulator, setShowCostSimulator] = useState<boolean>(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("model-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "24",
          sort: "name",
          order: "asc",
        });

        if (query.trim()) {
          params.set("q", query.trim());
        }

        if (activeCapability === "REASONING") params.set("reasoning", "true");
        if (activeCapability === "TOOL_CALLING") params.set("toolCalling", "true");
        if (activeCapability === "STRUCTURED") params.set("structuredOutput", "true");
        if (activeCapability === "OPEN_WEIGHTS") params.set("openWeights", "true");
        if (activeCapability === "VISION") params.append("modality", "image");

        const response = await fetch(`/api/v1/models?${params.toString()}`, {
          signal: controller.signal,
        });

        const result: ApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message ?? "Unable to load models.");
        }

        setModels(result.data);
        setTotal(result.pagination?.total ?? 0);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred loading model data."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, activeCapability]);

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 4
        ? [...prev, slug]
        : prev
    );
  };

  const calculateMonthlyCost = (inputPrice: string | null, outputPrice: string | null) => {
    if (!inputPrice && !outputPrice) return null;
    const inP = inputPrice ? Number(inputPrice) : 0;
    const outP = outputPrice ? Number(outputPrice) : 0;
    // Assuming 75% input, 25% output volume split for typical apps
    const cost = (inP * (monthlyVolumeM * 0.75)) + (outP * (monthlyVolumeM * 0.25));
    return `$${cost.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  };

  return (
    <main className="min-h-screen bg-[#110d0b] text-[#f5ece5] flex flex-col selection:bg-[#e58a3c]/30 selection:text-white">
      {/* Precision Observatory Header */}
      <header className="border-b border-[#352b24] bg-[#181310]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e58a3c]/15 border border-[#e58a3c]/40 text-[#f59e0b] font-mono text-sm font-bold shadow-sm shadow-[#e58a3c]/10">
                Ω
              </span>
              <span className="text-xl font-bold tracking-tight text-[#f5ece5] group-hover:text-white transition">
                OneAtlas<span className="text-[#e58a3c]">.</span>
              </span>
            </Link>

            {/* Live Database Heartbeat Pill */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#352b24] bg-[#201915] px-3 py-1 text-xs text-[#c8b6a6]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[#8e7b6d]">PostgreSQL Telemetry Live</span>
            </div>
          </div>

          <nav className="flex items-center gap-5 text-sm font-medium text-[#c8b6a6]">
            <Link
              href="/"
              className="text-[#f5ece5] border-b-2 border-[#e58a3c] pb-0.5"
            >
              Observatory
            </Link>
            <Link
              href="/docs"
              className="hover:text-white transition"
            >
              API Reference
            </Link>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#352b24] bg-[#201915] px-3 py-1.5 text-xs text-[#c8b6a6] hover:border-[#e58a3c]/50 hover:text-white transition"
            >
              <span className="font-mono text-[#e58a3c]">3.1</span> OpenAPI JSON
            </a>
          </nav>
        </div>
      </header>

      {/* Main Observatory Workspace */}
      <div className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        {/* Editorial Hero Intro */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#e58a3c]">
              Catalog & Arbitrage Terminal
            </span>
            <span className="h-px w-10 bg-[#352b24]" />
            <span className="text-xs text-[#8e7b6d] font-mono">
              Live Provider Intelligence
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5ece5] leading-tight">
            Discover, compare & route{" "}
            <span className="text-[#e58a3c]">frontier AI models.</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#c8b6a6]">
            Transparent per-provider pricing, hardware context limits, verified latency telemetry, and zero-retention compliance across global inference providers.
          </p>
        </div>

        {/* Search & Control Deck */}
        <div className="rounded-2xl border border-[#352b24] bg-[#181310] p-4 sm:p-5 mb-8 shadow-xl shadow-black/20">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input with Hotkey Icon */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8e7b6d]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="model-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search models, labs, or architectures (e.g. Claude 3.5, Gemini, Llama, DeepSeek)..."
                className="w-full rounded-xl border border-[#352b24] bg-[#110d0b] pl-11 pr-14 py-3 text-sm text-[#f5ece5] outline-none transition placeholder:text-[#8e7b6d] focus:border-[#e58a3c] focus:ring-1 focus:ring-[#e58a3c]/30"
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                <kbd className="hidden sm:inline-block rounded border border-[#352b24] bg-[#201915] px-2 py-0.5 text-[11px] font-mono text-[#8e7b6d]">
                  /
                </kbd>
              </div>
            </div>

            {/* View Mode & Cost Simulator Controls */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowCostSimulator(!showCostSimulator)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition ${
                  showCostSimulator
                    ? "border-[#e58a3c] bg-[#e58a3c]/15 text-[#f59e0b]"
                    : "border-[#352b24] bg-[#110d0b] text-[#c8b6a6] hover:border-[#4e3f35] hover:text-white"
                }`}
              >
                <span className="font-mono">🧮</span>
                <span>Simulator</span>
              </button>

              <div className="flex items-center rounded-xl border border-[#352b24] bg-[#110d0b] p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                    viewMode === "grid"
                      ? "bg-[#29201b] text-white shadow"
                      : "text-[#8e7b6d] hover:text-[#c8b6a6]"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                    viewMode === "table"
                      ? "bg-[#29201b] text-white shadow"
                      : "text-[#8e7b6d] hover:text-[#c8b6a6]"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Token Volume Simulator Slider */}
          {showCostSimulator && (
            <div className="mt-4 pt-4 border-t border-[#352b24] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#140f0c] p-3 rounded-xl border border-[#352b24]/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#e58a3c] font-semibold uppercase">
                  Monthly Run Rate Simulator:
                </span>
                <span className="text-xs text-[#c8b6a6]">
                  Assumes 75% input / 25% output ratio.
                </span>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={monthlyVolumeM}
                  onChange={(e) => setMonthlyVolumeM(Number(e.target.value))}
                  className="w-48 accent-[#e58a3c] cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-[#f59e0b] min-w-24">
                  {monthlyVolumeM}M tokens/mo
                </span>
              </div>
            </div>
          )}

          {/* Capability Quick-Filter Tabs */}
          <div className="mt-4 pt-4 border-t border-[#352b24] flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8e7b6d] mr-2">
              Capabilities:
            </span>
            {[
              { id: "ALL", label: "All Models" },
              { id: "REASONING", label: "Reasoning" },
              { id: "TOOL_CALLING", label: "Tool Calling" },
              { id: "STRUCTURED", label: "Structured Output" },
              { id: "VISION", label: "Vision / Multimodal" },
              { id: "OPEN_WEIGHTS", label: "Open Weights" },
            ].map((cap) => (
              <button
                key={cap.id}
                onClick={() => {
                  setActiveCapability(cap.id);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeCapability === cap.id
                    ? "bg-[#e58a3c]/20 border border-[#e58a3c]/50 text-[#f59e0b]"
                    : "bg-[#110d0b] border border-[#352b24] text-[#8e7b6d] hover:text-[#c8b6a6] hover:border-[#4e3f35]"
                }`}
              >
                {cap.label}
              </button>
            ))}
          </div>
        </div>

        {/* Header Count & Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#f5ece5]">
              Frontier Models
            </h2>
            <span className="rounded-full bg-[#241e1a] border border-[#352b24] px-2.5 py-0.5 text-xs font-mono text-[#c8b6a6]">
              {total} verified
            </span>
          </div>

          <div className="text-xs font-mono text-[#8e7b6d]">
            Showing {(page - 1) * 24 + 1}–{Math.min(page * 24, total)} of {total}
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#e58a3c] border-t-transparent" />
            <p className="mt-4 text-sm font-mono text-[#c8b6a6]">
              Reading model telemetry from PostgreSQL...
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-900/50 bg-red-950/20 p-6 text-red-200 mb-8"
          >
            <p className="font-semibold text-sm">Failed to retrieve catalogue data</p>
            <p className="text-xs mt-1 text-red-300/80">{error}</p>
          </div>
        )}

        {!loading && !error && models.length === 0 && (
          <div className="rounded-2xl border border-[#352b24] bg-[#181310] p-16 text-center">
            <p className="text-base text-[#f5ece5] font-semibold">No AI models found matching your query</p>
            <p className="text-sm text-[#8e7b6d] mt-1">Try adjusting keywords, capability filters, or resetting search.</p>
            <button
              onClick={() => {
                setQuery("");
                setActiveCapability("ALL");
              }}
              className="mt-4 rounded-xl border border-[#352b24] bg-[#241e1a] px-4 py-2 text-xs font-medium text-[#c8b6a6] hover:text-white hover:border-[#e58a3c]/50 transition"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* VIEW MODE: GRID */}
        {!loading && !error && viewMode === "grid" && models.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => {
              const isSelected = compareSlugs.includes(model.slug);
              const monthlyBill = showCostSimulator
                ? calculateMonthlyCost(model.minInputPricePer1m, model.minOutputPricePer1m)
                : null;

              return (
                <div
                  key={model.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-[#181310] p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#e58a3c]/5 ${
                    isSelected
                      ? "border-[#e58a3c] ring-1 ring-[#e58a3c]/30"
                      : "border-[#352b24] hover:border-[#4e3f35]"
                  }`}
                >
                  <div>
                    {/* Header: Lab & Comparison Pin */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-mono font-medium text-[#e58a3c] uppercase tracking-wider">
                        {model.lab?.name ?? "Independent Lab"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleCompare(model.slug);
                        }}
                        title={isSelected ? "Remove from comparison" : "Pin for comparison"}
                        className={`rounded-md border p-1 text-[11px] font-mono transition ${
                          isSelected
                            ? "bg-[#e58a3c] border-[#e58a3c] text-black font-bold"
                            : "border-[#352b24] text-[#8e7b6d] hover:text-[#c8b6a6] hover:border-[#4e3f35]"
                        }`}
                      >
                        {isSelected ? "Pinned ✓" : "+ Compare"}
                      </button>
                    </div>

                    {/* Model Name */}
                    <Link
                      href={`/models/${encodeURIComponent(model.slug)}`}
                      className="block group-hover:text-[#f59e0b] transition"
                    >
                      <h3 className="font-bold text-lg text-[#f5ece5] leading-snug">
                        {model.name}
                      </h3>
                    </Link>

                    {/* Model Description */}
                    <p className="mt-2 text-xs text-[#c8b6a6] line-clamp-2 leading-relaxed min-h-[32px]">
                      {model.description ?? "Canonical model entry with multi-provider hosting records."}
                    </p>

                    {/* Capability Badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-[#241e1a] border border-[#352b24] px-2 py-0.5 text-[11px] font-mono text-[#c8b6a6]">
                        {model.modelType}
                      </span>
                      {model.reasoning && (
                        <span className="rounded-md bg-purple-950/40 border border-purple-800/40 px-2 py-0.5 text-[11px] font-mono text-purple-300">
                          Reasoning
                        </span>
                      )}
                      {model.toolCalling && (
                        <span className="rounded-md bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 text-[11px] font-mono text-blue-300">
                          Tools
                        </span>
                      )}
                      {model.openWeights && (
                        <span className="rounded-md bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                          Open Weights
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Telemetry Footer */}
                  <div className="mt-5 border-t border-[#352b24] pt-4">
                    {showCostSimulator && monthlyBill ? (
                      <div className="mb-3 rounded-xl bg-[#201915] border border-[#e58a3c]/30 p-2.5 text-center">
                        <p className="text-[11px] font-mono uppercase text-[#e58a3c]">
                          Est. Bill @ {monthlyVolumeM}M tokens
                        </p>
                        <p className="text-base font-mono font-bold text-[#f5ece5]">
                          {monthlyBill} <span className="text-xs text-[#8e7b6d] font-normal">/ mo</span>
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="rounded-lg bg-[#110d0b] border border-[#352b24]/60 p-2">
                          <p className="text-[10px] font-mono uppercase text-[#8e7b6d]">
                            Input / 1M
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-semibold text-[#f5ece5]">
                            {formatPrice(model.minInputPricePer1m)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#110d0b] border border-[#352b24]/60 p-2">
                          <p className="text-[10px] font-mono uppercase text-[#8e7b6d]">
                            Output / 1M
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-semibold text-[#f5ece5]">
                            {formatPrice(model.minOutputPricePer1m)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[#8e7b6d] font-mono">
                      <span>
                        {model.maxContextWindow
                          ? `${(model.maxContextWindow / 1000).toLocaleString()}k ctx`
                          : "Ctx unk"}
                      </span>
                      <span className="flex items-center gap-1 text-[#c8b6a6]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {model.activeEndpointCount} provider{model.activeEndpointCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW MODE: TABLE (Dense Matrix for Power Users) */}
        {!loading && !error && viewMode === "table" && models.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#352b24] bg-[#181310]">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="bg-[#110d0b] text-[#8e7b6d] font-mono uppercase border-b border-[#352b24]">
                <tr>
                  <th className="p-3.5 pl-4">Model</th>
                  <th className="p-3.5">Lab</th>
                  <th className="p-3.5">Context</th>
                  <th className="p-3.5">Input / 1M</th>
                  <th className="p-3.5">Output / 1M</th>
                  {showCostSimulator && <th className="p-3.5 text-[#e58a3c]">Est. / Mo</th>}
                  <th className="p-3.5">Providers</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#352b24]/60 font-mono">
                {models.map((model) => {
                  const isSelected = compareSlugs.includes(model.slug);
                  const monthlyBill = calculateMonthlyCost(
                    model.minInputPricePer1m,
                    model.minOutputPricePer1m
                  );

                  return (
                    <tr
                      key={model.id}
                      className={`hover:bg-[#201915] transition ${
                        isSelected ? "bg-[#241e1a]" : ""
                      }`}
                    >
                      <td className="p-3.5 pl-4">
                        <Link
                          href={`/models/${encodeURIComponent(model.slug)}`}
                          className="font-bold text-[#f5ece5] hover:text-[#f59e0b] font-sans text-sm"
                        >
                          {model.name}
                        </Link>
                        <div className="text-[11px] text-[#8e7b6d]">{model.modelType}</div>
                      </td>
                      <td className="p-3.5 text-[#c8b6a6]">
                        {model.lab?.name ?? "—"}
                      </td>
                      <td className="p-3.5 text-[#f5ece5]">
                        {model.maxContextWindow
                          ? `${model.maxContextWindow.toLocaleString()} tokens`
                          : "Unknown"}
                      </td>
                      <td className="p-3.5 text-[#f5ece5]">
                        {formatPrice(model.minInputPricePer1m)}
                      </td>
                      <td className="p-3.5 text-[#f5ece5]">
                        {formatPrice(model.minOutputPricePer1m)}
                      </td>
                      {showCostSimulator && (
                        <td className="p-3.5 text-[#e58a3c] font-bold">
                          {monthlyBill ?? "—"}
                        </td>
                      )}
                      <td className="p-3.5 text-[#c8b6a6]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {model.activeEndpointCount} hosts
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleCompare(model.slug)}
                          className={`rounded px-2 py-1 text-[11px] transition ${
                            isSelected
                              ? "bg-[#e58a3c] text-black font-bold"
                              : "border border-[#352b24] text-[#8e7b6d] hover:text-[#c8b6a6] hover:border-[#4e3f35]"
                          }`}
                        >
                          {isSelected ? "Pinned" : "Compare"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Navigation */}
        {!loading && !error && total > 24 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-[#352b24] bg-[#181310] px-4 py-2 text-xs font-mono font-medium text-[#c8b6a6] disabled:opacity-30 hover:border-[#e58a3c] hover:text-white transition"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 text-xs font-mono text-[#8e7b6d]">
              Page {page} of {Math.ceil(total / 24)}
            </span>
            <button
              disabled={page >= Math.ceil(total / 24)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-[#352b24] bg-[#181310] px-4 py-2 text-xs font-mono font-medium text-[#c8b6a6] disabled:opacity-30 hover:border-[#e58a3c] hover:text-white transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Sticky Bottom Comparison Dock (When models are pinned) */}
      {compareSlugs.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-2xl px-4 z-40">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e58a3c]/60 bg-[#181310]/95 backdrop-blur-md p-3.5 shadow-2xl shadow-black/80">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-mono font-bold text-[#e58a3c] uppercase pl-1">
                Comparing ({compareSlugs.length}/4):
              </span>
              {compareSlugs.map((slug) => (
                <span
                  key={slug}
                  className="flex items-center gap-1 rounded-lg border border-[#352b24] bg-[#110d0b] px-2 py-1 text-xs text-[#f5ece5] font-mono"
                >
                  <span className="max-w-[120px] truncate">{slug}</span>
                  <button
                    onClick={() => toggleCompare(slug)}
                    className="text-[#8e7b6d] hover:text-white ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareSlugs([])}
                className="text-xs text-[#8e7b6d] hover:text-[#c8b6a6] px-2 py-1 font-mono"
              >
                Clear
              </button>
              {compareSlugs.length >= 2 ? (
                <Link
                  href={`/api/v1/compare?models=${encodeURIComponent(compareSlugs.join(","))}`}
                  target="_blank"
                  className="rounded-xl bg-[#e58a3c] hover:bg-[#f59e0b] px-4 py-2 text-xs font-mono font-bold text-black shadow-md shadow-[#e58a3c]/20 transition"
                >
                  Inspect Diff →
                </Link>
              ) : (
                <span className="text-[11px] text-[#8e7b6d] font-mono">
                  Pick ≥ 2
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warm Roasted Footer */}
      <footer className="border-t border-[#352b24] bg-[#140f0c] px-6 py-8 mt-16 text-center text-xs text-[#8e7b6d] font-mono">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>OneAtlas · The Architectural AI Model Observatory</p>
          <div className="flex items-center gap-4 text-[#c8b6a6]">
            <Link href="/docs" className="hover:text-white transition">Docs</Link>
            <Link href="/api/v1/openapi.json" target="_blank" className="hover:text-white transition">OpenAPI</Link>
            <Link href="/api/v1/health" target="_blank" className="hover:text-white transition">Health</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
