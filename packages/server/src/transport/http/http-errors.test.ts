import { describe, expect, it } from "vitest";
import { InvalidRequest, ResourceNotFound } from "@proxus/shared";
import { mapDomainErrorToHttp } from "./http-errors.ts";

describe("mapDomainErrorToHttp", () => {
  it("maps missing resources to 404 ResourceNotFound", () => {
    expect(mapDomainErrorToHttp({ _tag: "MaterialNotFound", materialId: "mat-1" })).toEqual(
      new ResourceNotFound({ message: "Material not found: mat-1" })
    );
    expect(mapDomainErrorToHttp({ _tag: "ArtifactNotFound", artifactId: "art-1" })).toEqual(
      new ResourceNotFound({ message: "Artifact not found: art-1" })
    );
    expect(mapDomainErrorToHttp({ _tag: "GapNotFound", gapId: "gap-1" })).toEqual(
      new ResourceNotFound({ message: "Knowledge gap not found: gap-1" })
    );
  });

  it("maps semantic domain errors to 400 InvalidRequest", () => {
    expect(mapDomainErrorToHttp({ _tag: "InvalidPageRange", reason: "page 99 > 12" })).toEqual(
      new InvalidRequest({ message: "Invalid page range: page 99 > 12" })
    );
    expect(
      mapDomainErrorToHttp({ _tag: "ArtifactTypeMismatch", expected: "quiz", actual: "note" })
    ).toEqual(new InvalidRequest({ message: "Artifact type mismatch: expected quiz, got note" }));
  });

  it("leaves unexpected failures unmapped so they stay 500", () => {
    expect(mapDomainErrorToHttp({ _tag: "MaterialRepositoryError", reason: "disk" })).toBeUndefined();
    expect(mapDomainErrorToHttp(new Error("boom"))).toBeUndefined();
  });
});
