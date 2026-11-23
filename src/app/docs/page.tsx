import Link from "next/link";

const endpoints = [
  ["GET", "/api/v1/health", "Database connectivity"],
  ["GET", "/api/v1/models", "Search, filtering and pagination"],
  ["GET", "/api/v1/models/[slug]", "Model specifications and endpoints"],
  ["GET", "/api/v1/models/facets", "Catalogue facet counts"],
  ["GET", "/api/v1/compare", "Compare two to four models"],
  ["GET", "/api/v1/rankings", "Model rankings and benchmark leaderboards"],
  ["GET", "/api/v1/labs", "AI labs directory"],
  ["GET", "/api/v1/labs/[slug]", "AI lab details"],
  ["GET", "/api/v1/providers", "Provider directory"],
  ["GET", "/api/v1/providers/[slug]", "Provider details"],
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="text-xl font-bold">
            OneAtlas<span className="text-blue-400">.</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-sm uppercase tracking-widest text-blue-400">
          Developer Documentation
        </p>

        <h1 className="mt-4 text-4xl font-bold">
          OneAtlas API v1
        </h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Discover models, inspect provider listings,
          compare pricing and explore AI research labs
          through the OneAtlas REST API.
        </p>

        <div className="mt-8">
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500"
          >
            View OpenAPI JSON
          </a>
        </div>

        <h2 className="mt-14 text-2xl font-semibold">
          Available endpoints
        </h2>

        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="p-4">Method</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4">Description</th>
              </tr>
            </thead>

            <tbody>
              {endpoints.map(([method, path, description]) => (
                <tr
                  key={path}
                  className="border-t border-white/10"
                >
                  <td className="p-4 font-semibold text-green-400">
                    {method}
                  </td>

                  <td className="p-4 font-mono text-blue-300">
                    {path}
                  </td>

                  <td className="p-4 text-slate-400">
                    {description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-14 text-2xl font-semibold">
          Example requests
        </h2>

        <div className="mt-5 space-y-4">
          {[
            "GET /api/v1/models?limit=20",
            "GET /api/v1/models?q=claude",
            "GET /api/v1/models?sort=inputPrice&order=asc",
            "GET /api/v1/models?type=CHAT&minContext=128000",
            "GET /api/v1/compare?models=model-a,model-b",
            "GET /api/v1/rankings?metric=inputPrice&limit=10",
          ].map((example) => (
            <pre
              key={example}
              className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-blue-200"
            >
              {example}
            </pre>
          ))}
        </div>

        <div className="mt-12">
          <Link href="/" className="text-blue-400 underline">
            ← Explore the model catalogue
          </Link>
        </div>
      </section>
    </main>
  );
}
