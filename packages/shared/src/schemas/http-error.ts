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

export class TutorUnavailable extends Schema.TaggedErrorClass<TutorUnavailable>()(
  "TutorUnavailable",
  {
    message: Schema.String
  },
  {
    identifier: "TutorUnavailable",
    description: "The tutor model is temporarily unavailable",
    httpApiStatus: 503
  }
) {}

export class ServiceFailure extends Schema.TaggedErrorClass<ServiceFailure>()(
  "ServiceFailure",
  {
    message: Schema.String
  },
  {
    identifier: "ServiceFailure",
    description: "An unexpected infrastructure failure occurred",
    httpApiStatus: 500
  }
) {}

export const ResourceHttpErrors = [ResourceNotFound, InvalidRequest, ServiceFailure] as const;
export const ServiceHttpErrors = [ServiceFailure] as const;
export const TutorHttpErrors = [InvalidRequest, TutorUnavailable, ServiceFailure] as const;

export const ClientHttpError = Schema.Union([
  ResourceNotFound,
  InvalidRequest,
  TutorUnavailable,
  ServiceFailure
]);
export type ClientHttpError = typeof ClientHttpError.Type;
