import { Schema } from "effect";

export class ResourceNotFound extends Schema.TaggedErrorClass<ResourceNotFound>()(
  "ResourceNotFound",
  {
    message: Schema.String
  },
  {
    identifier: "ResourceNotFound",
    description: "The requested resource does not exist",
    httpApiStatus: 404
  }
) {}

export class InvalidRequest extends Schema.TaggedErrorClass<InvalidRequest>()(
  "InvalidRequest",
  {
    message: Schema.String
  },
  {
    identifier: "InvalidRequest",
    description: "The request is structurally valid but semantically invalid",
    httpApiStatus: 400
  }
) {}

export const ClientHttpError = Schema.Union([ResourceNotFound, InvalidRequest]);
export type ClientHttpError = typeof ClientHttpError.Type;
