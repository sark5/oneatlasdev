import { describe, expect, it } from "vitest";
import {
  parseModelQuery,
  parseDirectoryQuery,
  parseComparisonQuery,
} from "./query.schema";

describe("Model query validation", () => {
  it("uses safe default pagination", () => {
    const result = parseModelQuery(new URLSearchParams());

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sort).toBe("name");
    expect(result.hideDeprecated).toBe(true);
  });

  it("parses model search", () => {
    const result = parseModelQuery(
      new URLSearchParams("q=claude&type=CHAT&sort=inputPrice")
    );

    expect(result.q).toBe("claude");
    expect(result.type).toBe("CHAT");
    expect(result.sort).toBe("inputPrice");
  });

  it("parses boolean query parameters correctly", () => {
    const result = parseModelQuery(
      new URLSearchParams("reasoning=true&toolCalling=false")
    );

    expect(result.reasoning).toBe(true);
    expect(result.toolCalling).toBe(false);
  });

  it("supports repeated modalities", () => {
    const result = parseModelQuery(
      new URLSearchParams("modality=text&modality=image")
    );

    expect(result.modalities).toEqual(["text", "image"]);
  });

  it("rejects invalid page numbers", () => {
    expect(() =>
      parseModelQuery(new URLSearchParams("page=-2"))
    ).toThrow();
  });

  it("rejects pagination above 100", () => {
    expect(() =>
      parseModelQuery(new URLSearchParams("limit=101"))
    ).toThrow();
  });

  it("rejects unsupported sort fields", () => {
    expect(() =>
      parseModelQuery(new URLSearchParams("sort=unknown"))
    ).toThrow();
  });

  it("rejects malformed decimal prices", () => {
    expect(() =>
      parseModelQuery(
        new URLSearchParams("maxInputPrice=abc")
      )
    ).toThrow();
  });
});

describe("Directory query validation", () => {
  it("uses default pagination", () => {
    const result = parseDirectoryQuery(
      new URLSearchParams()
    );

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe("Comparison validation", () => {
  it("accepts two unique model slugs", () => {
    const result = parseComparisonQuery(
      new URLSearchParams("models=gpt-4,claude-sonnet")
    );

    expect(result.models).toHaveLength(2);
  });

  it("rejects duplicate models", () => {
    expect(() =>
      parseComparisonQuery(
        new URLSearchParams("models=gpt-4,gpt-4")
      )
    ).toThrow();
  });

  it("rejects only one model", () => {
    expect(() =>
      parseComparisonQuery(
        new URLSearchParams("models=gpt-4")
      )
    ).toThrow();
  });

  it("rejects more than four models", () => {
    expect(() =>
      parseComparisonQuery(
        new URLSearchParams("models=a,b,c,d,e")
      )
    ).toThrow();
  });
});
