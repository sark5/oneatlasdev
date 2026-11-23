"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function price(value: string | null): string {
  if (value === null) return "Unknown";

  return `$${Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })}`;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [models, setModels] = useState<Model[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          sort: "name",
          order: "asc",
        });

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(
          `/api/v1/models?${params.toString()}`,
          { signal: controller.signal }
        );

        const result: ApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error?.message ?? "Unable to load models."
          );
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
            : "An unexpected error occurred."
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
  }, [query, page]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold tracking-tight">
            OneAtlas<span className="text-blue-400">.</span>
          </Link>

          <nav className="flex items-center gap-5 text-sm text-slate-300">
            <Link href="/" className="hover:text-white">
              Models
            </Link>
            <Link href="/docs" className="hover:text-white">
              API Docs
            </Link>
            <a
              href="/api/v1/openapi.json"
              className="hover:text-white"
            >
              OpenAPI
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            AI Model Intelligence
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Discover the right
            <span className="block text-blue-400">
              AI model for your work.
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Explore model specifications, compare provider
            pricing and discover AI infrastructure through
            one unified catalogue.
          </p>

          <div className="mt-9">
            <label
              htmlFor="model-search"
              className="sr-only"
            >
              Search AI models
            </label>

            <input
              id="model-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search models, e.g. Claude, Gemini, GPT..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            Model catalogue
          </h2>

          <span className="text-sm text-slate-400">
            {total.toLocaleString()} models
          </span>
        </div>

        {loading && (
          <p className="mt-8 text-slate-400">
            Loading model catalogue...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {!loading && !error && models.length === 0 && (
          <div className="mt-8 rounded-xl border border-white/10 p-8 text-center text-slate-400">
            No models found. Try a different search.
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Link
              key={model.id}
              href={`/models/${encodeURIComponent(model.slug)}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-blue-400/50 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-lg">
                  {model.name}
                </h3>

                <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                  {model.modelType}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {model.lab?.name ?? "Unknown AI lab"}
              </p>

              <p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-400">
                {model.description ?? "No description available."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Input / 1M
                  </p>
                  <p className="mt-1 font-medium">
                    {price(model.minInputPricePer1m)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Output / 1M
                  </p>
                  <p className="mt-1 font-medium">
                    {price(model.minOutputPricePer1m)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-between text-xs text-slate-500">
                <span>
                  {model.maxContextWindow
                    ? `${model.maxContextWindow.toLocaleString()} context`
                    : "Context unknown"}
                </span>

                <span>
                  {model.activeEndpointCount} endpoints
                </span>
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && total > 20 && (
          <div className="mt-8 flex justify-center gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((old) => old - 1)}
              className="rounded-lg border border-white/20 px-5 py-2 disabled:opacity-30"
            >
              Previous
            </button>

            <span className="py-2 text-sm text-slate-400">
              Page {page} of {Math.ceil(total / 20)}
            </span>

            <button
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage((old) => old + 1)}
              className="rounded-lg border border-white/20 px-5 py-2 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        OneAtlas · AI Model Discovery & Intelligence Platform
      </footer>
    </main>
  );
}
