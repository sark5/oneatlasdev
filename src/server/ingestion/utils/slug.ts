const CANONICAL_ALIASES: Record<string, string> = {
  // Verified source-specific mappings
  "tencent/hy4": "tencent-hy4-20261104",
  "claude-fable-5-2": "anthropic-claude-fable-5-2-20261109",
  "anthropic.claude-fable-5-2": "anthropic-claude-fable-5-2-20261109",
  "minimax/MiniMax-M3.1-Flash": "minimax-minimax-m3-1-flash-20261019",
  "aiand/motif-technologies/motif-3": "motif-technologies-motif-3",
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function canonicalModelSlug(
  externalId: string
): string {
  const override = CANONICAL_ALIASES[externalId];
  if (override) {
    return override;
  }
  return slugify(externalId);
}
