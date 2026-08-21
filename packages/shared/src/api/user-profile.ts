import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { ServiceHttpErrors } from "../schemas/http-error.ts";
import { UpdateUserProfileInput, UserProfile } from "../schemas/user-profile.ts";

export class UserProfileApi extends HttpApiGroup.make("userProfile")
  .add(
    HttpApiEndpoint.get("getProfile", "/", {
      success: UserProfile,
      error: ServiceHttpErrors
    }),
    HttpApiEndpoint.post("saveProfile", "/", {
      payload: UpdateUserProfileInput,
      success: UserProfile,
      error: ServiceHttpErrors
    }),
    HttpApiEndpoint.delete("clearProfile", "/", {
      success: Schema.Struct({
        success: Schema.Boolean
      }),
      error: ServiceHttpErrors
    })
  )
  .prefix("/user-profile")
{}
