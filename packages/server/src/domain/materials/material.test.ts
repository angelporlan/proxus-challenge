import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { parsePageSelection, InvalidPageRange } from "./material.ts";

describe("parsePageSelection", () => {
  it("parses a single page", () => {
    const result = Effect.runSync(parsePageSelection("5"));
    expect(result).toEqual([5]);
  });

  it("parses a range", () => {
    const result = Effect.runSync(parsePageSelection("3-7"));
    expect(result).toEqual([3, 4, 5, 6, 7]);
  });

  it("parses a mixed selection", () => {
    const result = Effect.runSync(parsePageSelection("1, 3-5, 8"));
    expect(result).toEqual([1, 3, 4, 5, 8]);
  });

  it("fails on invalid input", () => {
    const result = Effect.runSync(Effect.flip(parsePageSelection("abc")));
    expect(result).toBeInstanceOf(InvalidPageRange);
  });

  it("fails on negative numbers", () => {
    const result = Effect.runSync(Effect.flip(parsePageSelection("-5")));
    expect(result).toBeInstanceOf(InvalidPageRange);
  });

  it("fails on reversed range", () => {
    const result = Effect.runSync(Effect.flip(parsePageSelection("5-3")));
    expect(result).toBeInstanceOf(InvalidPageRange);
  });
});
