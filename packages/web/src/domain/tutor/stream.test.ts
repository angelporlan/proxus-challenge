import { describe, expect, it } from "vitest";
import { tutorStreamFailureMessage } from "./stream.ts";

describe("tutorStreamFailureMessage", () => {
  it("prefers the JSON message from typed HTTP errors", () => {
    expect(
      tutorStreamFailureMessage(503, JSON.stringify({ _tag: "TutorUnavailable", message: "Missing API key" }))
    ).toBe("Missing API key");
  });

  it("falls back to the raw body or status when JSON is absent", () => {
    expect(tutorStreamFailureMessage(500, "  ")).toBe("Tutor request failed (500)");
    expect(tutorStreamFailureMessage(400, "not-json")).toBe("not-json");
  });
});
