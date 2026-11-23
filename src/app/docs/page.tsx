import Link from "next/link";

const endpoints = [
  ["GET", "/api/v1/health", "Database connectivity & ingestion freshness audit"],
  ["GET", "/api/v1/models", "Multi-parameter model search, filtering and pagination"],
  ["GET", "/api/v1/models/[slug]", "Deep specifications, provider pricing, and benchmark scores"],
  ["GET", "/api/v1/models/facets", "Catalogue facet breakdown across labs, modalities & capabilities"],
  ["GET", "/api/v1/compare", "Side-by-side comparison of 2–4 models across hosting providers"],
  ["GET", "/api/v1/rankings", "Leaderboards ranked by input price, output price, context, or benchmark"],
  ["GET", "/api/v1/labs", "AI research lab directory and canonical portfolio"],
  ["GET", "/api/v1/labs/[slug]", "Individual AI research lab profile and models"],
  ["GET", "/api/v1/providers", "Hosting inference provider directory"],
  ["GET", "/api/v1/providers/[slug]", "Provider details and hosted model endpoints"],
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[#110d0b] text-[#f5ece5] flex flex-col selection:bg-[#e58a3c]/30 selection:text-white">
      {/* Precision Header */}
      <header className="border-b border-[#352b24] bg-[#181310]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
            <Link href="/docs" className="text-[#f5ece5] border-b-2 border-[#e58a3c] pb-0.5">
              API Reference
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12 flex-1 w-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#e58a3c]">
            Developer Documentation
          </span>
          <span className="h-px w-8 bg-[#352b24]" />
          <span className="text-xs text-[#8e7b6d] font-mono">v1 REST API</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#f5ece5] tracking-tight">
          OneAtlas API Reference
        </h1>

        <p className="mt-4 max-w-2xl text-base text-[#c8b6a6] leading-relaxed">
          Access normalized model specifications, compare provider endpoints, inspect pricing arbitrage, and explore AI research labs through the OneAtlas REST API.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#e58a3c] hover:bg-[#f59e0b] px-5 py-2.5 font-mono text-xs font-bold text-black shadow-md shadow-[#e58a3c]/20 transition"
          >
            <span>OpenAPI 3.1 JSON Specification</span>
            <span>↗</span>
          </a>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[#352b24] bg-[#181310] hover:border-[#4e3f35] px-5 py-2.5 font-mono text-xs text-[#c8b6a6] hover:text-white transition"
          >
            ← Open Interactive Observatory
          </Link>
        </div>

        {/* Endpoints Table */}
        <h2 className="mt-14 text-xl font-bold text-[#f5ece5] flex items-center gap-2">
          <span>Route Inventory</span>
          <span className="rounded-full bg-[#241e1a] border border-[#352b24] px-2 py-0.5 text-xs font-mono text-[#c8b6a6]">
            10 routes
          </span>
        </h2>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#352b24] bg-[#181310] shadow-lg shadow-black/20">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-[#110d0b] text-[#8e7b6d] uppercase font-mono border-b border-[#352b24]">
              <tr>
                <th className="p-4 pl-5">Method</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4 pr-5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#352b24]/60">
              {endpoints.map(([method, path, description]) => (
                <tr key={path} className="hover:bg-[#201915] transition">
                  <td className="p-4 pl-5 font-mono font-bold text-emerald-400">
                    {method}
                  </td>
                  <td className="p-4 font-mono font-semibold text-[#f59e0b]">
                    {path}
                  </td>
                  <td className="p-4 pr-5 text-[#c8b6a6] font-sans">
                    {description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Example Requests in Coffee Code Blocks */}
        <h2 className="mt-14 text-xl font-bold text-[#f5ece5]">
          Example cURL Requests
        </h2>

        <div className="mt-4 space-y-3 font-mono text-xs">
          {[
            {
              title: "Discover frontier models with search query",
              cmd: "curl -s 'https://YOUR_DOMAIN/api/v1/models?q=claude&limit=10'",
            },
            {
              title: "Filter by capability and maximum input price",
              cmd: "curl -s 'https://YOUR_DOMAIN/api/v1/models?type=CHAT&reasoning=true&maxInputPrice=3'",
            },
            {
              title: "Retrieve model rankings by cheapest input price",
              cmd: "curl -s 'https://YOUR_DOMAIN/api/v1/rankings?metric=inputPrice&limit=10'",
            },
            {
              title: "Compare 2 to 4 models across providers",
              cmd: "curl -s 'https://YOUR_DOMAIN/api/v1/compare?models=anthropic-claude-3-5-sonnet,deepseek-deepseek-chat'",
            },
            {
              title: "Database health and data freshness audit",
              cmd: "curl -s 'https://YOUR_DOMAIN/api/v1/health'",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#352b24] bg-[#140f0c] p-4 overflow-hidden"
            >
              <p className="text-[#8e7b6d] font-sans text-xs mb-2">
                # {item.title}
              </p>
              <pre className="overflow-x-auto text-[#f5ece5] bg-[#0c0908] p-3 rounded-lg border border-[#2b221d]">
                <code>{item.cmd}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Warm Roasted Footer */}
      <footer className="border-t border-[#352b24] bg-[#140f0c] px-6 py-8 mt-16 text-center text-xs text-[#8e7b6d] font-mono">
        <p>OneAtlas · The Architectural AI Model Observatory</p>
      </footer>
    </main>
  );
}
