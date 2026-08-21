import { describe, it, expect } from "vitest";
import { decodeBase64 } from "./handlers.ts";

describe("decodeBase64", () => {
  it("decodes a plain base64 string", () => {
    const input = "SGVsbG8gd29ybGQ="; // "Hello world"
    const result = decodeBase64(input);
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello world");
  });

  it("decodes a data URL format string", () => {
    const input = "data:application/pdf;base64,SGVsbG8gd29ybGQ=";
    const result = decodeBase64(input);
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello world");
  });
});
