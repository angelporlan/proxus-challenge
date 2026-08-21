import { describe, expect, it } from "vitest";
import { InvalidRequest, ResourceNotFound, ServiceFailure, TutorUnavailable } from "@proxus/shared";
import { httpStatusForError, mapDomainErrorToHttp } from "./http-errors.ts";

describe("mapDomainErrorToHttp", () => {
  it("maps missing resources to 404 ResourceNotFound", () => {
    const error = mapDomainErrorToHttp({ _tag: "MaterialNotFound", materialId: "mat-1" });
    expect(error).toEqual(new ResourceNotFound({ message: "Material not found: mat-1" }));
    expect(httpStatusForError(error)).toBe(404);
  });

  it("maps semantic domain errors to 400 InvalidRequest", () => {
    expect(mapDomainErrorToHttp({ _tag: "InvalidPageRange", reason: "page 99 > 12" })).toEqual(
      new InvalidRequest({ message: "Invalid page range: page 99 > 12" })
    );
  });

  it("maps model failures to 503 TutorUnavailable", () => {
    const error = mapDomainErrorToHttp({ _tag: "GeminiConfigError", reason: "Missing API key" });
    expect(error).toEqual(new TutorUnavailable({ message: "Missing API key" }));
    expect(httpStatusForError(error)).toBe(503);
  });

  it("maps storage failures to typed 500 ServiceFailure", () => {
    const error = mapDomainErrorToHttp({ _tag: "MaterialRepositoryError", reason: "disk" });
    expect(error).toEqual(new ServiceFailure({ message: "disk" }));
    expect(httpStatusForError(error)).toBe(500);
  });
});
