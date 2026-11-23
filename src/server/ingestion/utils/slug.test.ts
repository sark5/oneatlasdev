import { describe, expect, it } from "vitest";
import {
  slugify,
  canonicalModelSlug,
} from "./slug";

describe("slugify", () => {
  it("normalizes model identifiers", () => {
    expect(slugify("OpenAI/GPT-4"))
      .toBe("openai-gpt-4");
  });

  it("removes leading and trailing separators", () => {
    expect(slugify(" Claude Sonnet "))
      .toBe("claude-sonnet");
  });
});

describe("canonicalModelSlug", () => {
  it("creates deterministic canonical slugs", () => {
    expect(
      canonicalModelSlug("openai/gpt-4")
    ).toBe("openai-gpt-4");
  });
});
