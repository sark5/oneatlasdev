import { describe, expect, it } from "vitest";
import {
  perTokenToPerMillion,
  secondsToMilliseconds,
} from "./decimal";

describe("perTokenToPerMillion", () => {
  it("converts decimal token prices", () => {
    expect(
      perTokenToPerMillion("0.0000002")
    ).toBe("0.2000000000");
  });

  it("supports scientific notation", () => {
    expect(
      perTokenToPerMillion("2e-7")
    ).toBe("0.2000000000");
  });

  it("preserves legitimate zero prices", () => {
    expect(
      perTokenToPerMillion("0")
    ).toBe("0.0000000000");
  });

  it("preserves unknown prices", () => {
    expect(
      perTokenToPerMillion(null)
    ).toBeNull();
  });

  it("rejects negative prices", () => {
    expect(() =>
      perTokenToPerMillion("-0.000001")
    ).toThrow();
  });
});

describe("secondsToMilliseconds", () => {
  it("converts seconds into milliseconds", () => {
    expect(
      secondsToMilliseconds(0.25)
    ).toBe("250.000");
  });

  it("preserves unknown latency", () => {
    expect(
      secondsToMilliseconds(null)
    ).toBeNull();
  });
});
