export async function fetchJson(
  url: string,
  headers: Record<string, string> = {},
  retries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      if (attempt === retries) {
        throw new Error("External source request failed");
      }
      await delay(500 * (attempt + 1));
      continue;
    }

    if (response.ok) {
      return response.json();
    }

    const retryable =
      response.status === 429 || response.status >= 500;

    if (!retryable || attempt === retries) {
      throw new Error(
        `External source returned HTTP ${response.status}`
      );
    }

    await delay(500 * (attempt + 1));
  }

  throw new Error("External source request exhausted retries");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
