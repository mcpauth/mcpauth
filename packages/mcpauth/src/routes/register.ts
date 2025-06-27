import type {
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  OAuthUser,
} from "../core/types";
import type {
  FrameworkConfig,
  HttpRequest,
  HttpResponse,
} from "../core/framework-types";
import { applyCorsToResponse } from "../lib/cors";
import { isValidScopeString } from "../lib/scope-verification";

export async function handleRegisterClient(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<HttpResponse> {
  if (!config.adapter.registerClient) {
    return {
      status: 501,
      body: {
        error: "not_implemented",
        error_description:
          "Client registration is not configured for this server.",
      },
    };
  }

  const requestBody: Partial<ClientRegistrationRequestParams> =
    request.body || {};

  if (requestBody.scope && !isValidScopeString(requestBody.scope)) {
    return {
      status: 400,
      body: {
        error: "invalid_scope",
        error_description:
          "The provided scope is invalid, unknown, or malformed.",
      },
    };
  }

  // Basic validation for required fields
  if (
    !requestBody.redirect_uris ||
    !Array.isArray(requestBody.redirect_uris) ||
    requestBody.redirect_uris.length === 0
  ) {
    return {
      status: 400,
      body: {
        error: "invalid_redirect_uri",
        error_description:
          "redirect_uris is required and must be a non-empty array of strings.",
      },
    };
  }
  if (requestBody.client_name && typeof requestBody.client_name !== "string") {
    return {
      status: 400,
      body: {
        error: "invalid_client_metadata",
        error_description: "client_name must be a string.",
      },
    };
  }

  try {
    // The adapter is responsible for authenticating the user if required for registration
    const actingUser: OAuthUser | null = null;

    const registrationResponse: ClientRegistrationResponseData =
      await config.adapter.registerClient(
        requestBody as ClientRegistrationRequestParams,
        actingUser
      );

    const result = {
      status: 201,
      body: registrationResponse,
    };

    return applyCorsToResponse(request, result, ["POST"]);
  } catch (error: any) {
    console.error(
      "[handleRegisterClient] Error during client registration:",
      error
    );
    const statusCode = error.status || error.code || 500;
    const errorResponse = {
      error: error.error || error.name || "server_error",
      error_description:
        error.error_description ||
        error.message ||
        "An unexpected error occurred while registering the client.",
    };
    return {
      status: statusCode,
      body: errorResponse,
    };
  }
}
