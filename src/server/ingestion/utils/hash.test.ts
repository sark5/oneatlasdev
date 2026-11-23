import { describe, expect, it } from "vitest";
import { createContentHash } from "./hash";

describe("createContentHash", () => {
  it("returns the same hash regardless of object key order", () => {
    const first = {
      name: "GPT",
      pricing: { input: 1, output: 2 },
    };
    const second = {
      pricing: { output: 2, input: 1 },
      name: "GPT",
    };

    expect(createContentHash(first)).toBe(
      createContentHash(second)
    );
  });

  it("returns different hashes for changed content", () => {
    expect(
      createContentHash({ price: 1 })
    ).not.toBe(
      createContentHash({ price: 2 })
    );
  });

  it("returns a SHA-256 hexadecimal hash", () => {
    expect(createContentHash({ test: true }))
      .toMatch(/^[a-f0-9]{64}$/);
  });
});
