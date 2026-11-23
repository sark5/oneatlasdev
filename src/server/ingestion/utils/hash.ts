import { createHash } from "node:crypto";

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const object = value as Record<string, unknown>;

  const keys = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort();

  const entries = keys.map((key) => {
    return (
      `${JSON.stringify(key)}:` +
      stableStringify(object[key])
    );
  });

  return `{${entries.join(",")}}`;
}

export function createContentHash(
  payload: unknown
): string {
  return createHash("sha256")
    .update(stableStringify(payload), "utf8")
    .digest("hex");
}
